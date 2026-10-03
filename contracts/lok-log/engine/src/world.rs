//! Per-character hash chains for items, KEK, and the auction house.
//!
//! Each character's log starts at that character's genesis root and advances its own
//! index. A transfer or auction is one payload appended to every affected character's
//! log, so each side can checkpoint its own span. Rebasing one character drops only
//! that character's uncommitted tail; another character's committed copy of the trade
//! stays on their chain.
//!
//! KEK enters only through `DepositKek` and leaves only through `WithdrawKek`.
//! Nothing here mints KEK or submits an onchain withdrawal. There is no transfer tax
//! and no auction fee.

use std::collections::{BTreeMap, BTreeSet};

use crate::abi::keccak256;
use crate::chain::{Chain, CharacterLogDocument, LoggedEntry, ReplayStop, WorldDocument};
use crate::checkpoint::{Checkpoint, Export};
use crate::engine::EngineError;
use crate::event::{entry_hash, Input};
use crate::ids::{genesis_root, world_genesis};
use crate::state::{Key, State};
use crate::u256::U256;

#[derive(Clone, Debug)]
struct Character {
    starting_job: u8,
    state: State,
    chain: Chain,
    entries: Vec<LoggedEntry>,
    /// Onchain `logIndex`: events `[0, committed)` are committed. Rebase keeps this prefix.
    committed: u64,
}

/// An auction listing. The item amount is escrowed out of the seller's spendable
/// balance, and `high_bid` is escrowed out of the bidder's spendable KEK.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Listing {
    pub id: U256,
    pub seller: U256,
    pub item_id: U256,
    pub amount: U256,
    pub high_bidder: Option<U256>,
    pub high_bid: U256,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct CharacterSnapshot {
    pub token_id: U256,
    pub starting_job: u8,
    pub state_root: [u8; 32],
    pub summary: U256,
    /// Spendable KEK. Escrowed bids are not included.
    pub kek: U256,
    /// Spendable KEK plus this character's escrowed bids. This is the solvency counter.
    pub solvency_kek: U256,
}

/// One accepted command, linked onto each affected character's own chain.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct CharacterLink {
    pub token_id: U256,
    pub index: u64,
    pub prev_hash: [u8; 32],
    pub entry_hash: [u8; 32],
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct AppliedEvent {
    pub seq: u64,
    pub links: Vec<CharacterLink>,
}

#[derive(Clone, Debug)]
pub struct World {
    characters: BTreeMap<U256, Character>,
    listings: BTreeMap<U256, Listing>,
    next_seq: u64,
}

impl World {
    pub fn new() -> Self {
        Self {
            characters: BTreeMap::new(),
            listings: BTreeMap::new(),
            next_seq: 0,
        }
    }

    pub fn genesis(&self) -> [u8; 32] {
        world_genesis()
    }

    /// Commitment of every character head, in token order. Empty worlds use `LOK_WORLD_V1`.
    /// This is not a character's checkpoint hash.
    pub fn head(&self) -> [u8; 32] {
        if self.characters.is_empty() {
            return world_genesis();
        }
        let mut raw = Vec::new();
        for (token_id, ch) in &self.characters {
            raw.extend_from_slice(&token_id.0);
            raw.extend_from_slice(&ch.chain.head());
        }
        keccak256(&raw)
    }

    /// How many commands were accepted. A transfer counts once, even though two logs advance.
    pub fn len(&self) -> u64 {
        let mut seqs = BTreeSet::new();
        for ch in self.characters.values() {
            for entry in &ch.entries {
                seqs.insert(entry.seq);
            }
        }
        seqs.len() as u64
    }

    /// Spendable KEK. Bids in escrow are not included; they sit on the listing.
    pub fn kek_balance(&self, token_id: &U256) -> Option<U256> {
        self.characters.get(token_id).map(|c| c.state.get(&Key::Kek))
    }

    /// Spendable KEK plus escrowed bids. Vault solvency counts this, not spendable alone.
    pub fn solvency_kek(&self, token_id: &U256) -> Option<U256> {
        let spendable = self.kek_balance(token_id)?;
        Some(
            spendable
                .checked_add(escrowed_bids(&self.listings, token_id))
                .expect("solvency overflow"),
        )
    }

