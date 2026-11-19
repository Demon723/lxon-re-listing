# Chain 724 health runbook

What each exit code means, what to do, and whether it needs an owner
decision or node operation. Generated alongside the toolchain; keep in sync
with `src/shared/exit-codes.ts` and the README table.

## Exit codes

| code | name | what it means | what to do | owner or node? |
|---|---|---|---|---|
| 10 | RPC_UNREACHABLE | `rpc.lxon.in` did not answer or returned HTTP error | check the besu-rpc node and nginx/TLS on the host; the sealer is loopback-only by design | node operation |
| 11 | RPC_TLS | certificate validation failed | renew/check the TLS cert on rpc.lxon.in | node operation |
| 20 | RPC_PROTOCOL | http:// URL, raw-IP URL, DNS failure, or chainId ≠ 724 — message names which | fix the URL in config/env; never point at `http://13.16.177.64:8546`-style endpoints | config |
| 24 | DEPLOYMENT_MISMATCH | deployment JSON and live set disagree on an address with code | re-derive the live set from the provenance bundle; do not edit the deployment JSON by hand | owner + node |
| 50 | CHAIN_NOT_PRODUCING | (reserved for health-module use) | — | — |
| 51 | EXPLORER_UNREACHABLE | explorer probe could not measure | explorer.lxon.in serves a static page with no Blockscout API — `unmeasurable` is the honest state until a real explorer API exists | node operation (deploy explorer) or owner (accept unmeasurable) |
| 52 | CHAINLIST_PRECONDITION_FAILED | chainlist entry refused; artifact names the failing field | fix the named field (health red, explorer lag, RPC, or token metadata) and re-run | whichever field failed |
| 53 | DEPLOYMENT_JSON_DIVERGES | deployment JSON bridge has code but is absent from the provenance live set | regenerate the provenance bundle on the node, then re-run live-set | node operation |
| 54 | ROLE_PROBE_REFUSED | no (role,address) returned true for any role — probe broken or roles unassigned | verify `hasRole` selector and candidate list; if truly unassigned, owner must assign MINTER_ROLE | owner decision |
| 55 | SUPPLY_RECONCILIATION_FAILED | `724_supply − validatorStake ≠ wLXON_137_supply` beyond 0.01% | read `reconciliation-724.json`: the 30,000 LXON validator stake in `bridgeBalance − bridgeEscrow` is NOT backing; if the residual is real supply drift, investigate mints/burns/bridge flows | owner decision (supply semantics) |
| 56 | BLOCK_TIME_REGRESSION | sampled block timestamps went backwards | QBFT/Besu clock or reorg anomaly — inspect the named block pair on the node | node operation |
| 57 | MINER_SILENT | health red: head older than AMBER_MAX_AGE (default 1800s) or no advancing sample | check the sealer/miner process on the host; the chain producing ~5s blocks should never be this stale | node operation |

## The four health inputs (GAP-724-C)

`health-724.json` records: head, head timestamp, blocks sampled, block-time
distribution (p50/p95/max), `produces_blocks`, `last_block_age_sec`,
`non_adjacent_sample`, status, reasons.

- **green**: head advanced within `GREEN_MAX_AGE` (300s), p95 block time under
  `GREEN_P95` (30s), ≥ `MIN_SAMPLE` (10) blocks sampled, no unmeasurable inputs.
- **amber**: head advanced within `AMBER_MAX_AGE` (1800s) but outside green.
- **red**: head older than AMBER_MAX_AGE, or sample insufficient with no head
  advance → exit 57.
- **unmeasurable is never coerced to green.**

## Owner decisions vs node operations

- **Owner decisions** (never automated): the four `[OWNER DECISION]` blanks in
  `owner-decisions-724.md` — lane ceiling, mint-vs-escrow, MINTER_ROLE holder,
  live window. Also: whether `unmeasurable` explorer is acceptable for
  chainlist, and the supply semantics behind exit 55.
- **Node operations** (SSH to the besu host): RPC/TLS health, miner/sealer
  silence, provenance bundle regeneration, explorer deployment.
- **This toolchain never**: restarts the miner, reconfigures Geth/Besu,
  redeploys contracts, funds accounts, fills owner blanks, or registers on
  chainlist before health + explorer preconditions pass.
