//! Item and KEK transfers, and the auction house, on the world log.

use std::process::Command;

use lok_engine::{
    entry_hash, fungible_id, replay_world, unique_id, Engine, EngineError, Input, LoggedEntry,
    Outcome, ReplayStop, U256, World, WorldDocument,
};

fn n(v: u64) -> U256 {
    U256::from_u64(v)
}

fn record(world: &mut World, entries: &mut Vec<LoggedEntry>, input: Input) -> Outcome {
    let outcome = world.apply(input.clone()).expect("apply");
    let Outcome::Applied { entry_hash, .. } = &outcome;
    entries.push(LoggedEntry {
        hash: *entry_hash,
        input,
    });
    outcome
}

fn two_characters() -> (World, Vec<LoggedEntry>) {
    let mut world = World::new();
    let mut entries = Vec::new();
    record(&mut world, &mut entries, Input::Spawn { token_id: n(1), starting_job: 3 });
    record(&mut world, &mut entries, Input::Spawn { token_id: n(2), starting_job: 1 });
    (world, entries)
}

#[test]
fn happy_transfer_moves_kek_and_items_with_no_fee() {
    let ore = fungible_id("iron_ore");
    let (mut world, mut entries) = two_characters();
    record(&mut world, &mut entries, Input::DepositKek { token_id: n(1), amount: n(10) });
    record(&mut world, &mut entries, Input::ImportItem { token_id: n(1), item_id: ore, amount: n(3) });
    record(
        &mut world,
        &mut entries,
        Input::SendKek { from: n(1), to: n(2), amount: n(4) },
    );
    record(
        &mut world,
        &mut entries,
        Input::SendItem { from: n(1), to: n(2), item_id: ore, amount: n(2) },
    );

    assert_eq!(world.kek_balance(&n(1)), Some(n(6)));
    assert_eq!(world.kek_balance(&n(2)), Some(n(4)));
    assert_eq!(world.item_balance(&n(1), &ore), Some(n(1)));
    assert_eq!(world.item_balance(&n(2), &ore), Some(n(2)));
    let kek_sum = world.kek_balance(&n(1)).unwrap().checked_add(world.kek_balance(&n(2)).unwrap());
    assert_eq!(kek_sum, Some(n(10)), "transfers must not mint or tax KEK");

    let report = replay_world(&WorldDocument { entries }).expect("replay");
    assert_eq!(report.entries, world.len());
    assert_eq!(report.head, world.head());
    assert_eq!(report.characters.len(), 2);
    assert_eq!(report.characters[0].kek, n(6));
    assert_eq!(report.characters[1].kek, n(4));
}

#[test]
fn overspend_is_rejected_and_does_not_append() {
    let (mut world, _) = two_characters();
    world.append_deposit_kek(n(1), n(5)).unwrap();
    let before_len = world.len();
    let before_head = world.head();
    let err = world.append_send_kek(n(1), n(2), n(6)).unwrap_err();
    assert_eq!(err, EngineError::InsufficientKek);
    assert_eq!(world.kek_balance(&n(1)), Some(n(5)));
    assert_eq!(world.kek_balance(&n(2)), Some(n(0)));
    assert_eq!(world.len(), before_len);
    assert_eq!(world.head(), before_head);

    assert_eq!(world.append_send_kek(n(1), n(1), n(1)).unwrap_err(), EngineError::SelfTransfer);
    assert_eq!(
        world.append_send_kek(n(1), n(9), n(1)).unwrap_err(),
        EngineError::NotSpawned
    );
    assert_eq!(world.kek_balance(&n(1)), Some(n(5)));

    let mut entries = Vec::new();
    let mut built = World::new();
    record(&mut built, &mut entries, Input::Spawn { token_id: n(1), starting_job: 3 });
    record(&mut built, &mut entries, Input::Spawn { token_id: n(2), starting_job: 1 });
    record(&mut built, &mut entries, Input::DepositKek { token_id: n(1), amount: n(5) });
    let send = Input::SendKek { from: n(1), to: n(2), amount: n(6) };
    let bad_index = built.len();
    let send_hash = entry_hash(&built.head(), bad_index, &send);
    entries.push(LoggedEntry { hash: send_hash, input: send });
    entries.push(LoggedEntry {
        hash: [0u8; 32],
        input: Input::SendKek { from: n(1), to: n(2), amount: n(1) },
    });
    match replay_world(&WorldDocument { entries }).unwrap_err() {
        ReplayStop::Rejected { index, reason } => {
            assert_eq!(index, bad_index);
            assert_eq!(reason, EngineError::InsufficientKek);
        }
        other => panic!("expected rejection, got {other:?}"),
    }
}

