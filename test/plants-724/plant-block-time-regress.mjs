// A block whose timestamp regresses must exit 56 naming the pair.
import { measureHealth } from "../../src/chains/724/health.ts";
import { fakeProvider, expectExit } from "./_fake.mjs";
// sampled ascending: 991..1000; give block 999 a timestamp below block 998's
const p = fakeProvider({
  async blockNumber() { return 1000n; },
  async getBlock(n) {
    const num = typeof n === "bigint" ? n : BigInt(n);
    const ts = num === 999n ? 5n : num * 10n;
    return { number: num, timestamp: ts, hash: "0x" + "00".repeat(32) };
  },
});
await expectExit(measureHealth(p, { nowSec: 20000 }), 56, "block_time_regress");
