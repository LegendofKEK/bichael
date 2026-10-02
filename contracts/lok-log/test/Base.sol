// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import {CharacterNFT} from "../src/CharacterNFT.sol";
import {CharacterCheckpoint} from "../src/CharacterCheckpoint.sol";
import {CharacterFactory} from "../src/CharacterFactory.sol";
import {RulesetRegistry} from "../src/RulesetRegistry.sol";
import {KekVault} from "../src/KekVault.sol";
import {MockKEK, MockItems} from "./mocks/Mocks.sol";

abstract contract Base is Test {
    bytes32 constant CHECKPOINT_TYPEHASH =
        keccak256("Checkpoint(uint256 tokenId,address player,uint32 version,uint256 deadline,bytes32 bodyHash)");
    bytes32 constant DOMAIN_TYPEHASH =
        keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)");
    bytes32 constant RULESET = keccak256("ruleset-v1");

    address admin = makeAddr("admin");
    address rotator = makeAddr("rotator");
    address guardian = makeAddr("guardian");
    address proposer = makeAddr("proposer");
    address player = makeAddr("player");
    address other = makeAddr("other");
    address signer;
    uint256 signerPk;

    CharacterNFT nft;
    CharacterCheckpoint cp;
    CharacterFactory factory;
    RulesetRegistry rulesets;
    KekVault vault;
    MockKEK kek;
    MockItems items;

    uint256 tokenId;
    uint256 constant ITEM_SWORD = 111;
    uint256 constant ITEM_ORE = 222;
    uint64 constant WITHDRAW_DELAY = 24 hours;

    function _proxy(address impl, bytes memory init) internal returns (address) {
        return address(new ERC1967Proxy(impl, init));
    }

    function setUp() public virtual {
        vm.warp(1_700_000_000);
        (signer, signerPk) = makeAddrAndKey("signer");

        nft = CharacterNFT(
            _proxy(address(new CharacterNFT()), abi.encodeCall(CharacterNFT.initialize, (admin, "Character", "CHAR", "ipfs://x/")))
        );
        cp = CharacterCheckpoint(
            _proxy(
                address(new CharacterCheckpoint()),
                abi.encodeCall(CharacterCheckpoint.initialize, (admin, address(nft), rotator, guardian))
            )
        );
        factory = CharacterFactory(
            _proxy(
                address(new CharacterFactory()),
                abi.encodeCall(CharacterFactory.initialize, (admin, address(nft), address(cp), 0.001 ether))
            )
        );
        rulesets = RulesetRegistry(
            _proxy(address(new RulesetRegistry()), abi.encodeCall(RulesetRegistry.initialize, (admin, 48 hours)))
        );
        kek = new MockKEK();
        items = new MockItems();
        vault = KekVault(
            _proxy(
                address(new KekVault()),
                abi.encodeCall(KekVault.initialize, (admin, address(kek), guardian, WITHDRAW_DELAY))
            )
        );

        vm.startPrank(admin);
        nft.setState(address(cp));
        nft.grantRole(nft.MINTER_ROLE(), address(factory));
        cp.grantRole(cp.FACTORY_ROLE(), address(factory));
        cp.grantRole(cp.NFT_ROLE(), address(nft));
        cp.setRulesets(address(rulesets));
        cp.setItems(address(items));
        cp.setVault(address(vault));
        vault.grantRole(vault.BRIDGE_ROLE(), address(cp));
        rulesets.grantRole(rulesets.PROPOSER_ROLE(), proposer);
        factory.setStartingJob(1, true);
        vm.stopPrank();
        items.setMinter(address(cp), true);

        // ruleset v1 proposed with the normal notice period, then activated
        vm.prank(proposer);
        rulesets.propose(RULESET, 48 hours, "ipfs://ruleset-v1");
        vm.warp(block.timestamp + 48 hours + 1);

        vm.prank(rotator);
        cp.addSigner(signer, uint64(block.timestamp + 6 hours));

        vm.deal(player, 10 ether);
        vm.prank(player);
        tokenId = factory.createCharacter{value: 0.001 ether}(1);
    }

    // ---------------------------------------------------------------- helpers
    function _domainSeparator() internal view returns (bytes32) {
        return keccak256(
            abi.encode(DOMAIN_TYPEHASH, keccak256("CharacterCheckpoint"), keccak256("1"), block.chainid, address(cp))
        );
    }

    function _typed(bytes32 structHash) internal view returns (bytes32) {
        return keccak256(abi.encodePacked("\x19\x01", _domainSeparator(), structHash));
    }

    function _noExports() internal pure returns (CharacterCheckpoint.Export[] memory) {
        return new CharacterCheckpoint.Export[](0);
    }

    function _export(uint256 itemId, uint32 amount) internal pure returns (CharacterCheckpoint.Export[] memory e) {
        e = new CharacterCheckpoint.Export[](1);
        e[0] = CharacterCheckpoint.Export(itemId, amount);
    }

    /// The next valid checkpoint for `id`: extends the current root and log position by 10 entries.
    function _next(uint256 id) internal view returns (CharacterCheckpoint.Checkpoint memory c) {
        bytes32 prev = cp.stateRoot(id);
        uint64 from = cp.logIndex(id);
        c.prevRoot = prev;
        c.newRoot = keccak256(abi.encode("root", prev, from));
        c.fromIndex = from;
        c.toIndex = from + 10;
        c.logHash = keccak256(abi.encode("log", id, from));
        c.rulesetHash = RULESET;
        c.summary = uint256(5) | (uint256(1) << 16) | (uint256(7) << 96); // level 5, job 1, location 7
        c.inboundConsumed = cp.inboundApplied(id);
        c.kekOut = 0;
        c.exports = _noExports();
    }

    function _next() internal view returns (CharacterCheckpoint.Checkpoint memory) {
        return _next(tokenId);
    }

    function _auth(
        uint256 pk,
        address who,
        uint256 id,
        CharacterCheckpoint.Checkpoint memory c,
        uint32 v,
        uint256 deadline
    ) internal view returns (CharacterCheckpoint.Auth memory a) {
        bytes32 digest = _typed(
            keccak256(abi.encode(CHECKPOINT_TYPEHASH, id, who, v, deadline, keccak256(abi.encode(c))))
        );
        (uint8 vv, bytes32 r, bytes32 ss) = vm.sign(pk, digest);
        a = CharacterCheckpoint.Auth(v, deadline, abi.encodePacked(r, ss, vv));
    }

    /// Signed by the live signer for `player` at the current version, valid for 120s.
    function _auth(CharacterCheckpoint.Checkpoint memory c) internal view returns (CharacterCheckpoint.Auth memory) {
        return _auth(signerPk, player, tokenId, c, cp.version(tokenId), block.timestamp + 120);
    }

    function _submit(CharacterCheckpoint.Checkpoint memory c) internal {
        CharacterCheckpoint.Auth memory a = _auth(c);
        vm.prank(player);
        cp.checkpoint(tokenId, c, a);
    }

    function _submitNext() internal returns (CharacterCheckpoint.Checkpoint memory c) {
        c = _next();
        _submit(c);
    }
}
