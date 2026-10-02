# Bellgrave — Time Mage MVP

Browser vertical slice: mock wallet → greybox palace hall → Time Mage combat vs Petrified Guard → potion "burn".

## Stack

- `apps/web` — React + Vite + R3F (fixed isometric camera, placeholder billboards)
- `apps/server` — Node WebSocket game loop @ 20 Hz
- `packages/combat` — TIM formulas + abilities
- `packages/protocol` — Zod client messages
- `packages/config` — shared constants

## Run

```bash
pnpm install
pnpm dev
```

- Web: http://localhost:5173
- Server: `ws://localhost:8787`

## Play loop

1. **Connect Wallet (Mock)** — stores a local `0xmvp…` id
2. **Create character** — pick appearance + job; claim starter kit
3. Campaign world (see `docs/world.md`):
   - **Pale Hollow** ↔ The Shard Dwellings → **Ashlands** ↔ Obsidia → **Slagpits** ↔ The Great Filter → **Bellmarsh** ↔ Belltower Keep → **Throne Approach** ↔ Citadel of KEK
   - Areas: mobs + harvest nodes · Cities: NPCs + quests · Craft while progressing
4. Clear the campaign, then replay with enemies scaled to your level
5. MVP combat slice still runs in Citadel hall vs Petrified Guard (keys **1–4**, etc.)

Potion use removes inventory (mock on-chain burn). Real ERC-4337 / Robinhood Chain lands in V1.

## Contracts (stub)

See `contracts/README.md`. MVP does not deploy; inventory is server-authoritative mock state.

The log-model Foundry package lives in `contracts/lok-log/` (not part of the pnpm workspace).

## License

This project is licensed under the GNU General Public License v3.0. See the [LICENSE](LICENSE) file for details.