    /// Spendable items. A listed quantity is escrowed and is not returned here,
    /// so it cannot be transferred, exported, or listed again.
    pub fn item_balance(&self, token_id: &U256, item_id: &U256) -> Option<U256> {
        self.characters.get(token_id).map(|c| c.state.get(&Key::Item(*item_id)))
    }

    pub fn listing(&self, id: &U256) -> Option<&Listing> {
        self.listings.get(id)
    }

    pub fn listings(&self) -> impl Iterator<Item = &Listing> {
        self.listings.values()
    }

    /// Spendable item balances for one character. Listed stacks are not included.
    pub fn spendable_items(&self, token_id: &U256) -> Vec<(U256, U256)> {
        match self.character_state(token_id) {
            Some(state) => state.items(),
            None => Vec::new(),
        }
    }

    pub fn character_state(&self, token_id: &U256) -> Option<&State> {
        self.characters.get(token_id).map(|c| &c.state)
    }

    pub fn character_len(&self, token_id: &U256) -> Option<u64> {
        self.characters.get(token_id).map(|ch| ch.entries.len() as u64)
    }

    pub fn character_head(&self, token_id: &U256) -> Option<[u8; 32]> {
        self.characters.get(token_id).map(|ch| ch.chain.head())
    }

    pub fn character_entries(&self, token_id: &U256) -> Option<&[LoggedEntry]> {
        self.characters.get(token_id).map(|ch| ch.entries.as_slice())
    }

    pub fn committed_index(&self, token_id: &U256) -> Option<u64> {
        self.characters.get(token_id).map(|ch| ch.committed)
    }

    pub fn snapshots(&self) -> Vec<CharacterSnapshot> {
        self.characters
            .iter()
            .map(|(token_id, ch)| CharacterSnapshot {
                token_id: *token_id,
                starting_job: ch.starting_job,
                state_root: ch.state.root(),
                summary: ch.state.summary(),
                kek: ch.state.get(&Key::Kek),
                solvency_kek: ch
                    .state
                    .get(&Key::Kek)
                    .checked_add(escrowed_bids(&self.listings, token_id))
                    .expect("solvency overflow"),
            })
            .collect()
    }

    pub fn to_document(&self) -> WorldDocument {
        WorldDocument {
            characters: self
                .characters
                .iter()
                .map(|(token_id, ch)| CharacterLogDocument {
                    token_id: *token_id,
                    starting_job: ch.starting_job,
                    entries: ch.entries.clone(),
                })
                .collect(),
        }
    }

    pub fn append_spawn(&mut self, token_id: U256, starting_job: u8) -> Result<AppliedEvent, EngineError> {
        self.apply(Input::Spawn { token_id, starting_job })
    }

    pub fn append_deposit_kek(&mut self, token_id: U256, amount: U256) -> Result<AppliedEvent, EngineError> {
        self.apply(Input::DepositKek { token_id, amount })
    }

    pub fn append_withdraw_kek(&mut self, token_id: U256, amount: U256) -> Result<AppliedEvent, EngineError> {
        self.apply(Input::WithdrawKek { token_id, amount })
    }

    pub fn append_import_item(
        &mut self,
        token_id: U256,
        item_id: U256,
        amount: U256,
    ) -> Result<AppliedEvent, EngineError> {
        self.apply(Input::ImportItem { token_id, item_id, amount })
    }

    pub fn append_export_item(
        &mut self,
        token_id: U256,
        item_id: U256,
        amount: U256,
    ) -> Result<AppliedEvent, EngineError> {
        self.apply(Input::ExportItem { token_id, item_id, amount })
    }

    pub fn append_send_item(
        &mut self,
        from: U256,
        to: U256,
        item_id: U256,
        amount: U256,
    ) -> Result<AppliedEvent, EngineError> {
        self.apply(Input::SendItem { from, to, item_id, amount })
    }

    pub fn append_send_kek(&mut self, from: U256, to: U256, amount: U256) -> Result<AppliedEvent, EngineError> {
        self.apply(Input::SendKek { from, to, amount })
    }

    pub fn append_list(
        &mut self,
        listing_id: U256,
        seller: U256,
        item_id: U256,
        amount: U256,
    ) -> Result<AppliedEvent, EngineError> {
        self.apply(Input::List { listing_id, seller, item_id, amount })
    }

