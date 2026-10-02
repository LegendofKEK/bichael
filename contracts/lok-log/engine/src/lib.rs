//! Bellgrave lok engine, first slice.
//!
//! Proven against the golden vectors in `contracts/lok-log/test/Golden.t.sol` and
//! `test/golden/verify.mjs`. Gameplay rules, the vault, and the server are out of scope.
//! KEK is deposit-only and is not credited here.

mod abi;
mod chain;
mod checkpoint;
mod engine;
mod event;
mod ids;
mod state;
mod u256;

pub use chain::{parse_log, replay, LoggedEntry, LogDocument, ReplayReport, ReplayStop};
pub use checkpoint::{checkpoint_body_hash, eip712_digest, Checkpoint, Export};
pub use engine::{Engine, EngineError};
pub use event::{entry_hash, event_id, Input, Outcome};
pub use ids::{fungible_id, genesis_root, genesis_tag, spawn_tag, unique_id};
pub use state::{commit_entries, Key, State};
pub use u256::{parse_address, parse_b256, U256};

pub use abi::keccak256;
