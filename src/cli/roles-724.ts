import { run } from "./_run.ts";
import { measureRoles } from "../chains/724/roles.ts";
import { CFG } from "../chains/724/config.ts";
await run(async () => {
  const { inventory, artifactPath } = await measureRoles(undefined, { outDir: CFG.artifactsDir });
  console.log(JSON.stringify(inventory, null, 1));
  console.log(`artifact: ${artifactPath}`);
});
