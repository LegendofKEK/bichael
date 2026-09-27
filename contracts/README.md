# Bellgrave contracts (post-MVP)

MVP inventory and potion burns are **mock** (server-side inventory decrement).

Planned V1 surface (Robinhood Chain, ERC-4337):

| Contract | Role |
| --- | --- |
| `BellgraveItems` | ERC-1155 gear + consumables |
| `BellgraveBurnRelay` | Account-abstraction friendly consumable burn |
| `BellgraveMarketplace` | Escrow buy/sell (equip stays offchain) |

Do not implement here until Alchemy/AA keys and chain RPC are wired in `apps/web`.
