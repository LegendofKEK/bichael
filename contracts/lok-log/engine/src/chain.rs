//! Hash-chained log and the replay that stops at the first bad link.

use crate::engine::{Engine, EngineError};
use crate::event::{entry_hash, Input};
use crate::u256::{parse_b256, U256};
use crate::world::{CharacterSnapshot, World};

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

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct WorldDocument {
    pub entries: Vec<LoggedEntry>,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct WorldReplayReport {
    pub entries: u64,
    pub head: [u8; 32],
    pub characters: Vec<CharacterSnapshot>,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub enum AnyLog {
    Character(LogDocument),
    World(WorldDocument),
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

/// Replay a world log from LOK_WORLD_V1 into a live `World`.
/// A bad hash is not applied, and later events are not inspected.
pub fn load_world(doc: &WorldDocument) -> Result<World, ReplayStop> {
    let mut world = World::new();
    for (i, entry) in doc.entries.iter().enumerate() {
        let index = i as u64;
        let computed = entry_hash(&world.head(), index, &entry.input);
        if computed != entry.hash {
            return Err(ReplayStop::BadHash {
                index,
                expected: entry.hash,
                computed,
            });
        }
        world
            .apply(entry.input.clone())
            .map_err(|reason| ReplayStop::Rejected { index, reason })?;
    }
    Ok(world)
}

/// Replay a world log from LOK_WORLD_V1. A bad hash is not applied, and later events are not inspected.
pub fn replay_world(doc: &WorldDocument) -> Result<WorldReplayReport, ReplayStop> {
    let world = load_world(doc)?;
    Ok(WorldReplayReport {
        entries: world.len(),
        head: world.head(),
        characters: world.snapshots(),
    })
}

pub(crate) fn replay_stop_message(stop: &ReplayStop) -> String {
    match stop {
        ReplayStop::BadHash { index, expected, computed } => format!(
            "bad hash at {index}: log has 0x{} computed 0x{}",
            hex::encode(expected),
            hex::encode(computed)
        ),
        ReplayStop::Rejected { index, reason } => format!("rejected at {index}: {reason}"),
    }
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
    let entries = parse_entries(&value)?;
    Ok(LogDocument {
        token_id,
        starting_job: starting_job as u8,
        entries,
    })
}

pub fn parse_world_log(text: &str) -> Result<WorldDocument, String> {
    let value: serde_json::Value = serde_json::from_str(text).map_err(|e| e.to_string())?;
    if value.get("type").and_then(|v| v.as_str()) != Some("world") {
        return Err("not a world log".to_string());
    }
    Ok(WorldDocument { entries: parse_entries(&value)? })
}

pub fn parse_any_log(text: &str) -> Result<AnyLog, String> {
    let value: serde_json::Value = serde_json::from_str(text).map_err(|e| e.to_string())?;
    if value.get("type").and_then(|v| v.as_str()) == Some("world") {
        Ok(AnyLog::World(parse_world_log(text)?))
    } else {
        Ok(AnyLog::Character(parse_log(text)?))
    }
}

fn parse_entries(value: &serde_json::Value) -> Result<Vec<LoggedEntry>, String> {
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
    Ok(entries)
}

fn req_u256(value: &serde_json::Value, key: &str) -> Result<U256, String> {
    value
        .get(key)
        .ok_or_else(|| format!("missing {key}"))
        .and_then(parse_u256_json)
}

pub(crate) fn parse_input(value: &serde_json::Value) -> Result<Input, String> {
    let kind = value
        .get("type")
        .and_then(|v| v.as_str())
        .ok_or_else(|| "input missing type".to_string())?;
    match kind {
        "spawn" => {
            let token_id = req_u256(value, "tokenId")?;
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
        "depositKek" => Ok(Input::DepositKek {
            token_id: req_u256(value, "tokenId")?,
            amount: req_u256(value, "amount")?,
        }),
        "importItem" => Ok(Input::ImportItem {
            token_id: req_u256(value, "tokenId")?,
            item_id: req_u256(value, "itemId")?,
            amount: req_u256(value, "amount")?,
        }),
        "exportItem" => Ok(Input::ExportItem {
            token_id: req_u256(value, "tokenId")?,
            item_id: req_u256(value, "itemId")?,
            amount: req_u256(value, "amount")?,
        }),
        "sendItem" => Ok(Input::SendItem {
            from: req_u256(value, "from")?,
            to: req_u256(value, "to")?,
            item_id: req_u256(value, "itemId")?,
            amount: req_u256(value, "amount")?,
        }),
        "sendKek" => Ok(Input::SendKek {
            from: req_u256(value, "from")?,
            to: req_u256(value, "to")?,
            amount: req_u256(value, "amount")?,
        }),
        "list" => Ok(Input::List {
            listing_id: req_u256(value, "listingId")?,
            seller: req_u256(value, "seller")?,
            item_id: req_u256(value, "itemId")?,
            amount: req_u256(value, "amount")?,
        }),
        "bid" => Ok(Input::Bid {
            listing_id: req_u256(value, "listingId")?,
            bidder: req_u256(value, "bidder")?,
            amount: req_u256(value, "amount")?,
        }),
        "cancel" => Ok(Input::Cancel {
            listing_id: req_u256(value, "listingId")?,
            seller: req_u256(value, "seller")?,
        }),
        "settle" => Ok(Input::Settle {
            listing_id: req_u256(value, "listingId")?,
        }),
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

pub(crate) fn input_to_json(input: &Input) -> serde_json::Value {
    let s = |v: &U256| serde_json::Value::String(v.to_dec());
    match input {
        Input::Spawn { token_id, starting_job } => serde_json::json!({
            "type": "spawn",
            "tokenId": token_id.to_dec(),
            "startingJob": starting_job,
        }),
        Input::DepositKek { token_id, amount } => serde_json::json!({
            "type": "depositKek",
            "tokenId": s(token_id),
            "amount": s(amount),
        }),
        Input::ImportItem { token_id, item_id, amount } => serde_json::json!({
            "type": "importItem",
            "tokenId": s(token_id),
            "itemId": s(item_id),
            "amount": s(amount),
        }),
        Input::ExportItem { token_id, item_id, amount } => serde_json::json!({
            "type": "exportItem",
            "tokenId": s(token_id),
            "itemId": s(item_id),
            "amount": s(amount),
        }),
        Input::SendItem { from, to, item_id, amount } => serde_json::json!({
            "type": "sendItem",
            "from": s(from),
            "to": s(to),
            "itemId": s(item_id),
            "amount": s(amount),
        }),
        Input::SendKek { from, to, amount } => serde_json::json!({
            "type": "sendKek",
            "from": s(from),
            "to": s(to),
            "amount": s(amount),
        }),
        Input::List { listing_id, seller, item_id, amount } => serde_json::json!({
            "type": "list",
            "listingId": s(listing_id),
            "seller": s(seller),
            "itemId": s(item_id),
            "amount": s(amount),
        }),
        Input::Bid { listing_id, bidder, amount } => serde_json::json!({
            "type": "bid",
            "listingId": s(listing_id),
            "bidder": s(bidder),
            "amount": s(amount),
        }),
        Input::Cancel { listing_id, seller } => serde_json::json!({
            "type": "cancel",
            "listingId": s(listing_id),
            "seller": s(seller),
        }),
        Input::Settle { listing_id } => serde_json::json!({
            "type": "settle",
            "listingId": s(listing_id),
        }),
    }
}
