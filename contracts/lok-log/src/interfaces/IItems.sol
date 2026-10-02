// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// ERC-1155 of exported (tradable) items. CharacterCheckpoint holds the MINTER role (mint + burn-from-holder).
/// Unique items should use id = uint256(keccak256(instanceId)) with supply 1 so provenance travels with the token.
interface IItems {
    function mint(address to, uint256 id, uint256 amount) external;
    function burn(address from, uint256 id, uint256 amount) external;
    function balanceOf(address account, uint256 id) external view returns (uint256);
}
