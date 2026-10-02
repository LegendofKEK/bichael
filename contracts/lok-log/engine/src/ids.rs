//! Genesis anchor and ERC-1155 ids. Byte layout matches `ItemIds.sol` and `CharacterCheckpoint`.

use crate::abi::{keccak256, Buf};
use crate::u256::U256;

pub fn genesis_tag() -> [u8; 32] {
    keccak256(b"LOK_GENESIS_V1")
}

pub fn spawn_tag() -> [u8; 32] {
    keccak256(b"LOK_SPAWN_V1")
}

/// `keccak256(abi.encode(GENESIS_TAG, tokenId, startingJob))`.
pub fn genesis_root(token_id: &U256, starting_job: u8) -> [u8; 32] {
    let mut buf = Buf::new();
    buf.b256(&genesis_tag());
    buf.u256(token_id);
    buf.u8(starting_job);
    keccak256(&buf.bytes)
}

/// `keccak256(0x00 || type_id)` as a uint256.
pub fn fungible_id(type_id: &str) -> U256 {
    let mut raw = Vec::with_capacity(1 + type_id.len());
    raw.push(0x00);
    raw.extend_from_slice(type_id.as_bytes());
    U256(keccak256(&raw))
}

/// `keccak256(0x01 || type_id || instance_id as big-endian u64)` as a uint256.
pub fn unique_id(type_id: &str, instance_id: u64) -> U256 {
    let mut raw = Vec::with_capacity(1 + type_id.len() + 8);
    raw.push(0x01);
    raw.extend_from_slice(type_id.as_bytes());
    raw.extend_from_slice(&instance_id.to_be_bytes());
    U256(keccak256(&raw))
}
