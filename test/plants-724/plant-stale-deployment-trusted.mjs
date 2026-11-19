// A deployment JSON whose bridge address has live code but is absent from the
// provenance bundle must exit 53 (DEPLOYMENT_JSON_DIVERGES), not be trusted.
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { readLiveSet } from "../../src/chains/724/live-set.ts";
import { fakeProvider, expectExit } from "./_fake.mjs";

const dir = mkdtempSync(join(tmpdir(), "plant-stale-"));
const bundlePath = join(dir, "bundle.json");
writeFileSync(bundlePath, JSON.stringify({
  chainId: 724,
  contracts: [{ address: "0x1111111111111111111111111111111111111111", role: "LXON", codeBytes: 100 }],
}));
const depPath = join(dir, "dep.json");
writeFileSync(depPath, JSON.stringify({ contracts: { LXONBridgeEnhanced: "0x2222222222222222222222222222222222222222" } }));

// Provider: blockNumber ok; getCode returns code for 0x2222 (has code, not in bundle), 0x for 0x1111? give it code too.
const p = fakeProvider({
  async blockNumber() { return 100n; },
  async getCode(addr) {
    return addr.toLowerCase() === "0x2222222222222222222222222222222222222222" ? "0x6001" : "0x6000";
  },
});
// Need an HTTP server for bundleUrl? readLiveSet fetches bundleUrl — use data: URL.
const bundleDataUrl = "data:application/json," + encodeURIComponent(JSON.stringify({
  chainId: 724,
  contracts: [{ address: "0x1111111111111111111111111111111111111111", role: "LXON", codeBytes: 100 }],
}));
await expectExit(readLiveSet(p, { bundleUrl: bundleDataUrl, deploymentJson: depPath, outDir: dir }).then(r => {
  if (r.ok) { const e = new Error("live-set succeeded, expected refusal"); e.code = 0; throw e; }
  const e = new Error(r.error); e.code = r.code; throw e;
}), 53, "stale_deployment_trusted");
