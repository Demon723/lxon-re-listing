import { test } from "node:test";
import assert from "node:assert/strict";
import { measureHealth } from "../../../src/chains/724/health.ts";
import { fakeProvider } from "../../plants-724/_fake.mjs";

test("green when head fresh and p95 low", async () => {
  const now = 1_800_000_000;
  const p = fakeProvider({
    async blockNumber() { return 500n; },
    async getBlock(n) {
      const num = typeof n === "bigint" ? n : BigInt(n);
      // 5s block times, head 10s old
      return { number: num, timestamp: BigInt(now - 10 - Number(500n - num) * 5), hash: "0x" + "00".repeat(32) };
    },
  });
  const { health } = await measureHealth(p, { nowSec: now });
  assert.equal(health.status, "green");
  assert.equal(health.block_times_sec?.p50, 5);
});

test("red + exit 57 when head stale", async () => {
  const now = 1_800_000_000;
  const p = fakeProvider({
    async blockNumber() { return 500n; },
    async getBlock(n) {
      const num = typeof n === "bigint" ? n : BigInt(n);
      return { number: num, timestamp: BigInt(now - 7200 - Number(500n - num) * 5), hash: "0x" + "00".repeat(32) };
    },
  });
  await assert.rejects(measureHealth(p, { nowSec: now }), (e) => e.code === 57);
});
