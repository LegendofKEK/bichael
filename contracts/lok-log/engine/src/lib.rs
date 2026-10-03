//! Bellgrave lok engine.
//!
//! Proven against the golden vectors in `contracts/lok-log/test/Golden.t.sol` and
//! `test/golden/verify.mjs`. The game server calls this crate (wasm gate) for every item and KEK move.
//! KEK is deposit-only: the world log credits it only as a vault deposit, and
//! transfers cannot create it.

mod abi;
mod chain;
mod checkpoint;
mod engine;
mod event;
mod ids;
mod state;
mod u256;
mod gate;
mod world;

#[cfg(target_arch = "wasm32")]
mod wasm_api;

pub use chain::{
    parse_any_log, parse_log, parse_world_log, replay, replay_world, AnyLog, LoggedEntry,
    LogDocument, ReplayReport, ReplayStop, WorldDocument, WorldReplayReport,
};
pub use checkpoint::{checkpoint_body_hash, eip712_digest, Checkpoint, Export};
pub use engine::{Engine, EngineError};
pub use event::{entry_hash, event_id, Input, Outcome};
pub use ids::{fungible_id, genesis_root, genesis_tag, spawn_tag, unique_id, world_genesis};
pub use state::{commit_entries, Key, State};
pub use u256::{parse_address, parse_b256, U256};
pub use gate::Gate;
pub use world::{CharacterSnapshot, Listing, World};

pub use abi::keccak256;
