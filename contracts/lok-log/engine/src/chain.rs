//! Hash-chained log and the replay that stops at the first bad link.

use crate::engine::{Engine, EngineError};
use crate::event::{entry_hash, Input};
use crate::u256::{parse_b256, U256};

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Entry {
    pub index: u64,
    pub prev_hash: [u8; 32],
    pub hash: [u8; 32],
    pub input: Input,
}

#[derive(Clone, Debug)]
pub struct Chain {
    head: [u8; 32],
    entries: Vec<Entry>,
}

impl Chain {
    pub fn new(genesis: [u8; 32]) -> Self {
        Self {
            head: genesis,
            entries: Vec::new(),
        }
    }

    pub fn head(&self) -> [u8; 32] {
        self.head
    }

    pub fn len(&self) -> u64 {
        self.entries.len() as u64
    }

    pub fn push(&mut self, input: Input, hash: [u8; 32]) {
        let index = self.len();
        let prev_hash = self.head;
        self.entries.push(Entry {
            index,
            prev_hash,
            hash,
            input,
        });
        self.head = hash;
    }
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct LogDocument {
    pub token_id: U256,
    pub starting_job: u8,
    pub entries: Vec<LoggedEntry>,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct LoggedEntry {
    pub hash: [u8; 32],
    pub input: Input,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct ReplayReport {
    pub entries: u64,
    pub head: [u8; 32],
    pub state_root: [u8; 32],
    pub summary: U256,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub enum ReplayStop {
    BadHash {
        index: u64,
        expected: [u8; 32],
        computed: [u8; 32],
    },
    Rejected {
        index: u64,
        reason: EngineError,
    },
}

/// Replay `doc` from the genesis anchor. On a hash mismatch, return immediately:
/// that event is not applied, and later events are not inspected.
pub fn replay(doc: &LogDocument) -> Result<ReplayReport, ReplayStop> {
    let mut engine = Engine::open(doc.token_id, doc.starting_job);
    for (i, entry) in doc.entries.iter().enumerate() {
        let index = i as u64;
        let computed = entry_hash(&engine.head(), index, &entry.input);
        if computed != entry.hash {
            return Err(ReplayStop::BadHash {
                index,
                expected: entry.hash,
                computed,
            });
        }
        engine
            .apply(entry.input.clone())
            .map_err(|reason| ReplayStop::Rejected { index, reason })?;
    }
    Ok(ReplayReport {
        entries: engine.len(),
        head: engine.head(),
        state_root: engine.state().root(),
        summary: engine.state().summary(),
    })
}

pub fn parse_log(text: &str) -> Result<LogDocument, String> {
    let value: serde_json::Value = serde_json::from_str(text).map_err(|e| e.to_string())?;
    let token_id = value
        .get("tokenId")
        .ok_or_else(|| "missing tokenId".to_string())
        .and_then(parse_u256_json)?;
    let starting_job = value
        .get("startingJob")
        .and_then(|v| v.as_u64())
        .ok_or_else(|| "missing startingJob".to_string())?;
    if starting_job > u64::from(u8::MAX) {
        return Err("startingJob out of range".to_string());
    }
    let arr = value
        .get("entries")
        .and_then(|v| v.as_array())
        .ok_or_else(|| "missing entries".to_string())?;
    let mut entries = Vec::with_capacity(arr.len());
    for (i, ent) in arr.iter().enumerate() {
        let hash_str = ent
            .get("hash")
            .and_then(|v| v.as_str())
            .ok_or_else(|| format!("entry {i} missing hash"))?;
        let hash = parse_b256(hash_str).map_err(|_| format!("entry {i} bad hash"))?;
        let input_v = ent
            .get("input")
            .ok_or_else(|| format!("entry {i} missing input"))?;
        let input = parse_input(input_v).map_err(|e| format!("entry {i}: {e}"))?;
        entries.push(LoggedEntry { hash, input });
    }
    Ok(LogDocument {
        token_id,
        starting_job: starting_job as u8,
        entries,
    })
}

fn parse_input(value: &serde_json::Value) -> Result<Input, String> {
    let kind = value
        .get("type")
        .and_then(|v| v.as_str())
        .ok_or_else(|| "input missing type".to_string())?;
    match kind {
        "spawn" => {
            let token_id = value
                .get("tokenId")
                .ok_or_else(|| "spawn missing tokenId".to_string())
                .and_then(parse_u256_json)?;
            let starting_job = value
                .get("startingJob")
                .and_then(|v| v.as_u64())
                .ok_or_else(|| "spawn missing startingJob".to_string())?;
            if starting_job > u64::from(u8::MAX) {
                return Err("spawn startingJob out of range".to_string());
            }
            Ok(Input::Spawn {
                token_id,
                starting_job: starting_job as u8,
            })
        }
        other => Err(format!("unknown input type {other}")),
    }
}

fn parse_u256_json(value: &serde_json::Value) -> Result<U256, String> {
    if let Some(s) = value.as_str() {
        if let Some(hexbody) = s.strip_prefix("0x").or_else(|| s.strip_prefix("0X")) {
            if hexbody.is_empty() || hexbody.len() > 64 || !hexbody.bytes().all(|b| b.is_ascii_hexdigit()) {
                return Err("bad hex uint256".to_string());
            }
            let padded = format!("{:0>64}", hexbody);
            let word = parse_b256(&padded).map_err(|_| "bad hex uint256".to_string())?;
            return Ok(U256(word));
        }
        return U256::parse_dec(s).map_err(|_| "bad decimal uint256".to_string());
    }
    if let Some(n) = value.as_u64() {
        return Ok(U256::from_u64(n));
    }
    Err("token id must be a string or a small number".to_string())
}
