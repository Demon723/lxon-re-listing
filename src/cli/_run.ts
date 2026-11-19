import { exitCodeOf } from "../shared/exit-codes.ts";
export async function run(fn: () => Promise<void>) {
  try { await fn(); }
  catch (e) {
    console.error(`EXIT ${exitCodeOf(e)}: ${(e as Error).message}`);
    process.exit(exitCodeOf(e));
  }
}
