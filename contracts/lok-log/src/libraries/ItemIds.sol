// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// Canonical ERC-1155 ids for exported items. The Rust engine must produce identical ids (see Golden.t.sol / verify.mjs).
///   unique:   keccak256(0x01 || type_id || instance_id as big-endian u64)  -> supply 1, tied to one off-chain instance
///   fungible: keccak256(0x00 || type_id)                                  -> shared id, aggregate supply
/// The leading tag byte is domain separation: without it a fungible type_id whose bytes happen to end in 8 bytes
/// could collide with a unique (type_id, instance_id) pair.
library ItemIds {
    bytes1 internal constant FUNGIBLE_TAG = 0x00;
    bytes1 internal constant UNIQUE_TAG = 0x01;

    function fungible(string memory typeId) internal pure returns (uint256) {
        return uint256(keccak256(abi.encodePacked(FUNGIBLE_TAG, typeId)));
    }

    function unique(string memory typeId, uint64 instanceId) internal pure returns (uint256) {
        return uint256(keccak256(abi.encodePacked(UNIQUE_TAG, typeId, instanceId)));
    }
}
