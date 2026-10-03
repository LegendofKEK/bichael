//! World log: item and KEK transfers, plus the auction house.
//!
//! One hash chain covers every character. KEK enters only through `DepositKek`
//! (the log image of a Robinhood vault deposit). Nothing here mints KEK, and
//! transfers, bids, and settlement move balances that are already in state.
//! There is no transfer tax and no auction fee.

use std::collections::BTreeMap;

use crate::engine::EngineError;
use crate::event::{entry_hash, Input, Outcome};
use crate::ids::world_genesis;
use crate::state::{Key, State};
use crate::u256::U256;

#[derive(Clone, Debug, PartialEq, Eq)]
struct Character {
    starting_job: u8,
    state: State,
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
    pub kek: U256,
}

#[derive(Clone, Debug)]
pub struct World {
    characters: BTreeMap<U256, Character>,
    listings: BTreeMap<U256, Listing>,
    head: [u8; 32],
    len: u64,
}

impl World {
    pub fn new() -> Self {
        Self {
            characters: BTreeMap::new(),
            listings: BTreeMap::new(),
            head: world_genesis(),
            len: 0,
        }
    }

    pub fn genesis(&self) -> [u8; 32] {
        world_genesis()
    }

    pub fn head(&self) -> [u8; 32] {
        self.head
    }

    pub fn len(&self) -> u64 {
        self.len
    }

