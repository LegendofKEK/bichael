//! Inputs applied to state, and the outcome of a successful apply.

use crate::abi::{keccak256, Buf};
use crate::ids::spawn_tag;
use crate::u256::U256;

#[derive(Clone, Debug, PartialEq, Eq)]
pub enum Input {
    /// First log event. Must name the same token and job the genesis anchor was built from.
    Spawn { token_id: U256, starting_job: u8 },
    /// Log image of a KekVault deposit. Credits KEK the vault already holds. Not a mint.
    /// `nonce` is that character's inbound id (shared with item imports) and may be applied once.
    DepositKek { token_id: U256, amount: U256, nonce: u64 },
    /// Log image of an item import. Credits items already burned into the log. Not a mint of KEK.
    /// `nonce` is that character's inbound id (shared with KEK deposits) and may be applied once.
    ImportItem { token_id: U256, item_id: U256, amount: U256, nonce: u64 },
    /// Burns spendable items out of the log (the export side of a checkpoint). Escrowed listings are not spendable.
    ExportItem { token_id: U256, item_id: U256, amount: U256 },
    /// Decreases spendable KEK. Escrowed bids are not spendable, so they cannot be withdrawn.
    /// This is the log image of `kekOut`. It does not submit an onchain withdrawal.
    WithdrawKek { token_id: U256, amount: U256 },
    SendItem { from: U256, to: U256, item_id: U256, amount: U256 },
    SendKek { from: U256, to: U256, amount: U256 },
    List { listing_id: U256, seller: U256, item_id: U256, amount: U256 },
    Bid { listing_id: U256, bidder: U256, amount: U256 },
    Cancel { listing_id: U256, seller: U256 },
    Settle { listing_id: U256 },
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

fn domain(label: &[u8]) -> [u8; 32] {
    keccak256(label)
}

/// Domain-separated id of an input: `keccak256(abi.encode(tag, ...fields))`.
pub fn event_id(input: &Input) -> [u8; 32] {
    let mut buf = Buf::new();
    match input {
        Input::Spawn { token_id, starting_job } => {
            buf.b256(&spawn_tag());
            buf.u256(token_id);
            buf.u8(*starting_job);
        }
        Input::DepositKek { token_id, amount, nonce } => {
            buf.b256(&domain(b"LOK_DEPOSIT_KEK_V1"));
            buf.u256(token_id);
            buf.u256(amount);
            buf.u64(*nonce);
        }
        Input::ImportItem { token_id, item_id, amount, nonce } => {
            buf.b256(&domain(b"LOK_IMPORT_ITEM_V1"));
            buf.u256(token_id);
            buf.u256(item_id);
            buf.u256(amount);
            buf.u64(*nonce);
        }
        Input::ExportItem { token_id, item_id, amount } => {
            buf.b256(&domain(b"LOK_EXPORT_ITEM_V1"));
            buf.u256(token_id);
            buf.u256(item_id);
            buf.u256(amount);
        }
        Input::WithdrawKek { token_id, amount } => {
            buf.b256(&domain(b"LOK_WITHDRAW_KEK_V1"));
            buf.u256(token_id);
            buf.u256(amount);
        }
        Input::SendItem { from, to, item_id, amount } => {
            buf.b256(&domain(b"LOK_SEND_ITEM_V1"));
            buf.u256(from);
            buf.u256(to);
            buf.u256(item_id);
            buf.u256(amount);
        }
        Input::SendKek { from, to, amount } => {
            buf.b256(&domain(b"LOK_SEND_KEK_V1"));
            buf.u256(from);
            buf.u256(to);
            buf.u256(amount);
        }
        Input::List { listing_id, seller, item_id, amount } => {
            buf.b256(&domain(b"LOK_LIST_V1"));
            buf.u256(listing_id);
            buf.u256(seller);
            buf.u256(item_id);
            buf.u256(amount);
        }
        Input::Bid { listing_id, bidder, amount } => {
            buf.b256(&domain(b"LOK_BID_V1"));
            buf.u256(listing_id);
            buf.u256(bidder);
            buf.u256(amount);
        }
        Input::Cancel { listing_id, seller } => {
            buf.b256(&domain(b"LOK_CANCEL_V1"));
            buf.u256(listing_id);
            buf.u256(seller);
        }
        Input::Settle { listing_id } => {
            buf.b256(&domain(b"LOK_SETTLE_V1"));
            buf.u256(listing_id);
        }
    }
    keccak256(&buf.bytes)
}

/// `keccak256(abi.encode(prev, index, eventId))`. Static, so the link does not depend on state bytes.
pub fn entry_hash(prev: &[u8; 32], index: u64, input: &Input) -> [u8; 32] {
    let mut buf = Buf::new();
    buf.b256(prev);
    buf.u64(index);
    buf.b256(&event_id(input));
    keccak256(&buf.bytes)
}
