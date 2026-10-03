# lok-engine

First slice of the Bellgrave lok engine. It sits next to `contracts/lok-log` and must reproduce the golden vectors pinned in `test/Golden.t.sol` and recomputed by `test/golden/verify.mjs`.

KEK is deposit-only from Robinhood L2 (not earnable). `DepositKek` credits KEK already in the vault; it is not a mint. Transfers, bids, and settlement move balances the character already holds. No transfer tax and no auction fee are specified, so amounts move flat. The game server loads this crate as wasm (`pkg/lok_engine.wasm`) and appends a persisted world log. The client exchange sits on the Provisioner.

## What is implemented

1. **State and events.** Character state is a `BTreeMap` so commitment order is sorted, not insertion order. `Input` / `Outcome` are the apply types. A single-character log still only applies `Spawn`. Transfers and the auction house are world-log events.
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

## World log

`World` is the API a later server calls. It does not talk to the game server or the chain.

| Call | Event |
|---|---|
| `append_spawn` | `spawn` |
| `append_deposit_kek` | `depositKek` (vault deposit already happened; not a mint) |
| `append_import_item` | `importItem` |
| `append_export_item` | `exportItem` (spendable balance only) |
| `append_send_item` | `sendItem` |
| `append_send_kek` | `sendKek` |
| `append_list` | `list` |
| `append_bid` | `bid` |
| `append_cancel` | `cancel` |
| `append_settle` | `settle` |

Reads: `kek_balance`, `item_balance`, `listing`, `listings`. `apply` is the same append path with an `Input`.

Listing escrows the item out of the seller's spendable balance, so that quantity cannot be transferred, exported, or listed again. A bid escrows that much KEK. A strictly higher bid unlocks the previous bid first. Cancel is seller-only: the item returns and the high bid unlocks. Settle pays the seller the high bid and gives the item to the winner, with nothing left in escrow. Sender and recipient must already be spawned. Sending to yourself fails. A short balance fails closed and is not appended.

The world chain head starts at `keccak256("LOK_WORLD_V1")`, not a character genesis root. `lok-replay` of a document with `"type": "world"` replays that chain and still stops at the first bad hash (exit 1) before applying it or anything after it.

```json
{
  "type": "world",
  "entries": [
    { "hash": "0x…", "input": { "type": "spawn", "tokenId": "1", "startingJob": 3 } },
    { "hash": "0x…", "input": { "type": "sendKek", "from": "1", "to": "2", "amount": "4" } }
  ]
}
```

## Left for the next slice

Ruleset evaluation, XP / abilities / equipment inputs, checkpoint segment assembly against a published log, Merkle proofs for the state root, and watching `KekVault` before appending `depositKek`. The server can append `depositKek` / `exportItem`, but it does not follow Robinhood L2 unless `LOK_CHAIN_RPC` is set, and even then it does not submit or index chain transactions yet.
