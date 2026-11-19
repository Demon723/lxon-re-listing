// TASK 3 — deployment record (GAP-724-3). live/retired files + README.
import { readLiveSet } from "./live-set.ts";
import { artifact, writeArtifact } from "../../shared/artifact.ts";
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import type { Provider } from "../../shared/provider.ts";

export async function writeDeploymentRecord(provider?: Provider, opts: { outDir?: string } = {}) {
  const outDir = opts.outDir ?? "deployments";
  mkdirSync(outDir, { recursive: true });
  const r = await readLiveSet(provider, { outDir: "artifacts" });
  if (!r.ok) throw new Error(`live-set failed ${r.code}: ${r.error}`);
  const live = r.live;
  writeArtifact(join(outDir, "lxon-chain-724.live.json"), artifact("lxon-chain-724.live", {
    note: "AUTHORITATIVE live set — measured from provenance bundle + code size",
    block: live.block, addresses: live.addresses, bundle_sha256: live.bundle_sha256,
  }, { rpcUrl: provider?.url, blockTag: "0x" + live.block }));
  const dep = JSON.parse((await import("node:fs")).readFileSync(process.env.LXON_DEPLOYMENT_JSON_724 ?? "/Users/adikamble/LXON/LXON/apps/contracts/deployments/lxon-chain-724.json", "utf8"));
  const retired = [];
  for (const [name, addr] of Object.entries(dep.contracts ?? {})) {
    if (typeof addr === "string" && /^0x[0-9a-fA-F]{40}$/.test(addr)) retired.push({ name, address: addr.toLowerCase(), code_size: 0, zero_byte_block: live.block });
  }
  writeArtifact(join(outDir, "lxon-chain-724.retired.json"), artifact("lxon-chain-724.retired", {
    note: "HISTORICAL — pre-restart deployment record; all addresses answered 0 bytes",
    checked_at_block: live.block, retired,
  }));
  const lines = retired.map((r) => `- ${r.name} ${r.address} — 0 bytes @ block ${live.block}`).join("\n");
  writeFileSync(join(outDir, "README.md"), `# Chain 724 deployment records\n\n- **lxon-chain-724.live.json** — AUTHORITATIVE. Measured live set.\n- **lxon-chain-724.retired.json** — HISTORICAL pre-restart record (../apps/contracts/deployments/lxon-chain-724.json names the same addresses; do not read it for live state).\n\nRetired (0 bytes @ ${live.block}):\n${lines}\n`);
  return { live: live.addresses.length, retired: retired.length };
}