    pub fn append_bid(&mut self, listing_id: U256, bidder: U256, amount: U256) -> Result<AppliedEvent, EngineError> {
        self.apply(Input::Bid { listing_id, bidder, amount })
    }

    pub fn append_cancel(&mut self, listing_id: U256, seller: U256) -> Result<AppliedEvent, EngineError> {
        self.apply(Input::Cancel { listing_id, seller })
    }

    pub fn append_settle(&mut self, listing_id: U256) -> Result<AppliedEvent, EngineError> {
        self.apply(Input::Settle { listing_id })
    }

    /// Apply one command. On failure nothing is appended to any character log.
    pub fn apply(&mut self, input: Input) -> Result<AppliedEvent, EngineError> {
        let touch = self.affected(&input)?;
        let characters = self.characters.clone();
        let listings = self.listings.clone();
        if let Err(err) = self.effects(&input, &touch) {
            self.characters = characters;
            self.listings = listings;
            return Err(err);
        }
        let seq = self.next_seq;
        Ok(self.link_at(&input, &touch, seq))
    }

    /// Draft the checkpoint for `(committed, to_index]`. Does not mark it committed.
    pub fn checkpoint_span(&self, token_id: &U256, to_index: u64) -> Result<Checkpoint, EngineError> {
        let ch = self.characters.get(token_id).ok_or(EngineError::NotSpawned)?;
        let from_index = ch.committed;
        if to_index <= from_index || to_index > ch.entries.len() as u64 {
            return Err(EngineError::BadRange);
        }
        let prev_root = self.root_at(token_id, from_index)?;
        let (new_root, summary) = self.projection_at(token_id, to_index)?;
        let log_hash = ch.entries[to_index as usize - 1].hash;
        let mut kek_out = U256::ZERO;
        let mut exports = Vec::new();
        for entry in &ch.entries[from_index as usize..to_index as usize] {
            match &entry.input {
                Input::WithdrawKek { token_id: who, amount } if who == token_id => {
                    kek_out = kek_out.checked_add(*amount).ok_or(EngineError::Overflow)?;
                }
                Input::ExportItem { token_id: who, item_id, amount } if who == token_id => {
                    exports.push(Export {
                        item_id: *item_id,
                        amount: fit_u32(*amount)?,
                    });
                }
                _ => {}
            }
        }
        Ok(Checkpoint {
            prev_root,
            new_root,
            from_index,
            to_index,
            log_hash,
            ruleset_hash: [0u8; 32],
            summary,
            inbound_consumed: 0,
            kek_out,
            exports,
        })
    }

    /// Record that `[0, to_index)` of this character's log is committed on chain.
    pub fn commit_span(&mut self, token_id: U256, to_index: u64) -> Result<Checkpoint, EngineError> {
        let checkpoint = self.checkpoint_span(&token_id, to_index)?;
        self.characters.get_mut(&token_id).expect("checkpoint found the character").committed = to_index;
        Ok(checkpoint)
    }

    /// Drop this character's uncommitted tail and rebuild from the logs that remain.
    /// Another character's copy of a shared trade is left in place.
    pub fn rebase(&mut self, token_id: U256) -> Result<(), EngineError> {
        let keep = self.characters.get(&token_id).ok_or(EngineError::NotSpawned)?.committed;
        let committed: BTreeMap<U256, u64> = self.characters.iter().map(|(id, ch)| (*id, ch.committed)).collect();
        let mut doc = self.to_document();
        for character in &mut doc.characters {
            if character.token_id == token_id {
                if keep as usize > character.entries.len() {
                    return Err(EngineError::BadRange);
                }
                character.entries.truncate(keep as usize);
            }
        }
        let mut rebuilt = World::load(&doc).map_err(|_| EngineError::ConflictingLog)?;
        for (id, n) in committed {
            if let Some(ch) = rebuilt.characters.get_mut(&id) {
                ch.committed = n.min(ch.entries.len() as u64);
            }
        }
        *self = rebuilt;
        Ok(())
    }

