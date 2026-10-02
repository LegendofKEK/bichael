// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface ICharacterNFT {
    function ownerOf(uint256 id) external view returns (address);
}

interface ICharacterMint {
    function mint(address to) external returns (uint256 tokenId);
}

interface ICharacterStateHook {
    function onTransfer(uint256 tokenId) external;
}
