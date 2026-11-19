import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { readLiveSet } from "../../../src/chains/724/live-set.ts";
import { fakeProvider } from "../../plants-724/_fake.mjs";

test("live set splits live vs retired by code size", async () => {
  const dir = mkdtempSync(join(tmpdir(), "ls-"));
  const dep = join(dir, "dep.json");
  writeFileSync(dep, JSON.stringify({ contracts: {} }));
  const bundleUrl = "data:application/json," + encodeURIComponent(JSON.stringify({
    chainId: 724,
    contracts: [
      { address: "0x1111111111111111111111111111111111111111", role: "A", codeBytes: 10 },
      { address: "0x2222222222222222222222222222222222222222", role: "B", codeBytes: 0 },
    ],
  }));
  const p = fakeProvider({
    async blockNumber() { return 42n; },
    async getCode(addr: string) {
      return addr.toLowerCase().startsWith("0x1111") ? "0x6001" : "0x";
    },
  });
  const r = await readLiveSet(p as never, { bundleUrl, deploymentJson: dep, outDir: dir });
  assert.equal(r.ok, true);
  if (r.ok) {
    assert.equal(r.live.addresses.length, 1);
    assert.equal(r.live.retired.length, 1);
    assert.equal(r.live.block, "42");
  }
});
