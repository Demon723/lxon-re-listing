import { run } from "./_run.ts";
import { prepareChainlistEntry } from "../chains/724/chainlist.ts";
import { measureHealth } from "../chains/724/health.ts";
import { probeExplorer } from "../chains/724/explorer.ts";
import { makeProvider } from "../shared/provider.ts";
import { CFG } from "../chains/724/config.ts";
import { exitCodeOf } from "../shared/exit-codes.ts";
await run(async () => {
  const p = await makeProvider(CFG.rpcUrl, CFG.expectedChainId);
  const { health } = await measureHealth(p);
  const { status: ex } = await probeExplorer({});
  const r = await prepareChainlistEntry({ outDir: CFG.artifactsDir, health, explorer: ex, provider: p });
  if (!r.entry) {
    console.error(`REFUSED exit ${r.refused?.code}: ${r.refused?.reason}`);
    process.exit(r.refused?.code ?? 52);
  }
  console.log(JSON.stringify(r.entry.content, null, 1));
  console.log(`artifact: ${r.artifactPath}`);
});
