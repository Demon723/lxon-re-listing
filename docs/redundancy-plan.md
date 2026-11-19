# Chain 724 redundancy plan (prepared, not executed — AWS spend decision)

Current: single EC2 (13.61.55.231) runs besu sealer + explorer-api +
write-gateway + caddy. Single-host failure = chain halt + infra loss.

## Option A — observer node (recommended, ~zero risk)
Second EC2 instance running besu in observer/full-node mode (no validator
key), syncing the same chain. Provides:
- RPC failover target for rpc.lxon.in
- Explorer data redundancy
- Does NOT affect QBFT consensus (observers don't seal)

Steps:
1. Launch t3.small (~$15/mo) in eu-north-1, open 30303/tcp
2. Install besu 26.10.0, copy /opt/lxon/besu/genesis.json (NO privatekey.txt,
   NO validator keys — observer only)
3. Add static-nodes or DNS discovery to peer with 13.61.55.231:30303
4. Wait for sync (~285k blocks, several hours)
5. Point a second Caddy site or DNS failover at it

## Option B — second sealing validator
Requires QBFT validator-set change = chain restart with new genesis.
NOT recommended — would discard current chain state (same failure mode
as the 2026-11-03 restart that caused GAP-724-2).

## Option C — managed backup
Periodic `besu export` / volume snapshot of /var/lib/docker/volumes/
lxon-evm-ft_besu-data to S3. Cheapest disaster recovery (~$1/mo storage).
Can be done without new instances.
