import { run } from "./_run.ts";
import { ownerDecisions724 } from "../chains/724/owner-decisions.ts";
await run(async () => {
  const r = await ownerDecisions724(undefined, { outPath: "owner-decisions-724.md" });
  console.log(`wrote owner-decisions-724.md with ${r.blanks} unfilled blanks`);
});
