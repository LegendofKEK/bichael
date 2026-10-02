# Locked product decisions

These decisions are locked for the lok-log package. Contract logic is unchanged from the imported Foundry package.

- **KEK is deposit-only from Robinhood L2.** It is not earnable in-game. There is no faucet.
- **In-game transfers and the auction house are lok-engine log events, not contracts.** A transfer or bid moves only KEK or items the character already holds. There is no transfer tax and no auction fee. Listing an item escrows it so it cannot be transferred, exported, or listed again until cancel or settle.
- **Goal:** prove in-game events cheaply with an event-sourced rules engine and a hash-chained log. Items and KEK enter from Robinhood. Items can be minted out as NFTs (exports) and brought back (import).
- **Withdrawal delay:** the deploy default stays **24 hours** (`KEK_WITHDRAW_DELAY` in `script/Deploy.s.sol`). An admin may set it between 1 hour and 30 days (`MIN_WITHDRAW_DELAY` / `MAX_WITHDRAW_DELAY` on `KekVault`). Do not change that default or those bounds.
- **Known MVP limits** stay as the package README already states: no k-of-n signer threshold, no fraud proofs, no on-chain Merkle proof yet, and unique-item supply of 1 is not enforced in the items contract.

This directory is a standalone Foundry project. It is not a pnpm workspace package. The game (`apps/*`, `packages/*`) does not compile these Solidity files.