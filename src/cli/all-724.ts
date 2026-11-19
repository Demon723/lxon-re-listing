import { run } from "./_run.ts";
import { execFileSync } from "node:child_process";
await run(async () => {
  const steps = ["verify-724"];
  for (const s of steps) {
    try {
      execFileSync("node", [`src/cli/${s}.ts`], { stdio: "inherit" });
    } catch (e) {
      const code = (e as { status?: number }).status ?? 1;
      console.error(`all-724: ${s} exited ${code}`);
      process.exit(code);
    }
  }
});
