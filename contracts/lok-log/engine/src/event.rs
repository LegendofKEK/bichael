//! Inputs applied to state, and the outcome of a successful apply.

use crate::abi::{keccak256, Buf};
use crate::ids::spawn_tag;
use crate::u256::U256;

#[derive(Clone, Debug, PartialEq, Eq)]
pub enum Input {
    /// First log event. Must name the same token and job the genesis anchor was built from.
    Spawn { token_id: U256, starting_job: u8 },
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub enum Outcome {
    Applied {
        index: u64,
        prev_hash: [u8; 32],
        entry_hash: [u8; 32],
        state_root: [u8; 32],
        summary: U256,
    },
}

/// Domain-separated id of an input: `keccak256(abi.encode(tag, ...fields))`.
pub fn event_id(input: &Input) -> [u8; 32] {
    match input {
        Input::Spawn { token_id, starting_job } => {
            let mut buf = Buf::new();
            buf.b256(&spawn_tag());
            buf.u256(token_id);
            buf.u8(*starting_job);
            keccak256(&buf.bytes)
        }
    }
}

/// `keccak256(abi.encode(prev, index, eventId))`. Static, so the link does not depend on state bytes.
pub fn entry_hash(prev: &[u8; 32], index: u64, input: &Input) -> [u8; 32] {
    let mut buf = Buf::new();
    buf.b256(prev);
    buf.u64(index);
    buf.b256(&event_id(input));
    keccak256(&buf.bytes)
}
