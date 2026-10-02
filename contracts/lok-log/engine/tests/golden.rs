//! Pins copied from Golden.t.sol and verify.mjs. A drift fails this test.

use std::process::Command;

use lok_engine::{
    checkpoint_body_hash, commit_entries, eip712_digest, entry_hash, fungible_id, genesis_root,
    genesis_tag, parse_address, parse_b256, parse_log, replay, unique_id, Checkpoint, Engine,
    Export, Input, Key, Outcome, ReplayStop, U256,
};

const GENESIS_TAG: &str = "0x8a8d1f348a2311fc4d6271c76e697ff6d99152a86984976269678b04ab4eb413";
const BODY_HASH: &str = "0x7f3fcc38e49cecc713b43b66ad375eae92e94b6247265b3bfdec80dc1c6c231f";
const DIGEST: &str = "0x2b8bb71ec27564ba4d05efee4f8c9778481c488a57fc3e8fc533d8eb335521ca";
const GENESIS_ROOT: &str = "0x0c0d7ba0dd69dcda2fe24de603679f65ae5dbdaec43f4ba9f3dfa8c6b444761c";
const UNIQUE_ID: &str = "16326979768789847505458237212507241523594462770995321419559994427250918491098";
const FUNGIBLE_ID: &str = "89658009947691115780873220689577698189678099276092329480841579491160997392175";

fn word(byte: u8) -> [u8; 32] {
    [byte; 32]
}

fn golden_summary() -> U256 {
    U256::from_u64(42)
        .bitor(U256::from_u64(3).shl(16))
        .bitor(U256::from_u64(1).shl(24))
        .bitor(U256::from_u64(123_456).shl(32))
        .bitor(U256::from_u64(17).shl(96))
}

fn golden_checkpoint() -> Checkpoint {
    Checkpoint {
        prev_root: word(0x11),
        new_root: word(0x22),
        from_index: 100,
        to_index: 137,
        log_hash: word(0x33),
        ruleset_hash: word(0x44),
        summary: golden_summary(),
        inbound_consumed: 9,
        kek_out: U256::from_u128(250u128 * 1_000_000_000_000_000_000u128),
        exports: vec![
            Export { item_id: U256::from_u64(0xabc), amount: 1 },
            Export { item_id: U256::from_u64(0xdef), amount: 40 },
        ],
    }
}

#[test]
fn golden_vectors_match_solidity() {
    let tag = genesis_tag();
    assert_eq!(hex::encode(tag), GENESIS_TAG.trim_start_matches("0x"));

    let root = genesis_root(&U256::from_u64(1), 3);
    assert_eq!(hex::encode(root), GENESIS_ROOT.trim_start_matches("0x"), "genesis root drifted");

    let unique = unique_id("iron_sword", 42);
    assert_eq!(unique.to_dec(), UNIQUE_ID, "unique item id drifted");
    let fungible = fungible_id("iron_ore");
    assert_eq!(fungible.to_dec(), FUNGIBLE_ID, "fungible item id drifted");

    let body = checkpoint_body_hash(&golden_checkpoint());
    assert_eq!(hex::encode(body), BODY_HASH.trim_start_matches("0x"), "checkpoint encoding drifted");

    let digest = eip712_digest(
        &U256::from_u64(31337),
        &parse_address("0x5991A2dF15A8F6A256D3Ec51E99254Cd3fb576A9").unwrap(),
        &U256::from_u64(1),
        &parse_address("0x000000000000000000000000000000000000dEaD").unwrap(),
        3,
        &U256::from_u64(1_900_000_000),
        &body,
    );
    assert_eq!(hex::encode(digest), DIGEST.trim_start_matches("0x"), "eip712 digest drifted");
}

#[test]
fn spawn_chains_from_the_genesis_anchor() {
    let token = U256::from_u64(1);
    let mut engine = Engine::open(token, 3);
    assert_eq!(hex::encode(engine.genesis()), GENESIS_ROOT.trim_start_matches("0x"));
    assert_eq!(engine.head(), engine.genesis());
    assert!(engine.state().is_empty());

    let outcome = engine
        .apply(Input::Spawn { token_id: token, starting_job: 3 })
        .expect("spawn");
    match outcome {
        Outcome::Applied { index, prev_hash, entry_hash, state_root, summary } => {
            assert_eq!(index, 0);
            assert_eq!(prev_hash, engine.genesis());
            assert_eq!(entry_hash, engine.head());
            assert_ne!(state_root, prev_hash);
            assert_eq!(summary, U256::from_u64(1).bitor(U256::from_u64(3).shl(16)));
            assert_eq!(engine.state().get(&Key::Kek), U256::ZERO);
            assert_eq!(engine.state().get(&Key::Level), U256::from_u64(1));
            assert_eq!(engine.state().root(), state_root);
        }
    }
}