    pub(crate) fn load(doc: &WorldDocument) -> Result<World, ReplayStop> {
        let mut world = World::new();
        let mut head: BTreeMap<U256, [u8; 32]> = BTreeMap::new();
        let mut next_index: BTreeMap<U256, u64> = BTreeMap::new();
        let mut seen = BTreeSet::new();
        for character in &doc.characters {
            if !seen.insert(character.token_id) {
                return Err(ReplayStop::Rejected {
                    index: 0,
                    reason: EngineError::ConflictingLog,
                });
            }
            head.insert(character.token_id, genesis_root(&character.token_id, character.starting_job));
            next_index.insert(character.token_id, 0);
            let mut last_seq: Option<u64> = None;
            for entry in &character.entries {
                if let Some(prev) = last_seq {
                    if entry.seq <= prev {
                        return Err(ReplayStop::Rejected {
                            index: entry.seq,
                            reason: EngineError::ConflictingLog,
                        });
                    }
                }
                last_seq = Some(entry.seq);
            }
        }

        let mut groups: BTreeMap<u64, (Input, BTreeMap<U256, [u8; 32]>)> = BTreeMap::new();
        for character in &doc.characters {
            for entry in &character.entries {
                match groups.get_mut(&entry.seq) {
                    Some((input, tokens)) => {
                        if input != &entry.input {
                            return Err(ReplayStop::Rejected {
                                index: entry.seq,
                                reason: EngineError::ConflictingLog,
                            });
                        }
                        if tokens.insert(character.token_id, entry.hash).is_some() {
                            return Err(ReplayStop::Rejected {
                                index: entry.seq,
                                reason: EngineError::ConflictingLog,
                            });
                        }
                    }
                    None => {
                        let mut tokens = BTreeMap::new();
                        tokens.insert(character.token_id, entry.hash);
                        groups.insert(entry.seq, (entry.input.clone(), tokens));
                    }
                }
            }
        }

        for (seq, (input, tokens)) in groups {
            let touch: BTreeSet<U256> = tokens.keys().copied().collect();
            for (token, hash) in &tokens {
                let prev = head[token];
                let index = next_index[token];
                let computed = entry_hash(&prev, index, &input);
                if computed != *hash {
                    return Err(ReplayStop::BadHash {
                        index,
                        expected: *hash,
                        computed,
                    });
                }
            }
            world.effects(&input, &touch).map_err(|reason| ReplayStop::Rejected { index: seq, reason })?;
            let event = world.link_at(&input, &touch, seq);
            for link in &event.links {
                let expected = tokens[&link.token_id];
                if link.entry_hash != expected {
                    return Err(ReplayStop::BadHash {
                        index: link.index,
                        expected,
                        computed: link.entry_hash,
                    });
                }
                head.insert(link.token_id, link.entry_hash);
                *next_index.get_mut(&link.token_id).expect("index") += 1;
            }
        }
        Ok(world)
    }

    fn affected(&self, input: &Input) -> Result<BTreeSet<U256>, EngineError> {
        let mut touch = BTreeSet::new();
        match input {
            Input::Spawn { token_id, .. } => {
                if self.characters.contains_key(token_id) {
                    return Err(EngineError::AlreadySpawned);
                }
                touch.insert(*token_id);
            }
            Input::DepositKek { token_id, amount }
            | Input::WithdrawKek { token_id, amount } => {
                if *amount == U256::ZERO {
                    return Err(EngineError::ZeroAmount);
                }
                if !self.characters.contains_key(token_id) {
                    return Err(EngineError::NotSpawned);
                }
                touch.insert(*token_id);
            }
            Input::ImportItem { token_id, amount, .. } | Input::ExportItem { token_id, amount, .. } => {
                if *amount == U256::ZERO {
                    return Err(EngineError::ZeroAmount);
                }
                if !self.characters.contains_key(token_id) {
                    return Err(EngineError::NotSpawned);
                }
                touch.insert(*token_id);
            }
            Input::SendKek { from, to, amount } | Input::SendItem { from, to, amount, .. } => {
                if from == to {
                    return Err(EngineError::SelfTransfer);
                }
                if *amount == U256::ZERO {
                    return Err(EngineError::ZeroAmount);
                }
                if !self.characters.contains_key(from) || !self.characters.contains_key(to) {
                    return Err(EngineError::NotSpawned);
                }
                touch.insert(*from);
                touch.insert(*to);
            }
            Input::List { listing_id, seller, item_id, amount } => {
                if *amount == U256::ZERO {
                    return Err(EngineError::ZeroAmount);
                }
                if !self.characters.contains_key(seller) {
                    return Err(EngineError::NotSpawned);
                }
                if self.listings.contains_key(listing_id) {
                    return Err(EngineError::ListingExists);
                }
                if self.listings.values().any(|l| l.seller == *seller && l.item_id == *item_id) {
                    return Err(EngineError::AlreadyListed);
                }
                touch.insert(*seller);
            }
            Input::Bid { listing_id, bidder, amount } => {
                if *amount == U256::ZERO {
                    return Err(EngineError::ZeroAmount);
                }
                let listing = self.listings.get(listing_id).ok_or(EngineError::UnknownListing)?;
                if *amount <= listing.high_bid {
                    return Err(EngineError::BidNotHigher);
                }
                if !self.characters.contains_key(bidder) {
                    return Err(EngineError::NotSpawned);
                }
                touch.insert(*bidder);
                if let Some(prev) = listing.high_bidder {
                    touch.insert(prev);
                }
            }
            Input::Cancel { listing_id, seller } => {
                let listing = self.listings.get(listing_id).ok_or(EngineError::UnknownListing)?;
                if listing.seller != *seller {
                    return Err(EngineError::NotSeller);
                }
                touch.insert(*seller);
                if let Some(prev) = listing.high_bidder {
                    touch.insert(prev);
                }
            }
            Input::Settle { listing_id } => {
                let listing = self.listings.get(listing_id).ok_or(EngineError::UnknownListing)?;
                let winner = listing.high_bidder.ok_or(EngineError::NoBid)?;
                touch.insert(winner);
                touch.insert(listing.seller);
            }
        }
        Ok(touch)
    }

