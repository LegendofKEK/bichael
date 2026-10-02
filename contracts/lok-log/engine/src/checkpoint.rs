//! Checkpoint body hash and EIP-712 digest. Encoding matches `abi.encode(Checkpoint)`.

use crate::abi::{keccak256, Buf};
use crate::u256::U256;

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Export {
    pub item_id: U256,
    pub amount: u32,
}

/// Mirror of `CharacterCheckpoint.Checkpoint`. `exports` is the only dynamic field.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Checkpoint {
    pub prev_root: [u8; 32],
    pub new_root: [u8; 32],
    pub from_index: u64,
    pub to_index: u64,
    pub log_hash: [u8; 32],
    pub ruleset_hash: [u8; 32],
    pub summary: U256,
    pub inbound_consumed: u64,
    pub kek_out: U256,
    pub exports: Vec<Export>,
}

pub fn encode_checkpoint(c: &Checkpoint) -> Vec<u8> {
    // `abi.encode` of one dynamic argument (the struct contains an array) is a
    // one-tuple: a leading offset to the struct body, then the body. Offsets inside
    // the body are relative to the body, not the outer blob.
    let mut head = Buf::new();
    head.u256(&U256::from_u64(32));
    head.b256(&c.prev_root);
    head.b256(&c.new_root);
    head.u64(c.from_index);
    head.u64(c.to_index);
    head.b256(&c.log_hash);
    head.b256(&c.ruleset_hash);
    head.u256(&c.summary);
    head.u64(c.inbound_consumed);
    head.u256(&c.kek_out);
    let head_words = 10u64;
    head.u256(&U256::from_u64(head_words * 32));

    let mut tail = Buf::new();
    tail.u256(&U256::from_u64(c.exports.len() as u64));
    for export in &c.exports {
        // `Export` is a static tuple, so each element is inlined (not an offset).
        tail.u256(&export.item_id);
        tail.u32(export.amount);
    }
    head.bytes.extend(tail.bytes);
    head.bytes
}

pub fn checkpoint_body_hash(c: &Checkpoint) -> [u8; 32] {
    keccak256(&encode_checkpoint(c))
}

/// EIP-712 digest for `Checkpoint(tokenId, player, version, deadline, bodyHash)`.
/// Domain: name `CharacterCheckpoint`, version `1`.
pub fn eip712_digest(
    chain_id: &U256,
    verifying_contract: &[u8; 20],
    token_id: &U256,
    player: &[u8; 20],
    version: u32,
    deadline: &U256,
    body_hash: &[u8; 32],
) -> [u8; 32] {
    let domain_type = keccak256(
        b"EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)",
    );
    let mut domain = Buf::new();
    domain.b256(&domain_type);
    domain.b256(&keccak256(b"CharacterCheckpoint"));
    domain.b256(&keccak256(b"1"));
    domain.u256(chain_id);
    domain.address(verifying_contract);
    let domain_separator = keccak256(&domain.bytes);

    let typehash = keccak256(
        b"Checkpoint(uint256 tokenId,address player,uint32 version,uint256 deadline,bytes32 bodyHash)",
    );
    let mut encoded = Buf::new();
    encoded.b256(&typehash);
    encoded.u256(token_id);
    encoded.address(player);
    encoded.u32(version);
    encoded.u256(deadline);
    encoded.b256(body_hash);
    let struct_hash = keccak256(&encoded.bytes);

    let mut preimage = Vec::with_capacity(66);
    preimage.push(0x19);
    preimage.push(0x01);
    preimage.extend_from_slice(&domain_separator);
    preimage.extend_from_slice(&struct_hash);
    keccak256(&preimage)
}