#[test]
fn state_root_ignores_insertion_order() {
    let item = unique_id("iron_sword", 42);
    let a = vec![
        (Key::Level, U256::from_u64(1)),
        (Key::Item(item), U256::from_u64(1)),
        (Key::Kek, U256::ZERO),
    ];
    let b = vec![
        (Key::Kek, U256::ZERO),
        (Key::Item(item), U256::from_u64(1)),
        (Key::Level, U256::from_u64(1)),
    ];
    assert_eq!(commit_entries(a), commit_entries(b));
}

#[test]
fn replay_stops_at_the_first_bad_hash() {
    let token = U256::from_u64(1);
    let spawn = Input::Spawn { token_id: token, starting_job: 3 };
    let mut engine = Engine::open(token, 3);
    let Outcome::Applied { entry_hash: first, .. } = engine.apply(spawn.clone()).unwrap();
    let second = entry_hash(&engine.head(), 1, &spawn);
    let mut bad = second;
    bad[31] ^= 0x01;

    let doc = lok_engine::LogDocument {
        token_id: token,
        starting_job: 3,
        entries: vec![
            lok_engine::LoggedEntry { hash: first, input: spawn.clone() },
            lok_engine::LoggedEntry { hash: bad, input: spawn.clone() },
            lok_engine::LoggedEntry { hash: [0u8; 32], input: spawn },
        ],
    };
    match replay(&doc).unwrap_err() {
        ReplayStop::BadHash { index, expected, computed } => {
            assert_eq!(index, 1, "must stop on the first bad link, not a later one");
            assert_eq!(expected, bad);
            assert_eq!(computed, second);
        }
        other => panic!("expected bad hash, got {other:?}"),
    }
}

#[test]
fn replay_cli_stops_at_the_first_bad_hash() {
    let token = U256::from_u64(1);
    let spawn = Input::Spawn { token_id: token, starting_job: 3 };
    let mut engine = Engine::open(token, 3);
    let Outcome::Applied { entry_hash, state_root, summary, .. } = engine.apply(spawn).unwrap();

    let good = serde_json::json!({
        "tokenId": "1",
        "startingJob": 3,
        "entries": [{
            "hash": format!("0x{}", hex::encode(entry_hash)),
            "input": { "type": "spawn", "tokenId": "1", "startingJob": 3 }
        }]
    });
    let good_path = std::env::temp_dir().join(format!("lok-good-{}.json", std::process::id()));
    std::fs::write(&good_path, good.to_string()).unwrap();
    let ok = Command::new(env!("CARGO_BIN_EXE_lok-replay"))
        .arg(&good_path)
        .output()
        .expect("run lok-replay");
    assert!(ok.status.success(), "stderr {}", String::from_utf8_lossy(&ok.stderr));
    let stdout = String::from_utf8(ok.stdout).unwrap();
    assert!(stdout.contains(&format!("0x{}", hex::encode(state_root))));
    assert!(stdout.contains(&summary.to_hex()));

    let bad_hash = {
        let mut h = entry_hash;
        h[0] ^= 0xff;
        format!("0x{}", hex::encode(h))
    };
    let bad = serde_json::json!({
        "tokenId": "1",
        "startingJob": 3,
        "entries": [{
            "hash": bad_hash,
            "input": { "type": "spawn", "tokenId": "1", "startingJob": 3 }
        }]
    });
    let bad_path = std::env::temp_dir().join(format!("lok-bad-{}.json", std::process::id()));
    std::fs::write(&bad_path, bad.to_string()).unwrap();
    let stopped = Command::new(env!("CARGO_BIN_EXE_lok-replay"))
        .arg(&bad_path)
        .output()
        .expect("run lok-replay");
    assert_eq!(stopped.status.code(), Some(1));
    let stderr = String::from_utf8(stopped.stderr).unwrap();
    assert!(stderr.contains("bad hash at index 0"), "{stderr}");
    let _ = parse_b256(GENESIS_ROOT);
    let _ = parse_log(&good.to_string());
}
