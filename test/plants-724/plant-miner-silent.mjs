// Head far older than AMBER_MAX_AGE → health red → exit 57.
import { measureHealth } from "../../src/chains/724/health.ts";
import { fakeProvider, expectExit } from "./_fake.mjs";
const now = 1_800_000_000;
const p = fakeProvider({
  async blockNumber() { return 500n; },
  async getBlock(n) {
    const num = typeof n === "bigint" ? n : BigInt(n);
    // head timestamp is 2h old; sampled blocks spaced normally
    const age = num === 500n ? 7200 : 7200 + Number(500n - num) * 5;
    return { number: num, timestamp: BigInt(now - age), hash: "0x" + "00".repeat(32) };
  },
});
await expectExit(measureHealth(p, { nowSec: now }), 57, "miner_silent");
