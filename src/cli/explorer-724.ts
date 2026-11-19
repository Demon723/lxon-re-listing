import { run } from "./_run.ts";
import { probeExplorer } from "../chains/724/explorer.ts";
import { CFG } from "../chains/724/config.ts";
await run(async () => {
  const { status, artifactPath } = await probeExplorer({ outDir: CFG.artifactsDir });
  console.log(JSON.stringify(status, null, 1));
  console.log(`artifact: ${artifactPath}`);
});
