# Owner decisions — chain 724 (2026-11-19T12:04:46.206Z, block 279189)

Measured by the re-listing toolchain. Every number below was read live at
block 279189 via https://rpc.lxon.in. These are measurements, not decisions — the four
sections each end with an unfilled owner blank.

## 1. Lane ceiling

Current: inbound(137, wLXON).cap = 0 (lane live=true)

Option A: no cap / Release payout needs no cap
Option A2: Mint payout requires cap > 0 and token bound to bridge
Option B: cap = current LXON totalSupply on 724
Option C: cap = <owner-named number>

[OWNER DECISION 1: Option A — no cap; keep Release payout. Rationale: Release is live and proven by the 2026-11-20 round trip (claims 0x4660e4fb/0xb5e43973); cap is only meaningful for Mint. Delegated by owner 'do whats best' 2026-11-20.]

## 2. Mint vs Escrow

Current: inbound(137, wLXON).payout = 1 (0=None,1=Release,2=Mint), payToken = 0x57b875ab86a40d79a1c35e44aa22008dfd049dc9

Option A: Mint on 137 against escrowed LXON on 724
Option B: Escrow on 137 against burned LXON on 724

[OWNER DECISION 2: Keep Release (Option A-side). Rationale: escrow-backed Release is the conservative choice — LXON remains locked in bridge escrow rather than minted against it; proven end-to-end. Delegated by owner 'do whats best' 2026-11-20.]

## 3. MINTER_ROLE holder

Current: timelock 0x6daf1b064c5602353e9dd770c263748753f7f98e holds MINTER_ROLE+BURNER_ROLE (granted post-measurement, verified on-chain); role hash 0x9f2df0fed2c77648de5860a4cc508cd0818c85b8b8a1ab4ceeef8d981c8956a6, source getter; positive control 0xd8e2146bbf2c1439de6a64a7ac620813e007c8d2 via ADMIN)

Option A: bridge contract
Option B: multisig
Option C: timelock

[OWNER DECISION 3: Option C — timelock 0x6daf1b064c5602353e9dd770c263748753f7f98e. Rationale: already holds MINTER_ROLE+BURNER_ROLE (txs 0x2cc6e131/0x072cb8ce), matches governance model, no further grant needed. Delegated by owner 'do whats best' 2026-11-20.]

## 4. Live window

Current: paused() = false, configSealed() = true, everUsed() = true

Option A: always live
Option B: specific blocks
Option C: manual toggle

[OWNER DECISION 4: Option A — always live. Rationale: chain is a settlement/display chain; pause() remains as emergency brake; config already sealed and everUsed. Delegated by owner 'do whats best' 2026-11-20.]
