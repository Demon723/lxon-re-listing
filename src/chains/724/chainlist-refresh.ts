// TASK 8 — chainlist staleness (GAP-724-8). Compares registry height vs RPC head.
import { artifact, writeArtifact } from "../../shared/artifact.ts";
import { makeProvider } from "../../shared/provider.ts";
import { CFG } from "./config.ts";
import { writeFileSync, mkdirSync } from "node:fs";

export async function chainlistRefresh(opts: { outDir?: string; maxLag?: number } = {}) {
  const maxLag = opts.maxLag ?? Number(process.env.CHAINLIST_MAX_LAG ?? 1000);
  const p = await makeProvider(CFG.rpcUrl, CFG.expectedChainId);
  const head = await p.blockNumber();
  let registryHeight: number | "unmeasurable" = "unmeasurable";
  let note = "";
  try {
    const res = await fetch("https://chainid.network/chains.json", { signal: AbortSignal.timeout(20_000) });
    const chains = (await res.json()) as any[];
    const c = chains.find((x) => x.chainId === 724);
    if (c) {
      // chains.json carries no height field. Measure the head reported by the
      // registry-listed RPC for chain 724 and compare it to our RPC head.
      const rpc = Array.isArray(c.rpc) ? c.rpc.find((r: string) => typeof r === "string" && r.startsWith("https")) : undefined;
      if (rpc) {
        try {
          const rp = await makeProvider(rpc, CFG.expectedChainId);
          registryHeight = Number(await rp.blockNumber());
          note = `registry RPC ${rpc} head measured directly`;
        } catch (e) {
          registryHeight = "unmeasurable";
          note = `registry RPC ${rpc} unreachable: ${(e as Error).message}`;
        }
      } else {
        registryHeight = "unmeasurable";
        note = "chain 724 in registry but no https RPC listed";
      }
    } else {
      registryHeight = "unmeasurable";
      note = "chain 724 not found in chainid.network registry (PR ethereum-lists/chains#9107 pending)";
    }
  } catch (e) { note = `registry fetch failed: ${(e as Error).message}`; }
  const gap = registryHeight === "unmeasurable" ? "unmeasurable" : Number(head) - registryHeight;
  const stale = typeof gap === "number" && gap > maxLag;
  const outDir = opts.outDir ?? "artifacts";
  if (stale) {
    mkdirSync(outDir, { recursive: true });
    writeFileSync(`${outDir}/chainlist-refresh-request.md`, `# Chainlist refresh request — chain 724\n\n- registry height: ${registryHeight}\n- RPC head: ${head}\n- gap: ${gap} (> ${maxLag})\n- open issue at: https://github.com/ethereum-lists/chains/issues\n- fields: chainId 724, rpc ${CFG.rpcUrl}, head ${head}, timestamp ${new Date().toISOString()}, reachability evidence: eth_chainId=0x2d4 over HTTPS\n`);
  }
  const art = artifact("chainlist-refresh-724", { registryHeight, rpcHead: head.toString(), gap, maxLag, stale, note }, { rpcUrl: p.url });
  if (opts.outDir) writeArtifact(`${outDir}/chainlist-refresh-724.json`, art);
  return { registryHeight, rpcHead: head.toString(), gap, stale };
}
