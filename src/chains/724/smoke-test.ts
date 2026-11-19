// TASK 5 — bridge smoke test packet (GAP-724-5). Prepares commands; owner runs.
import { writeFileSync, mkdirSync, existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { Provider } from "../../shared/provider.ts";
import { makeProvider } from "../../shared/provider.ts";
import { callData, decodeUint } from "../../shared/abi.ts";
import { CFG } from "./config.ts";

export async function smokeTest724(provider?: Provider, opts: { outPath?: string } = {}) {
  const p = provider ?? (await makeProvider(CFG.rpcUrl, CFG.expectedChainId));
  const head = await p.blockNumber(); const tag = "0x" + head.toString(16);
  // minTransferAmount may not exist; measure common candidates
  let minAmt = "unmeasured";
  for (const sig of ["minTransferAmount()", "minAmount()"]) {
    try {
      const r = await p.call(CFG.bridgeV41, callData(sig), tag);
      if (r !== "0x") { minAmt = decodeUint(r).toString(); break; }
    } catch {}
  }
  const md = `# Bridge smoke test — chain 724 (prepared ${new Date().toISOString()}, block ${head})

STATUS: UNPROVEN — the bridge write path has never moved a token on the live chain.
This packet prepares commands; the owner signs and records the result.
minTransferAmount measured: ${minAmt}

## 724 -> 137
\`\`\`
cast send ${CFG.bridgeV41} 'lock(address,uint256,bytes)' <LXON_724> ${minAmt !== "unmeasured" ? minAmt : "1000000000000000000"} 0x --rpc-url <WRITE_RPC_724> --keystore <DEPLOYER_KEY>
\`\`\`
Expected: Lock event on 724; after attestor claim, wLXON minted on 137.
Verify: balanceOf(<you>) on 0x7A3c0C34f157EfDD3E4913c5224C15E645469093 (137).
Rollback if destination does not credit: document tx hash, do NOT retry blindly — check attestor threshold (2-of-3) and lane liveness first.

## 137 -> 724
\`\`\`
cast send <137_BRIDGE> 'lock(address,uint256,bytes)' 0x7A3c0C34f157EfDD3E4913c5224C15E645469093 ${minAmt !== "unmeasured" ? minAmt : "1000000000000000000"} 0x --rpc-url <POLYGON_RPC> --keystore <P137_KEY>
\`\`\`
Expected: escrowed(LXON) on 724 increases after claim.
Verify: cast call ${CFG.bridgeV41} 'escrowed(address)(uint256)' ${CFG.lxonToken}.

[SMOKE TEST RESULT: ______]
`;
  const out = opts.outPath ?? "smoke-test-724.md";
  if (existsSync(out) && /SMOKE TEST RESULT: (?!______)/.test(readFileSync(out, "utf8"))) {
    return { minAmount: minAmt, path: out, preserved: true };
  }
  mkdirSync(join(out, ".."), { recursive: true });
  writeFileSync(out, md);
  return { minAmount: minAmt, path: out };
}
