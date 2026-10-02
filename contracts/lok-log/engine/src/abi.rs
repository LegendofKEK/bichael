//! Solidity ABI fragments the contracts actually hash.
//!
//! Static values are 32-byte big-endian words. A dynamic tail is referenced by a
//! byte offset from the start of the tuple. `encodePacked` is raw concatenation
//! and is done at the call site (item ids).

use tiny_keccak::{Hasher, Keccak};

use crate::u256::U256;

pub fn keccak256(data: &[u8]) -> [u8; 32] {
    let mut hasher = Keccak::v256();
    hasher.update(data);
    let mut out = [0u8; 32];
    hasher.finalize(&mut out);
    out
}

pub struct Buf {
    pub bytes: Vec<u8>,
}

impl Buf {
    pub fn new() -> Self {
        Self { bytes: Vec::new() }
    }

    fn word(&mut self, raw: &[u8]) {
        assert!(raw.len() <= 32, "abi word overflow");
        self.bytes.extend(std::iter::repeat(0u8).take(32 - raw.len()));
        self.bytes.extend_from_slice(raw);
    }

    pub fn u8(&mut self, v: u8) {
        self.word(&[v]);
    }

    pub fn u32(&mut self, v: u32) {
        self.word(&v.to_be_bytes());
    }

    pub fn u64(&mut self, v: u64) {
        self.word(&v.to_be_bytes());
    }

    pub fn u256(&mut self, v: &U256) {
        self.bytes.extend_from_slice(&v.0);
    }

    pub fn b256(&mut self, v: &[u8; 32]) {
        self.bytes.extend_from_slice(v);
    }

    pub fn address(&mut self, v: &[u8; 20]) {
        self.word(v);
    }
}
