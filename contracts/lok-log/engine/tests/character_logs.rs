//! Per-character checkpoints, WithdrawKek, and solvency snapshots.

use lok_engine::{event_id, genesis_root, Engine, EngineError, Input, Key, U256, World};

fn n(v: u64) -> U256 {
    U256::from_u64(v)
}

fn spawn_pair() -> World {
    let mut world = World::new();
    world.append_spawn(n(1), 3).unwrap();
    world.append_spawn(n(2), 1).unwrap();
    world
}

#[test]
fn transfer_is_on_both_logs_and_each_checkpoint_is_independent() {
    let mut world = spawn_pair();
    world.append_deposit_kek(n(1), n(10)).unwrap();
    world.append_send_kek(n(1), n(2), n(4)).unwrap();

    let (a_at, b_at, a_send, b_send, a_deposit_hash) = {
        let a_entries = world.character_entries(&n(1)).unwrap();
        let b_entries = world.character_entries(&n(2)).unwrap();
        let a_at = a_entries.iter().position(|e| matches!(e.input, Input::SendKek { .. })).unwrap();
        let b_at = b_entries.iter().position(|e| matches!(e.input, Input::SendKek { .. })).unwrap();
        assert_ne!(a_at, b_at, "each log advances its own index");
        assert_eq!(a_entries[a_at].input, b_entries[b_at].input);
        assert_eq!(event_id(&a_entries[a_at].input), event_id(&b_entries[b_at].input));
        assert_eq!(a_entries[a_at].seq, b_entries[b_at].seq);
        assert_ne!(a_entries[a_at].hash, b_entries[b_at].hash);
        (
            a_at,
            b_at,
            a_entries[a_at].input.clone(),
            b_entries[b_at].clone(),
            a_entries[1].hash,
        )
    };
    assert_eq!(a_at, 2);
    assert_eq!(b_at, 1);
    let _ = a_send;

    let draft_a = world.checkpoint_span(&n(1), world.character_len(&n(1)).unwrap()).unwrap();
    let draft_b = world.checkpoint_span(&n(2), world.character_len(&n(2)).unwrap()).unwrap();
    assert_eq!(draft_a.from_index, 0);
    assert_eq!(draft_a.to_index, 3);
    assert_eq!(draft_b.to_index, 2);
    assert_ne!(draft_a.to_index, draft_b.to_index);
    assert_eq!(draft_a.prev_root, genesis_root(&n(1), 3));
    assert_eq!(draft_b.prev_root, genesis_root(&n(2), 1));
    assert_eq!(draft_a.log_hash, world.character_head(&n(1)).unwrap());
    assert_eq!(draft_b.log_hash, world.character_head(&n(2)).unwrap());
    assert_ne!(draft_a.log_hash, draft_b.log_hash);
    assert_ne!(draft_a.new_root, draft_b.new_root);
    assert_eq!(draft_a.kek_out, U256::ZERO);

    // Commit A only through the deposit. The send stays an uncommitted tail.
    let committed_a = world.commit_span(n(1), 2).unwrap();
    assert_eq!(committed_a.to_index, 2);
    assert_eq!(committed_a.log_hash, a_deposit_hash);
    world.commit_span(n(2), 2).unwrap();

    world.rebase(n(1)).unwrap();
    assert!(world.character_entries(&n(1)).unwrap().iter().all(|e| !matches!(e.input, Input::SendKek { .. })));
    let b_after = world.character_entries(&n(2)).unwrap();
    assert!(b_after.iter().any(|e| e.input == b_send.input && e.hash == b_send.hash));
    assert_eq!(world.kek_balance(&n(1)), Some(n(10)), "A's uncommitted debit is dropped");
    assert_eq!(world.kek_balance(&n(2)), Some(n(4)), "B's committed credit stays");
    assert_eq!(world.committed_index(&n(2)), Some(2));
    assert_eq!(world.character_len(&n(1)), Some(2));
}

#[test]
fn withdraw_kek_reduces_balance_and_rejects_overspend() {
    let mut world = spawn_pair();
    world.append_deposit_kek(n(1), n(10)).unwrap();
    let drafted = {
        world.append_withdraw_kek(n(1), n(4)).unwrap();
        world.checkpoint_span(&n(1), world.character_len(&n(1)).unwrap()).unwrap()
    };
    assert_eq!(drafted.kek_out, n(4));
    assert_eq!(world.kek_balance(&n(1)), Some(n(6)));
    assert_eq!(world.solvency_kek(&n(1)), Some(n(6)));
    let len = world.character_len(&n(1)).unwrap();
    let head = world.character_head(&n(1)).unwrap();
    assert_eq!(world.append_withdraw_kek(n(1), n(7)).unwrap_err(), EngineError::InsufficientKek);
    assert_eq!(world.character_len(&n(1)), Some(len));
    assert_eq!(world.character_head(&n(1)), Some(head));
    assert_eq!(world.kek_balance(&n(1)), Some(n(6)));

    let mut engine = Engine::open(n(1), 3);
    engine.apply(Input::Spawn { token_id: n(1), starting_job: 3 }).unwrap();
    engine.apply(Input::DepositKek { token_id: n(1), amount: n(5) }).unwrap();
    engine.apply(Input::WithdrawKek { token_id: n(1), amount: n(2) }).unwrap();
    assert_eq!(engine.state().get(&Key::Kek), n(3));
    assert_eq!(
        engine.apply(Input::WithdrawKek { token_id: n(1), amount: n(4) }).unwrap_err(),
        EngineError::InsufficientKek
    );
    let mut outsider = Engine::open(n(9), 0);
    outsider.apply(Input::Spawn { token_id: n(9), starting_job: 0 }).unwrap();
    assert_eq!(
        outsider.apply(Input::SendKek { from: n(1), to: n(2), amount: n(1) }).unwrap_err(),
        EngineError::NotOnCharacterLog
    );
    assert_eq!(
        engine.apply(Input::List { listing_id: n(1), seller: n(1), item_id: n(1), amount: n(1) }).unwrap_err(),
        EngineError::NotOnCharacterLog
    );
    engine.apply(Input::SendKek { from: n(1), to: n(2), amount: n(1) }).unwrap();
    assert_eq!(engine.state().get(&Key::Kek), n(2));
}

#[test]
fn escrowed_bid_counts_in_the_solvency_snapshot() {
    let ore = lok_engine::fungible_id("iron_ore");
    let mut world = spawn_pair();
    world.append_import_item(n(1), ore, n(1)).unwrap();
    world.append_deposit_kek(n(2), n(10)).unwrap();
    world.append_list(n(1), n(1), ore, n(1)).unwrap();
    world.append_bid(n(1), n(2), n(6)).unwrap();
    assert_eq!(world.kek_balance(&n(2)), Some(n(4)));
    assert_eq!(world.solvency_kek(&n(2)), Some(n(10)));
    let snap = world.snapshots().into_iter().find(|s| s.token_id == n(2)).unwrap();
    assert_eq!(snap.kek, n(4));
    assert_eq!(snap.solvency_kek, n(10));

    assert_eq!(world.append_withdraw_kek(n(2), n(5)).unwrap_err(), EngineError::InsufficientKek);
    world.append_withdraw_kek(n(2), n(4)).unwrap();
    assert_eq!(world.kek_balance(&n(2)), Some(n(0)));
    assert_eq!(world.solvency_kek(&n(2)), Some(n(6)), "escrowed bid is still owed by the vault");
    let snap = world.snapshots().into_iter().find(|s| s.token_id == n(2)).unwrap();
    assert_eq!(snap.solvency_kek, n(6));
}