#[test]
fn list_outbid_and_settle_conserves_kek() {
    let sword = unique_id("iron_sword", 42);
    let (mut world, _) = two_characters();
    world.append_spawn(n(3), 2).unwrap();
    world.append_import_item(n(1), sword, n(1)).unwrap();
    world.append_deposit_kek(n(2), n(100)).unwrap();
    world.append_deposit_kek(n(3), n(250)).unwrap();

    world.append_list(n(7), n(1), sword, n(1)).unwrap();
    assert_eq!(world.item_balance(&n(1), &sword), Some(n(0)));
    assert_eq!(
        world.append_send_item(n(1), n(2), sword, n(1)).unwrap_err(),
        EngineError::InsufficientItem,
        "listed item cannot be transferred"
    );
    assert_eq!(
        world.append_export_item(n(1), sword, n(1)).unwrap_err(),
        EngineError::InsufficientItem,
        "listed item cannot be exported"
    );

    world.append_bid(n(7), n(2), n(100)).unwrap();
    assert_eq!(world.kek_balance(&n(2)), Some(n(0)));
    let err = world.append_bid(n(7), n(3), n(100)).unwrap_err();
    assert_eq!(err, EngineError::BidNotHigher);
    assert_eq!(world.kek_balance(&n(3)), Some(n(250)));

    world.append_bid(n(7), n(3), n(150)).unwrap();
    assert_eq!(world.kek_balance(&n(2)), Some(n(100)), "outbid unlocks the previous bid");
    assert_eq!(world.kek_balance(&n(3)), Some(n(100)));
    assert_eq!(world.listing(&n(7)).unwrap().high_bidder, Some(n(3)));
    assert_eq!(world.listing(&n(7)).unwrap().high_bid, n(150));

    world.append_settle(n(7)).unwrap();
    assert!(world.listing(&n(7)).is_none());
    assert_eq!(world.item_balance(&n(3), &sword), Some(n(1)));
    assert_eq!(world.item_balance(&n(1), &sword), Some(n(0)));
    assert_eq!(world.kek_balance(&n(1)), Some(n(150)));
    assert_eq!(world.kek_balance(&n(2)), Some(n(100)));
    assert_eq!(world.kek_balance(&n(3)), Some(n(100)));
    let sum = world.kek_balance(&n(1)).unwrap()
        .checked_add(world.kek_balance(&n(2)).unwrap()).unwrap()
        .checked_add(world.kek_balance(&n(3)).unwrap()).unwrap();
    assert_eq!(sum, n(350));
    world.append_send_item(n(3), n(2), sword, n(1)).unwrap();
    assert_eq!(world.item_balance(&n(2), &sword), Some(n(1)));
}

#[test]
fn cancel_with_a_bid_returns_item_and_unlocks_kek() {
    let sword = unique_id("iron_sword", 7);
    let (mut world, _) = two_characters();
    world.append_import_item(n(1), sword, n(1)).unwrap();
    world.append_deposit_kek(n(2), n(80)).unwrap();
    world.append_list(n(4), n(1), sword, n(1)).unwrap();
    world.append_bid(n(4), n(2), n(80)).unwrap();
    assert_eq!(world.append_cancel(n(4), n(2)).unwrap_err(), EngineError::NotSeller);
    assert!(world.listing(&n(4)).is_some());
    assert_eq!(world.kek_balance(&n(2)), Some(n(0)));

    world.append_cancel(n(4), n(1)).unwrap();
    assert!(world.listing(&n(4)).is_none());
    assert_eq!(world.item_balance(&n(1), &sword), Some(n(1)));
    assert_eq!(world.kek_balance(&n(2)), Some(n(80)));
    assert_eq!(world.kek_balance(&n(1)), Some(n(0)));
    world.append_list(n(4), n(1), sword, n(1)).unwrap();
    assert!(world.listing(&n(4)).is_some());
}

#[test]
fn double_list_is_rejected() {
    let ore = fungible_id("iron_ore");
    let (mut world, _) = two_characters();
    world.append_import_item(n(1), ore, n(5)).unwrap();
    world.append_list(n(1), n(1), ore, n(2)).unwrap();
    let err = world.append_list(n(2), n(1), ore, n(1)).unwrap_err();
    assert_eq!(err, EngineError::AlreadyListed);
    assert_eq!(world.item_balance(&n(1), &ore), Some(n(3)));
    assert_eq!(world.listing(&n(1)).unwrap().amount, n(2));
    assert!(world.listing(&n(2)).is_none());
    assert_eq!(world.listings().count(), 1);
}

#[test]
fn replay_cli_stops_at_the_first_bad_world_hash() {
    let (mut world, mut entries) = two_characters();
    record(&mut world, &mut entries, Input::DepositKek { token_id: n(1), amount: n(5) });
    let send = Input::SendKek { from: n(1), to: n(2), amount: n(1) };
    let good = entry_hash(&world.head(), world.len(), &send);
    let mut bad = good;
    bad[31] ^= 0xff;
    let doc = serde_json::json!({
        "type": "world",
        "entries": [
            {
                "hash": format!("0x{}", hex::encode(entries[0].hash)),
                "input": { "type": "spawn", "tokenId": "1", "startingJob": 3 }
            },
            {
                "hash": format!("0x{}", hex::encode(bad)),
                "input": { "type": "sendKek", "from": "1", "to": "2", "amount": "1" }
            },
            {
                "hash": "0x0000000000000000000000000000000000000000000000000000000000000000",
                "input": { "type": "sendKek", "from": "1", "to": "2", "amount": "1" }
            }
        ]
    });
    let path = std::env::temp_dir().join(format!("lok-world-bad-{}.json", std::process::id()));
    std::fs::write(&path, doc.to_string()).unwrap();
    let stopped = Command::new(env!("CARGO_BIN_EXE_lok-replay"))
        .arg(&path)
        .output()
        .expect("run lok-replay");
    assert_eq!(stopped.status.code(), Some(1));
    let stderr = String::from_utf8(stopped.stderr).unwrap();
    assert!(stderr.contains("bad hash at index 1"), "{stderr}");

    let single = Engine::open(n(1), 3);
    let err = {
        let mut engine = single;
        engine.apply(Input::SendKek { from: n(1), to: n(2), amount: n(1) }).unwrap_err()
    };
    assert_eq!(err, EngineError::NotOnCharacterLog);
}