    fn effects(&mut self, input: &Input, touch: &BTreeSet<U256>) -> Result<(), EngineError> {
        match input {
            Input::Spawn { token_id, starting_job } => {
                if !touch.contains(token_id) {
                    return Ok(());
                }
                if self.characters.contains_key(token_id) {
                    return Err(EngineError::AlreadySpawned);
                }
                let mut state = State::new();
                state.spawn(*token_id, *starting_job);
                self.characters.insert(
                    *token_id,
                    Character {
                        starting_job: *starting_job,
                        state,
                        chain: Chain::new(genesis_root(token_id, *starting_job)),
                        entries: Vec::new(),
                        committed: 0,
                    },
                );
                Ok(())
            }
            Input::DepositKek { token_id, amount } => {
                if touch.contains(token_id) {
                    self.credit_kek(*token_id, *amount)?;
                }
                Ok(())
            }
            Input::WithdrawKek { token_id, amount } => {
                if touch.contains(token_id) {
                    self.debit_kek(*token_id, *amount)?;
                }
                Ok(())
            }
            Input::ImportItem { token_id, item_id, amount } => {
                if touch.contains(token_id) {
                    self.credit_item(*token_id, *item_id, *amount)?;
                }
                Ok(())
            }
            Input::ExportItem { token_id, item_id, amount } => {
                if touch.contains(token_id) {
                    self.debit_item(*token_id, *item_id, *amount)?;
                }
                Ok(())
            }
            Input::SendKek { from, to, amount } => self.transfer_kek(*from, *to, *amount, touch),
            Input::SendItem { from, to, item_id, amount } => {
                self.transfer_item(*from, *to, *item_id, *amount, touch)
            }
            Input::List { listing_id, seller, item_id, amount } => {
                self.list(*listing_id, *seller, *item_id, *amount, touch)
            }
            Input::Bid { listing_id, bidder, amount } => self.bid(*listing_id, *bidder, *amount, touch),
            Input::Cancel { listing_id, seller } => self.cancel(*listing_id, *seller, touch),
            Input::Settle { listing_id } => self.settle(*listing_id, touch),
        }
    }

    fn link_at(&mut self, input: &Input, touch: &BTreeSet<U256>, seq: u64) -> AppliedEvent {
        let mut links = Vec::new();
        for token in touch {
            let ch = self.characters.get_mut(token).expect("affected character is spawned");
            let index = ch.chain.len();
            let prev_hash = ch.chain.head();
            let hash = entry_hash(&prev_hash, index, input);
            ch.chain.push(input.clone(), hash);
            ch.entries.push(LoggedEntry {
                hash,
                input: input.clone(),
                seq,
            });
            links.push(CharacterLink {
                token_id: *token,
                index,
                prev_hash,
                entry_hash: hash,
            });
        }
        if self.next_seq <= seq {
            self.next_seq = seq + 1;
        }
        AppliedEvent { seq, links }
    }

