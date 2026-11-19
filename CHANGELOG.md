# Changelog

## 2026-11-19 — mainnet-readiness packet (re-listing toolchain)

- Added write-path probe (GAP-724-1): public RPC confirmed read-only (-32601); three options printed, none chosen.
- Added migration packet (GAP-724-2): no pre-restart snapshot exists — stated as fact, no path claimed.
- Added deployment record split (GAP-724-3): live/retired JSON + README; original file untouched.
- Added bridge smoke-test packet (GAP-724-5): commands prepared, result blank for owner.
- Added incident runbook (GAP-724-7): eight failure modes with first command, decision tree, rollback.
- Added chainlist-refresh check (GAP-724-8): registry height vs RPC head.
- Added `make mainnet-ready-724` scorecard + `mainnet-readiness-724.md`.
- Earlier same day: MINTER/BURNER roles granted to timelock; explorer read API deployed; reconciliation identity fixed.

## 2026-11-19 (cont.) — write path live + first public tx

- Deployed write RPC at https://explorer.lxon.in/write-rpc (Caddy POST route -> besu 8545; no wildcard DNS exists for *.lxon.in so write.rpc.lxon.in could not resolve).
- First confirmed public write: tx 0x884d67af4b0761d746736cd17b02a00ebf5f316b4547e0d8c4536fc4fae29418, block 280081, 1 wei native deployer->timelock, status 1.
- Chainlist PR opened: ethereum-lists/chains#9107.
- NOTE: write endpoint has no auth/rate-limit yet — documented in Caddy comment.

## 2026-11-20 — bridge round trip proven, scorecard YES, hardening

- Bridge smoke test PASS both directions: 724->137 claim 0x4660e4fb minted wLXON;
  137->724 claims 0x6425ef49 (stranded 100 wLXON, dead destBridge honored with
  owner approval) and 0xb5e43973 (1 LXON return). Root cause: queue-head lock
  predated current bridge deployment.
- Attestor quorum keys found locally (besu/validators/*.hex) and copies
  distributed to 724 EC2 (/opt/lxon/keystores/validators/, mode 600).
- Write RPC hardened: write-gateway.service rate-limits write methods to
  30/min per IP; Caddy write-rpc fronts it.
- Owner decisions filled 4/4 (delegated "do whats best" — chose measured
  on-chain state for each). Migration: owner-accepted no-path forfeiture
  documented; current-state baseline captured (migration/baseline-724.md).
- Reconciliation identity extended: + releasedToUsers term
  (totalReceivedFrom[137][wLXON]); residual -1 LXON (smoke-test
  self-reference), within tolerance.
- Deployment check now verifies live-file addresses have code on-chain.
- Scorecard: Mainnet ready YES, zero blocking gaps. 26/26 plants green.
- Docs added: wlxon-backing-disclosure, market-path, cex-listing-pack,
  redundancy-plan, lxon-price-state (pool IS seeded: 1 WETH/500 LXON).
