// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {Deploy} from "../script/Deploy.s.sol";
import {MockKEK, MockItems} from "./mocks/Mocks.sol";

contract DeployTest is Test {
    function test_deployScript_wiresAndHandsOver() public {
        address multisig = makeAddr("multisig");
        address proposer = makeAddr("proposer");
        MockItems items = new MockItems();
        Deploy s = new Deploy();
        Deploy.Config memory c = Deploy.Config({
            multisig: multisig,
            rotator: makeAddr("rotator"),
            guardian: makeAddr("guardian"),
            proposer: proposer,
            items: address(items),
            kek: address(new MockKEK()),
            baseURI: "ipfs://x/",
            mintFee: 0.001 ether
        });
        // the script contract executes the calls, so it is the temporary admin
        Deploy.Deployed memory d = s.deploy(c, address(s));

        bytes32 admin = d.checkpoint.DEFAULT_ADMIN_ROLE();
        // admin handed over everywhere, deployer fully renounced
        assertTrue(d.checkpoint.hasRole(admin, multisig));
        assertTrue(d.nft.hasRole(admin, multisig));
        assertTrue(d.factory.hasRole(admin, multisig));
        assertTrue(d.rulesets.hasRole(admin, multisig));
        assertTrue(d.vault.hasRole(admin, multisig));
        assertFalse(d.checkpoint.hasRole(admin, address(s)));
        assertFalse(d.nft.hasRole(admin, address(s)));
        assertFalse(d.factory.hasRole(admin, address(s)));
        assertFalse(d.rulesets.hasRole(admin, address(s)));
        assertFalse(d.vault.hasRole(admin, address(s)));

        // wiring
        assertTrue(d.nft.hasRole(d.nft.MINTER_ROLE(), address(d.factory)));
        assertTrue(d.checkpoint.hasRole(d.checkpoint.FACTORY_ROLE(), address(d.factory)));
        assertTrue(d.checkpoint.hasRole(d.checkpoint.NFT_ROLE(), address(d.nft)));
        assertTrue(d.vault.hasRole(d.vault.BRIDGE_ROLE(), address(d.checkpoint)));
        assertEq(address(d.checkpoint.rulesets()), address(d.rulesets));
        assertEq(address(d.checkpoint.items()), address(items));
        assertEq(address(d.checkpoint.vault()), address(d.vault));
        assertTrue(d.rulesets.hasRole(d.rulesets.PROPOSER_ROLE(), proposer));
        assertTrue(d.rulesets.hasRole(d.rulesets.EMERGENCY_ROLE(), multisig));
        assertEq(d.rulesets.minDelay(), 48 hours);
        assertEq(d.vault.withdrawDelay(), 24 hours);
        assertEq(d.factory.mintFee(), 0.001 ether);

        // the checkpoint contract still has to be made a minter of the items contract by the items admin
        assertFalse(items.minters(address(d.checkpoint)));

        // multisig finishes setup, a player can then create a character end to end
        vm.prank(multisig);
        d.factory.setStartingJob(1, true);
        address p = makeAddr("p");
        vm.deal(p, 1 ether);
        vm.prank(p);
        uint256 id = d.factory.createCharacter{value: 0.001 ether}(1);
        assertEq(d.nft.ownerOf(id), p);
        assertEq(d.checkpoint.level(id), 1);
    }
}