    fn root_at(&self, token_id: &U256, index: u64) -> Result<[u8; 32], EngineError> {
        Ok(self.projection_at(token_id, index)?.0)
    }

    fn projection_at(&self, token_id: &U256, index: u64) -> Result<([u8; 32], U256), EngineError> {
        let ch = self.characters.get(token_id).ok_or(EngineError::NotSpawned)?;
        if index > ch.entries.len() as u64 {
            return Err(EngineError::BadRange);
        }
        if index == 0 {
            return Ok((genesis_root(token_id, ch.starting_job), U256::ZERO));
        }
        if index == ch.entries.len() as u64 {
            return Ok((ch.state.root(), ch.state.summary()));
        }
        let seq_limit = ch.entries[index as usize - 1].seq;
        let mut doc = self.to_document();
        for character in &mut doc.characters {
            character.entries.retain(|entry| entry.seq <= seq_limit);
        }
        let replayed = World::load(&doc).map_err(|_| EngineError::ConflictingLog)?;
        let state = replayed.character_state(token_id).ok_or(EngineError::NotSpawned)?;
        Ok((state.root(), state.summary()))
    }

    fn credit_kek(&mut self, token_id: U256, amount: U256) -> Result<(), EngineError> {
        if amount == U256::ZERO {
            return Err(EngineError::ZeroAmount);
        }
        let ch = self.characters.get_mut(&token_id).ok_or(EngineError::NotSpawned)?;
        let next = ch.state.get(&Key::Kek).checked_add(amount).ok_or(EngineError::Overflow)?;
        ch.state.set_kek(next);
        Ok(())
    }

    fn debit_kek(&mut self, token_id: U256, amount: U256) -> Result<(), EngineError> {
        if amount == U256::ZERO {
            return Err(EngineError::ZeroAmount);
        }
        let ch = self.characters.get_mut(&token_id).ok_or(EngineError::NotSpawned)?;
        // Spendable only. Escrowed bids were already removed from this balance, so they
        // cannot be withdrawn.
        let next = ch.state.get(&Key::Kek).checked_sub(amount).ok_or(EngineError::InsufficientKek)?;
        ch.state.set_kek(next);
        Ok(())
    }

    fn credit_item(&mut self, token_id: U256, item_id: U256, amount: U256) -> Result<(), EngineError> {
        if amount == U256::ZERO {
            return Err(EngineError::ZeroAmount);
        }
        let ch = self.characters.get_mut(&token_id).ok_or(EngineError::NotSpawned)?;
        let next = ch
            .state
            .get(&Key::Item(item_id))
            .checked_add(amount)
            .ok_or(EngineError::Overflow)?;
        ch.state.set_item(item_id, next);
        Ok(())
    }

    fn debit_item(&mut self, token_id: U256, item_id: U256, amount: U256) -> Result<(), EngineError> {
        if amount == U256::ZERO {
            return Err(EngineError::ZeroAmount);
        }
        let ch = self.characters.get_mut(&token_id).ok_or(EngineError::NotSpawned)?;
        let next = ch
            .state
            .get(&Key::Item(item_id))
            .checked_sub(amount)
            .ok_or(EngineError::InsufficientItem)?;
        ch.state.set_item(item_id, next);
        Ok(())
    }

    fn transfer_kek(
        &mut self,
        from: U256,
        to: U256,
        amount: U256,
        touch: &BTreeSet<U256>,
    ) -> Result<(), EngineError> {
        if from == to {
            return Err(EngineError::SelfTransfer);
        }
        if amount == U256::ZERO {
            return Err(EngineError::ZeroAmount);
        }
        if touch.contains(&from) {
            self.debit_kek(from, amount)?;
        }
        if touch.contains(&to) {
            self.credit_kek(to, amount)?;
        }
        Ok(())
    }

