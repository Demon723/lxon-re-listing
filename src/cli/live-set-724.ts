import { run } from "./_run.ts";
import { readLiveSet } from "../chains/724/live-set.ts";
import { CFG } from "../chains/724/config.ts";
await run(async () => {
  const r = await readLiveSet(undefined, { outDir: CFG.artifactsDir });
  if (!r.ok) { console.error(`EXIT ${r.code}: ${r.error}`); process.exit(r.code); }
  console.log(JSON.stringify({ live: r.live.addresses.length, retired: r.live.retired.length, block: r.live.block, artifacts: r.artifacts }, null, 1));
});
