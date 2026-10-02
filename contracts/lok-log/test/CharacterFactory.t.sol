// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Base} from "./Base.sol";
import {CharacterFactory} from "../src/CharacterFactory.sol";
import {CharacterNFT} from "../src/CharacterNFT.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

contract CharacterFactoryTest is Base {
    function test_create_seedsSheetAndMints() public view {
        assertEq(nft.ownerOf(tokenId), player);
        assertEq(cp.level(tokenId), 1);
        assertEq(address(factory).balance, 0.001 ether);
    }

    function test_create_exactFeeOnly() public {
        vm.startPrank(player);
        vm.expectRevert(CharacterFactory.WrongFee.selector);
        factory.createCharacter{value: 0}(1);
        vm.expectRevert(CharacterFactory.WrongFee.selector);
        factory.createCharacter{value: 0.002 ether}(1);
        vm.expectRevert(CharacterFactory.WrongFee.selector);
        factory.createCharacter{value: 0.0009 ether}(1);
        vm.stopPrank();
    }

    function test_create_rejectsBadJob() public {
        vm.prank(player);
        vm.expectRevert(CharacterFactory.BadJob.selector);
        factory.createCharacter{value: 0.001 ether}(9);
    }

    function test_create_incrementingIds() public {
        vm.prank(player);
        uint256 second = factory.createCharacter{value: 0.001 ether}(1);
        assertEq(second, tokenId + 1);
    }

    function test_onlyFactoryCanMint() public {
        vm.prank(player);
        vm.expectRevert();
        nft.mint(player);
    }

    function test_mint_requiresStateSet() public {
        CharacterNFT bare = CharacterNFT(
            address(
                new ERC1967Proxy(
                    address(new CharacterNFT()), abi.encodeCall(CharacterNFT.initialize, (admin, "C", "C", ""))
                )
            )
        );
        vm.startPrank(admin);
        bare.grantRole(bare.MINTER_ROLE(), admin);
        vm.expectRevert(CharacterNFT.StateNotSet.selector);
        bare.mint(admin);
        vm.stopPrank();
    }

    function test_feeAdmin() public {
        vm.prank(admin);
        factory.setMintFee(0.01 ether);
        vm.prank(player);
        vm.expectRevert(CharacterFactory.WrongFee.selector);
        factory.createCharacter{value: 0.001 ether}(1);
        vm.prank(player);
        factory.createCharacter{value: 0.01 ether}(1);

        vm.prank(other);
        vm.expectRevert();
        factory.setMintFee(0);
    }

    function test_withdraw() public {
        address payable to = payable(makeAddr("treasury"));
        vm.prank(other);
        vm.expectRevert();
        factory.withdraw(to);

        vm.prank(admin);
        factory.withdraw(to);
        assertEq(to.balance, 0.001 ether);
        assertEq(address(factory).balance, 0);
    }

    function test_tokenURI() public view {
        assertEq(nft.tokenURI(tokenId), string.concat("ipfs://x/", vm.toString(tokenId)));
    }
}
