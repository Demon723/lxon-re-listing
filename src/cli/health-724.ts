import { run } from "./_run.ts";
import { measureHealth } from "../chains/724/health.ts";
import { CFG } from "../chains/724/config.ts";
await run(async () => {
  const { health, artifactPath } = await measureHealth(undefined, { outDir: CFG.artifactsDir });
  console.log(JSON.stringify(health, null, 1));
  console.log(`artifact: ${artifactPath}`);
});