    fn transfer_item(
        &mut self,
        from: U256,
        to: U256,
        item_id: U256,
        amount: U256,
        touch: &BTreeSet<U256>,
    ) -> Result<(), EngineError> {
        if from == to {
            return Err(EngineError::SelfTransfer);
        }
        if amount == U256::ZERO {
            return Err(EngineError::ZeroAmount);
        }
        if touch.contains(&from) {
            self.debit_item(from, item_id, amount)?;
        }
        if touch.contains(&to) {
            self.credit_item(to, item_id, amount)?;
        }
        Ok(())
    }

    fn list(
        &mut self,
        listing_id: U256,
        seller: U256,
        item_id: U256,
        amount: U256,
        touch: &BTreeSet<U256>,
    ) -> Result<(), EngineError> {
        if amount == U256::ZERO {
            return Err(EngineError::ZeroAmount);
        }
        if self.listings.contains_key(&listing_id) {
            return Err(EngineError::ListingExists);
        }
        if self.listings.values().any(|l| l.seller == seller && l.item_id == item_id) {
            return Err(EngineError::AlreadyListed);
        }
        if touch.contains(&seller) {
            self.debit_item(seller, item_id, amount)?;
        }
        self.listings.insert(
            listing_id,
            Listing {
                id: listing_id,
                seller,
                item_id,
                amount,
                high_bidder: None,
                high_bid: U256::ZERO,
            },
        );
        Ok(())
    }

    fn bid(
        &mut self,
        listing_id: U256,
        bidder: U256,
        amount: U256,
        touch: &BTreeSet<U256>,
    ) -> Result<(), EngineError> {
        if amount == U256::ZERO {
            return Err(EngineError::ZeroAmount);
        }
        let listing = self
            .listings
            .get(&listing_id)
            .cloned()
            .ok_or(EngineError::UnknownListing)?;
        if amount <= listing.high_bid {
            return Err(EngineError::BidNotHigher);
        }
        if let Some(prev) = listing.high_bidder {
            if touch.contains(&prev) {
                self.credit_kek(prev, listing.high_bid)?;
            }
        }
        if touch.contains(&bidder) {
            self.debit_kek(bidder, amount)?;
        }
        let listing = self.listings.get_mut(&listing_id).unwrap();
        listing.high_bidder = Some(bidder);
        listing.high_bid = amount;
        Ok(())
    }

    fn cancel(&mut self, listing_id: U256, seller: U256, touch: &BTreeSet<U256>) -> Result<(), EngineError> {
        let listing = self
            .listings
            .get(&listing_id)
            .cloned()
            .ok_or(EngineError::UnknownListing)?;
        if listing.seller != seller {
            return Err(EngineError::NotSeller);
        }
        if touch.contains(&listing.seller) {
            self.credit_item(listing.seller, listing.item_id, listing.amount)?;
        }
        if let Some(prev) = listing.high_bidder {
            if touch.contains(&prev) {
                self.credit_kek(prev, listing.high_bid)?;
            }
        }
        self.listings.remove(&listing_id);
        Ok(())
    }

    fn settle(&mut self, listing_id: U256, touch: &BTreeSet<U256>) -> Result<(), EngineError> {
        let listing = self
            .listings
            .get(&listing_id)
            .cloned()
            .ok_or(EngineError::UnknownListing)?;
        let winner = listing.high_bidder.ok_or(EngineError::NoBid)?;
        if touch.contains(&winner) {
            self.credit_item(winner, listing.item_id, listing.amount)?;
        }
        if touch.contains(&listing.seller) {
            self.credit_kek(listing.seller, listing.high_bid)?;
        }
        self.listings.remove(&listing_id);
        Ok(())
    }
}

impl Default for World {
    fn default() -> Self {
        Self::new()
    }
}

fn escrowed_bids(listings: &BTreeMap<U256, Listing>, token_id: &U256) -> U256 {
    let mut total = U256::ZERO;
    for listing in listings.values() {
        if listing.high_bidder == Some(*token_id) {
            total = total.checked_add(listing.high_bid).expect("escrow overflow");
        }
    }
    total
}

fn fit_u32(amount: U256) -> Result<u32, EngineError> {
    if amount.0[..28].iter().any(|byte| *byte != 0) {
        return Err(EngineError::Overflow);
    }
    let bytes: [u8; 4] = amount.0[28..].try_into().expect("4 bytes");
    let value = u32::from_be_bytes(bytes);
    if value == 0 {
        return Err(EngineError::ZeroAmount);
    }
    Ok(value)
}