    /// Spendable KEK. Bids in escrow are not included; they sit on the listing.
    pub fn kek_balance(&self, token_id: &U256) -> Option<U256> {
        self.characters.get(token_id).map(|c| c.state.get(&Key::Kek))
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

    pub fn snapshots(&self) -> Vec<CharacterSnapshot> {
        self.characters
            .iter()
            .map(|(token_id, ch)| CharacterSnapshot {
                token_id: *token_id,
                starting_job: ch.starting_job,
                state_root: ch.state.root(),
                summary: ch.state.summary(),
                kek: ch.state.get(&Key::Kek),
            })
            .collect()
    }

    pub fn append_spawn(&mut self, token_id: U256, starting_job: u8) -> Result<Outcome, EngineError> {
        self.apply(Input::Spawn { token_id, starting_job })
    }

    pub fn append_deposit_kek(&mut self, token_id: U256, amount: U256) -> Result<Outcome, EngineError> {
        self.apply(Input::DepositKek { token_id, amount })
    }

    pub fn append_import_item(
        &mut self,
        token_id: U256,
        item_id: U256,
        amount: U256,
    ) -> Result<Outcome, EngineError> {
        self.apply(Input::ImportItem { token_id, item_id, amount })
    }

    pub fn append_export_item(
        &mut self,
        token_id: U256,
        item_id: U256,
        amount: U256,
    ) -> Result<Outcome, EngineError> {
        self.apply(Input::ExportItem { token_id, item_id, amount })
    }

    pub fn append_send_item(
        &mut self,
        from: U256,
        to: U256,
        item_id: U256,
        amount: U256,
    ) -> Result<Outcome, EngineError> {
        self.apply(Input::SendItem { from, to, item_id, amount })
    }

    pub fn append_send_kek(&mut self, from: U256, to: U256, amount: U256) -> Result<Outcome, EngineError> {
        self.apply(Input::SendKek { from, to, amount })
    }

    pub fn append_list(
        &mut self,
        listing_id: U256,
        seller: U256,
        item_id: U256,
        amount: U256,
    ) -> Result<Outcome, EngineError> {
        self.apply(Input::List { listing_id, seller, item_id, amount })
    }

    pub fn append_bid(&mut self, listing_id: U256, bidder: U256, amount: U256) -> Result<Outcome, EngineError> {
        self.apply(Input::Bid { listing_id, bidder, amount })
    }

    pub fn append_cancel(&mut self, listing_id: U256, seller: U256) -> Result<Outcome, EngineError> {
        self.apply(Input::Cancel { listing_id, seller })
    }

    pub fn append_settle(&mut self, listing_id: U256) -> Result<Outcome, EngineError> {
        self.apply(Input::Settle { listing_id })
    }

    /// Apply one log event. On failure the world is unchanged and nothing is appended.
    pub fn apply(&mut self, input: Input) -> Result<Outcome, EngineError> {
        let characters = self.characters.clone();
        let listings = self.listings.clone();
        let focus = self.focus_token(&input);
        if let Err(err) = self.apply_effects(&input) {
            self.characters = characters;
            self.listings = listings;
            return Err(err);
        }
        let index = self.len;
        let prev_hash = self.head;
        let link = entry_hash(&prev_hash, index, &input);
        let (state_root, summary) = match self.characters.get(&focus) {
            Some(ch) => (ch.state.root(), ch.state.summary()),
            None => ([0u8; 32], U256::ZERO),
        };
        self.head = link;
        self.len += 1;
        Ok(Outcome::Applied {
            index,
            prev_hash,
            entry_hash: link,
            state_root,
            summary,
        })
    }

    fn focus_token(&self, input: &Input) -> U256 {
        match input {
            Input::Spawn { token_id, .. }
            | Input::DepositKek { token_id, .. }
            | Input::ImportItem { token_id, .. }
            | Input::ExportItem { token_id, .. } => *token_id,
            Input::SendItem { from, .. } | Input::SendKek { from, .. } => *from,
            Input::List { seller, .. } | Input::Cancel { seller, .. } => *seller,
            Input::Bid { bidder, .. } => *bidder,
            Input::Settle { listing_id } => self
                .listings
                .get(listing_id)
                .map(|l| l.seller)
                .unwrap_or(U256::ZERO),
        }
    }

    fn apply_effects(&mut self, input: &Input) -> Result<(), EngineError> {
        match input {
            Input::Spawn { token_id, starting_job } => {
                if self.characters.contains_key(token_id) {
                    return Err(EngineError::AlreadySpawned);
                }
                let mut state = State::new();
                state.spawn(*token_id, *starting_job);
                self.characters.insert(
                    *token_id,
                    Character { starting_job: *starting_job, state },
                );
                Ok(())
            }
            Input::DepositKek { token_id, amount } => {
                self.credit_kek(*token_id, *amount)
            }
            Input::ImportItem { token_id, item_id, amount } => {
                self.credit_item(*token_id, *item_id, *amount)
            }
            Input::ExportItem { token_id, item_id, amount } => {
                self.debit_item(*token_id, *item_id, *amount)
            }
            Input::SendKek { from, to, amount } => self.transfer_kek(*from, *to, *amount),
            Input::SendItem { from, to, item_id, amount } => {
                self.transfer_item(*from, *to, *item_id, *amount)
            }
            Input::List { listing_id, seller, item_id, amount } => {
                self.list(*listing_id, *seller, *item_id, *amount)
            }
            Input::Bid { listing_id, bidder, amount } => self.bid(*listing_id, *bidder, *amount),
            Input::Cancel { listing_id, seller } => self.cancel(*listing_id, *seller),
            Input::Settle { listing_id } => self.settle(*listing_id),
        }
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

    fn transfer_kek(&mut self, from: U256, to: U256, amount: U256) -> Result<(), EngineError> {
        if from == to {
            return Err(EngineError::SelfTransfer);
        }
        if amount == U256::ZERO {
            return Err(EngineError::ZeroAmount);
        }
        if !self.characters.contains_key(&from) || !self.characters.contains_key(&to) {
            return Err(EngineError::NotSpawned);
        }
        let src = self.characters.get(&from).unwrap().state.get(&Key::Kek);
        let dst = self.characters.get(&to).unwrap().state.get(&Key::Kek);
        let src_next = src.checked_sub(amount).ok_or(EngineError::InsufficientKek)?;
        let dst_next = dst.checked_add(amount).ok_or(EngineError::Overflow)?;
        self.characters.get_mut(&from).unwrap().state.set_kek(src_next);
        self.characters.get_mut(&to).unwrap().state.set_kek(dst_next);
        Ok(())
    }

    fn transfer_item(&mut self, from: U256, to: U256, item_id: U256, amount: U256) -> Result<(), EngineError> {
        if from == to {
            return Err(EngineError::SelfTransfer);
        }
        if amount == U256::ZERO {
            return Err(EngineError::ZeroAmount);
        }
        if !self.characters.contains_key(&from) || !self.characters.contains_key(&to) {
            return Err(EngineError::NotSpawned);
        }
        let src = self.characters.get(&from).unwrap().state.get(&Key::Item(item_id));
        let dst = self.characters.get(&to).unwrap().state.get(&Key::Item(item_id));
        let src_next = src.checked_sub(amount).ok_or(EngineError::InsufficientItem)?;
        let dst_next = dst.checked_add(amount).ok_or(EngineError::Overflow)?;
        self.characters.get_mut(&from).unwrap().state.set_item(item_id, src_next);
        self.characters.get_mut(&to).unwrap().state.set_item(item_id, dst_next);
        Ok(())
    }

    fn list(&mut self, listing_id: U256, seller: U256, item_id: U256, amount: U256) -> Result<(), EngineError> {
        if amount == U256::ZERO {
            return Err(EngineError::ZeroAmount);
        }
        if !self.characters.contains_key(&seller) {
            return Err(EngineError::NotSpawned);
        }
        if self.listings.contains_key(&listing_id) {
            return Err(EngineError::ListingExists);
        }
        if self.listings.values().any(|l| l.seller == seller && l.item_id == item_id) {
            return Err(EngineError::AlreadyListed);
        }
        self.debit_item(seller, item_id, amount)?;
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

    fn bid(&mut self, listing_id: U256, bidder: U256, amount: U256) -> Result<(), EngineError> {
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
        if !self.characters.contains_key(&bidder) {
            return Err(EngineError::NotSpawned);
        }
        if let Some(prev) = listing.high_bidder {
            self.credit_kek(prev, listing.high_bid)?;
        }
        let cur = self.characters.get(&bidder).unwrap().state.get(&Key::Kek);
        let next = cur.checked_sub(amount).ok_or(EngineError::InsufficientKek)?;
        self.characters.get_mut(&bidder).unwrap().state.set_kek(next);
        let listing = self.listings.get_mut(&listing_id).unwrap();
        listing.high_bidder = Some(bidder);
        listing.high_bid = amount;
        Ok(())
    }

    fn cancel(&mut self, listing_id: U256, seller: U256) -> Result<(), EngineError> {
        let listing = self
            .listings
            .get(&listing_id)
            .cloned()
            .ok_or(EngineError::UnknownListing)?;
        // Seller may cancel with or without a bid. A listing that has no bid is
        // still seller-only; there is no public cancel.
        if listing.seller != seller {
            return Err(EngineError::NotSeller);
        }
        self.credit_item(listing.seller, listing.item_id, listing.amount)?;
        if let Some(prev) = listing.high_bidder {
            self.credit_kek(prev, listing.high_bid)?;
        }
        self.listings.remove(&listing_id);
        Ok(())
    }

    fn settle(&mut self, listing_id: U256) -> Result<(), EngineError> {
        let listing = self
            .listings
            .get(&listing_id)
            .cloned()
            .ok_or(EngineError::UnknownListing)?;
        let winner = listing.high_bidder.ok_or(EngineError::NoBid)?;
        self.credit_item(winner, listing.item_id, listing.amount)?;
        self.credit_kek(listing.seller, listing.high_bid)?;
        self.listings.remove(&listing_id);
        Ok(())
    }
}

impl Default for World {
    fn default() -> Self {
        Self::new()
    }
}
