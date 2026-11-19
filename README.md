# re-listing — LXON re-listing measurement toolchain

Zero-dependency Node >= 22.18 toolchain (`.ts` sources run via native type
stripping; no build step, no npm install). Every measurement reads live chain
state through `https://rpc.lxon.in` (chain 724) and
`https://polygon-bor-rpc.publicnode.com` (chain 137), records `rpcUrl` +
`blockTag` provenance, and writes JSON artifacts under `artifacts/`.

## Commands

| command | what it does |
|---|---|
| `make verify-724` | full measurement pass: live set, health, roles, reconciliation, explorer, chainlist gate, verification inputs, owner decisions |
| `node src/cli/health-724.ts` | block-production health only |
| `node src/cli/roles-724.ts` | MINTER/BURNER/ADMIN role inventory |
| `node src/cli/reconcile-724.ts` | 724↔137 supply reconciliation |
| `node src/cli/explorer-724.ts` | explorer API probe |
| `node src/cli/live-set-724.ts` | provenance-bundle live set |
| `node src/cli/chainlist-724.ts` | PR-ready eip155-724.json (precondition-gated) |
| `node src/cli/verify-input-724.ts` | CBOR metadata digests |
| `node src/cli/owner-decisions-724.ts` | regenerate owner-decisions-724.md |
| `make plants-724` | run the ten fault-injection plants |
| `make test` | node:test unit specs under test/chains/ |
| `make all-724` | verify-724 + plants-724 |

## Exit codes

| code | name | meaning | response |
|---|---|---|---|
| 0 | OK | measurement completed |
| 1 | USAGE | bad invocation |
| 2 | INTERNAL | unexpected error |
| 10 | RPC_UNREACHABLE | RPC did not answer / HTTP error |
| 11 | RPC_TLS | TLS validation failed |
| 12 | (reserved) | — |
| 13 | (reserved) | chainId mismatch is reported under 20 per spec |
| 20 | RPC_PROTOCOL | http:// URL, raw-IP URL, DNS failure, or chainId ≠ expected — the message names which |
| 24 | DEPLOYMENT_MISMATCH | deployment JSON diverges from live set with live code |
| 50 | CHAIN_NOT_PRODUCING | (reserved) |
| 51 | EXPLORER_UNREACHABLE | explorer probe could not measure (reported as `unmeasurable`, not an exit in artifacts) |
| 52 | CHAINLIST_PRECONDITION_FAILED | chainlist entry refused; artifact records the failing field |
| 53 | DEPLOYMENT_JSON_DIVERGES | bridge address in deployment JSON has code but is absent from the live set |
| 54 | ROLE_PROBE_REFUSED | no (role,address) pair returned true — probe may be broken or roles unassigned; owner decision required |
| 55 | SUPPLY_RECONCILIATION_FAILED | 724 supply − validator stake ≠ 137 wLXON supply beyond 0.01% |
| 56 | BLOCK_TIME_REGRESSION | a sampled block timestamp went backwards; artifact names the pair |
| 57 | MINER_SILENT | health status red — head older than AMBER_MAX_AGE or insufficient advancing sample |

"Unmeasurable" is never coerced to green, zero, or false.

## Owner decisions

`owner-decisions-724.md` is generated with four measured-state sections and
four literal `[OWNER DECISION N: ______]` blanks. The toolchain never fills
them; `make verify` passes with blanks present because measuring the state is
what makes the decision possible. A test asserts exactly four markers and zero
filled values.

## What mainnet-ready means for 724

`make mainnet-ready-724` produces `mainnet-readiness-724.md` — a 12-row scorecard.
Verdicts are pass / fail / **unmeasurable**; unmeasurable never counts as pass.
The chain reaches **BLOCKED BY OWNER** when every technical gap is closed and
only the four `[OWNER DECISION]` blanks (plus owner-run actions: write-path
choice, migration snapshot, bridge smoke test) remain. It cannot reach YES
without the owner — that is the intended ceiling for an agent-driven run.
