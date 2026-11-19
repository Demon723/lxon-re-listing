import { run } from "./_run.ts";
import { prepareVerification724 } from "../chains/724/verification.ts";
await run(async () => {
  const { inputs, artifactPath } = await prepareVerification724(undefined, { outDir: "verification-input/724/canonical" });
  console.log(`wrote ${inputs.length} verification inputs`);
  console.log(`artifact: ${artifactPath}`);
});
