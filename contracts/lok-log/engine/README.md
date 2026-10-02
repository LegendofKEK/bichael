# lok-engine

First slice of the Bellgrave lok engine. It sits next to `contracts/lok-log` and must reproduce the golden vectors pinned in `test/Golden.t.sol` and recomputed by `test/golden/verify.mjs`.

This slice does **not** implement the economy, the KEK vault, item import/export, or any game-server or client integration. KEK is deposit-only from Robinhood L2 (not earnable). The in-game counter key exists so later deposits have a place to land; nothing in this slice credits it.

## What is implemented

1. **State and events.** Character state is a `BTreeMap` so commitment order is sorted, not insertion order. `Input` / `Outcome` are the apply types. The only input is `Spawn`.
2. **Canonical encoding.** `abi.encode` word layout (32-byte big-endian, dynamic tail offset) and `abi.encodePacked` for item ids, hashed with keccak256. Same rules the contracts use.
3. **Genesis, then Spawn.** `genesis_root(tokenId, startingJob) = keccak256(abi.encode(GENESIS_TAG, tokenId, startingJob))` with `GENESIS_TAG = keccak256("LOK_GENESIS_V1")`. That anchor is the chain head before any events. `Spawn` is the first log event and fills the sheet the contract's `initCharacter` summary describes: level 1, the starting job, no subjob, location 0.
4. **Hash-chained log.** Entry `i` hashes as `keccak256(abi.encode(prev, index, eventId))`. `prev` for index 0 is the genesis root. `lok-replay` replays a JSON log and **stops at the first bad hash** (exit 1) without applying that event or anything after it.

## State root

Leaves are `keccak256(abi.encode(uint8 tag, uint256 keyData, uint256 value))` in `BTreeMap` order. The root is a binary Merkle tree of those leaves: pair with `keccak256(left || right)`, duplicate the last leaf when a level is odd. An empty map hashes to `keccak256("")`. The genesis anchor is **not** this root; it is the pre-Spawn commitment the contract stores in `stateRoot`.

Summary bits match `CharacterCheckpoint`: `level(16) | job(8) << 16 | subjob(8) << 24 | jobXp(32) << 32 | subjobXp(32) << 64 | location(16) << 96 | unspentPoints(16) << 112`.

## Checkpoint body

`checkpoint_body_hash` is `keccak256(abi.encode(Checkpoint))` for the struct in `CharacterCheckpoint.sol`, including the `exports` tail. EIP-712 digest helper uses domain name `CharacterCheckpoint`, version `1`.

## Replay log

```json
{
  "tokenId": "1",
  "startingJob": 3,
  "entries": [
    {
      "hash": "0x…",
      "input": { "type": "spawn", "tokenId": "1", "startingJob": 3 }
    }
  ]
}
```

```
lok-replay log.json
```

Exit 0 prints the head, state root, and summary. Exit 1 is a bad hash. Exit 2 is a parse error or a rejected input (after its hash checked out).

## Tests

`cargo test` fails if the genesis root, item ids (`iron_sword` / 42 and `iron_ore`), or checkpoint body hash drift from the Solidity pins. The digest from `verify.mjs` is pinned too (chain id 31337, verifying contract `0x5991A2dF15A8F6A256D3Ec51E99254Cd3fb576A9`).

## Left for the next slice

Ruleset evaluation, XP / abilities / equipment inputs, item import and export, KEK deposit application (still not earnable), checkpoint segment assembly against a published log, and Merkle proofs for the state root. No server wiring.
