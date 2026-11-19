# Chain 724 incident runbook

Eight failure modes. Each: symptom, first read-only command, decision tree,
owner action, rollback, prevention. Commands assume `RPC=https://rpc.lxon.in`
and `T=0x57b875ab86a40d79a1c35e44aa22008dfd049dc9` (LXON), `B=0xcd39954cd1484dd8c7277881f3a7d328a6940788` (bridge).

## 1. Head not advancing (miner silent)
- Symptom: `cast block-number --rpc-url $RPC` static across minutes; health status red (exit 57).
- First command: `cast block-number --rpc-url $RPC` twice, 60s apart.
- Tree: advancing→false alarm; static→check sealer container on host (`ssh … 'docker ps'`).
- Owner action: restart sealer only if process dead — miner restart is an owner decision, never automated.
- Rollback: n/a (read-only diagnosis first).
- Prevention: `make verify-724` health step; alert if last_block_age_sec > 300.

## 2. Blocks advancing but empty (mempool stale)
- Symptom: head advances, `eth_getBlockByNumber` shows 0 transactions for many blocks.
- First command: `cast rpc eth_getBlockByNumber latest false --rpc-url $RPC | jq .transactions`.
- Tree: empty is normal for a quiet chain; combined with pending txs → mempool issue on write RPC.
- Owner action: check write path (see write-path-724.json); public RPC is read-only by design.
- Rollback: none needed; informational.
- Prevention: write-path probe in mainnet-ready check.

## 3. Nonce gap (txs queued, not mined)
- Symptom: signed tx never appears; `eth_getTransactionCount` pending > latest.
- First command: `cast rpc eth_getTransactionCount <addr> pending --rpc-url $RPC`.
- Tree: pending>latest → tx stuck in mempool; resubmit with higher gas only via write path.
- Owner action: none on public RPC (read-only); use tunnel `ssh -L 8545:127.0.0.1:8545` for ops.
- Rollback: cancel by sending 0-value self-tx with same nonce via write path.
- Prevention: none automated; document in ops notes.

## 4. RPC returns 403 (provider tenant disabled)
- Symptom: HTTP 403 / "tenant disabled" from rpc.lxon.in or polygon-rpc.com.
- First command: `curl -s https://rpc.lxon.in -H 'content-type: application/json' -d '{"jsonrpc":"2.0","method":"eth_chainId","params":[],"id":1}'`.
- Tree: 403 on lxon.in → Caddy/gateway issue on host; 403 on publicnode → provider-side, switch RPC env (`LXON_RPC_724`, `LXON_RPC_137`).
- Owner action: host ops for lxon.in; config change for providers.
- Rollback: revert env to previous working RPC.
- Prevention: provider fallback list in config; CI uses fixtures when LXON_RPC unset.

## 5. RPC returns wrong chain ID (proxy misconfigured)
- Symptom: provider exits 20 "chainId mismatch: got 0x…".
- First command: `cast chain-id --rpc-url $RPC`.
- Tree: wrong ID → wrong upstream behind proxy; do NOT run any writes.
- Owner action: fix Caddy/gateway upstream on host.
- Rollback: point config back to verified endpoint.
- Prevention: provider asserts chainId on every run (already enforced, exit 20).

## 6. Explorer shows block RPC does not (desync)
- Symptom: explorer-724.json lag_blocks large or negative.
- First command: `curl -s "https://explorer.lxon.in/api?module=block&action=eth_block_number"` vs `cast block-number`.
- Tree: lag>100 → explorer-api shim caching? It proxies live besu — restart `explorer-api.service` on host.
- Owner action: `sudo systemctl restart explorer-api` on host.
- Rollback: n/a, read-only shim.
- Prevention: explorer probe in verify-724 (exit recorded, not fatal).

## 7. Bridge escrow drift (balance != recorded escrow)
- Symptom: reconciliation-724.json residual != 0 (exit 55).
- First command: `node src/cli/reconcile-724.ts` — read all four line items.
- Tree: residual small → rounding; large → investigate mint/burn/bridge flows via logs.
- Owner action: owner decision on supply semantics; do not edit records by hand.
- Rollback: none — measurement only.
- Prevention: reconciliation in every verify run.

## 8. Pre-restart address returns code (restart reverted)
- Symptom: retired-addresses-724.json entries show code_size > 0.
- First command: `node src/cli/live-set-724.ts` — re-prove at pinned block.
- Tree: code present → chain state changed unexpectedly; STOP all writes, escalate.
- Owner action: forensic review; possible re-restart decision (owner only).
- Rollback: none automated.
- Prevention: live-set check every verify; deployment JSON divergence = exit 53.

## Known gaps (2026-11-20 audit)

- **Write RPC has no rate limit or auth.** `explorer.lxon.in/write-rpc` proxies POSTs to besu 8545 (localhost-only). Caddy 2.6.2 stock has no rate_limit module; spam/abuse resistance needs a small throttling proxy (e.g. extend rpc-gateway.py with a token bucket for eth_sendRawTransaction). Until then the endpoint is open — acceptable for a settlement chain, flagged for mainnet hardening.
- **Attestor quorum keys — partially distributed.** Copies of all three validator keys now exist on two independent hosts: operator machine (`lxon-evm-node/besu/validators/*.hex`) and the 724 EC2 (`/opt/lxon/keystores/validators/`, mode 600, dir 700). Still centralized in practice — both copies are operator-controlled; true distribution needs keys on hosts the operator doesn't fully control.
- **Reconciliation residual -1 LXON.** The releasedToUsers term (`totalReceivedFrom[137][wLXON]`) overcounts by exactly the smoke-test round trip (self-referential mint+burn). Within 0.01% tolerance; needs per-epoch flow netting to zero exactly.

## Update 2026-11-20 — write RPC rate limit deployed

`write-gateway.service` (python, /opt/lxon/write-gateway.py, repo copy: host/write-gateway.py)
now fronts besu on 127.0.0.1:8547; Caddy write-rpc proxies to it. Per-IP token bucket:
30 write-method calls/min (eth_sendRawTransaction, eth_sign*, personal_*, admin_/debug_/miner_/txpool_);
reads unthrottled. Client IP taken from X-Forwarded-For (set by Caddy). Verified live.
