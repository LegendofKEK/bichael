//! Apply inputs to a character that already has a genesis anchor.

use std::fmt;

use crate::chain::Chain;
use crate::event::{entry_hash, Input, Outcome};
use crate::ids::genesis_root;
use crate::state::State;
use crate::u256::U256;

#[derive(Clone, Debug, PartialEq, Eq)]
pub enum EngineError {
    AlreadySpawned,
    /// Spawn named a different token or job than the genesis anchor.
    SpawnMismatch,
    NotSpawned,
    SelfTransfer,
    ZeroAmount,
    InsufficientKek,
    InsufficientItem,
    Overflow,
    ListingExists,
    AlreadyListed,
    UnknownListing,
    BidNotHigher,
    NotSeller,
    NoBid,
    /// Transfers and the auction house belong on the world log, not a single-character log.
    NotOnCharacterLog,
}

impl fmt::Display for EngineError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::AlreadySpawned => write!(f, "already spawned"),
            Self::SpawnMismatch => write!(f, "spawn does not match genesis identity"),
            Self::NotSpawned => write!(f, "character is not spawned"),
            Self::SelfTransfer => write!(f, "cannot send to self"),
            Self::ZeroAmount => write!(f, "amount must be greater than zero"),
            Self::InsufficientKek => write!(f, "insufficient KEK"),
            Self::InsufficientItem => write!(f, "insufficient item"),
            Self::Overflow => write!(f, "balance overflow"),
            Self::ListingExists => write!(f, "listing id already exists"),
            Self::AlreadyListed => write!(f, "item is already listed"),
            Self::UnknownListing => write!(f, "unknown listing"),
            Self::BidNotHigher => write!(f, "bid is not strictly higher"),
            Self::NotSeller => write!(f, "only the seller can cancel"),
            Self::NoBid => write!(f, "listing has no bid"),
            Self::NotOnCharacterLog => write!(f, "event is not valid on a single-character log"),
        }
    }
}

pub struct Engine {
    token_id: U256,
    starting_job: u8,
    state: State,
    chain: Chain,
}

impl Engine {
    /// Pre-Spawn engine. The log head is the genesis root; the map is empty.
    pub fn open(token_id: U256, starting_job: u8) -> Self {
        let anchor = genesis_root(&token_id, starting_job);
        Self {
            token_id,
            starting_job,
            state: State::new(),
            chain: Chain::new(anchor),
        }
    }

    pub fn genesis(&self) -> [u8; 32] {
        genesis_root(&self.token_id, self.starting_job)
    }

    pub fn head(&self) -> [u8; 32] {
        self.chain.head()
    }

    pub fn state(&self) -> &State {
        &self.state
    }

    pub fn len(&self) -> u64 {
        self.chain.len()
    }

    pub fn apply(&mut self, input: Input) -> Result<Outcome, EngineError> {
        match &input {
            Input::Spawn { token_id, starting_job } => {
                if token_id != &self.token_id || *starting_job != self.starting_job {
                    return Err(EngineError::SpawnMismatch);
                }
                if !self.state.is_empty() {
                    return Err(EngineError::AlreadySpawned);
                }
                self.state.spawn(*token_id, *starting_job);
            }
            Input::DepositKek { .. }
            | Input::ImportItem { .. }
            | Input::ExportItem { .. }
            | Input::SendItem { .. }
            | Input::SendKek { .. }
            | Input::List { .. }
            | Input::Bid { .. }
            | Input::Cancel { .. }
            | Input::Settle { .. } => return Err(EngineError::NotOnCharacterLog),
        }
        let index = self.chain.len();
        let prev_hash = self.chain.head();
        let link = entry_hash(&prev_hash, index, &input);
        let state_root = self.state.root();
        let summary = self.state.summary();
        self.chain.push(input, link);
        Ok(Outcome::Applied {
            index,
            prev_hash,
            entry_hash: link,
            state_root,
            summary,
        })
    }
}
