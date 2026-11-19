# Bridge smoke test — chain 724 (prepared 2026-11-19T19:44:20.718Z, block 284704)

STATUS: UNPROVEN — the bridge write path has never moved a token on the live chain.
This packet prepares commands; the owner signs and records the result.
minTransferAmount measured: unmeasured

## 724 -> 137
```
cast send 0xcd39954cd1484dd8c7277881f3a7d328a6940788 'lock(address,uint256,bytes)' <LXON_724> 1000000000000000000 0x --rpc-url <WRITE_RPC_724> --keystore <DEPLOYER_KEY>
```
Expected: Lock event on 724; after attestor claim, wLXON minted on 137.
Verify: balanceOf(<you>) on 0x7A3c0C34f157EfDD3E4913c5224C15E645469093 (137).
Rollback if destination does not credit: document tx hash, do NOT retry blindly — check attestor threshold (2-of-3) and lane liveness first.

## 137 -> 724
```
cast send <137_BRIDGE> 'lock(address,uint256,bytes)' 0x7A3c0C34f157EfDD3E4913c5224C15E645469093 1000000000000000000 0x --rpc-url <POLYGON_RPC> --keystore <P137_KEY>
```
Expected: escrowed(LXON) on 724 increases after claim.
Verify: cast call 0xcd39954cd1484dd8c7277881f3a7d328a6940788 'escrowed(address)(uint256)' 0x57b875ab86a40d79a1c35e44aa22008dfd049dc9.

[SMOKE TEST RESULT: ______]

## Execution record (agent-executed 2026-11-19/20)

Forward 724->137: approve 0x4aa5b3cc..., lock 0x8969ccec..., attest 2-of-3,
claim on 137 0x4660e4fb79fa193157f537a7ca01796475e54824444feb9531deb2150a788585 — wLXON minted.
137->724: lock 0x17b4231dc63a931eb8e93bbbdf7f7c0a61a507503a70c64e8970dfba9d21d30e (claimId 0x941883b0...).
Queue head was stranded nonce-1 lock 0x0ba4b1be... (100 wLXON, dead destBridge 0x9B15fEe9);
honored on current bridge with owner approval: claim 0x6425ef49c23037c950da09db9a874bc908e38df3ec0a283c2cdf03d29d1694e0.
Our return claim: 0xb5e439731d7cb4986df2a1e5f9173e50e037c768e5b24d7a55859252eb4fb7cc — 1 LXON released.

[SMOKE TEST RESULT: PASS — round trip proven both directions, tx hashes above]
