import { run } from "./_run.ts";
import { reconcileSupply } from "../chains/724/reconciliation.ts";
import { CFG } from "../chains/724/config.ts";
await run(async () => {
  const { rec, artifactPath } = await reconcileSupply(undefined, undefined, { outDir: CFG.artifactsDir });
  console.log(JSON.stringify(rec, null, 1));
  console.log(`artifact: ${artifactPath}`);
});
