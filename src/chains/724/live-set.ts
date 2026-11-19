// TASK 3 — live set (GAP-724-B). Reads the provenance bundle, re-proves
// every address by eth_getCode at a pinned block, splits live vs retired,
// writes live-addresses-724.json + retired-addresses-724.json.
import { readFileSync } from "node:fs";
import type { Provider } from "../../shared/provider.ts";
import { makeProvider } from "../../shared/provider.ts";
import { artifact, writeArtifact, sha256 } from "../../shared/artifact.ts";
import { EXIT, EXIT_724 } from "../../shared/exit-codes.ts";
import { CFG } from "./config.ts";

export interface LiveSet {
  block: string;
  addresses: { name: string; address: string; code_size: number }[];
  retired: { name: string; address: string; code_size: 0 }[];
  bundle_url: string;
  bundle_sha256: string;
}

interface BundleContract {
  address: string;
  role: string;
  codeBytes?: number;
}
interface Bundle {
  chainId: number;
  contracts: BundleContract[];
  headBlock?: number;
  generated_at_utc?: string;
}

export async function readLiveSet(
  provider?: Provider,
  opts: { bundleUrl?: string; deploymentJson?: string; outDir?: string } = {},
): Promise<{ ok: true; live: LiveSet; artifacts: Record<string, string> } | { ok: false; code: number; error: string }> {
  const p = provider ?? (await makeProvider(CFG.rpcUrl, CFG.expectedChainId));
  const bundleUrl = opts.bundleUrl ?? CFG.provenanceBundleUrl;
  const depPath = opts.deploymentJson ?? CFG.deploymentJson;
  const outDir = opts.outDir ?? CFG.artifactsDir;

  // 1. Fetch the provenance bundle.
  let bundle: Bundle;
  let bundleRaw: string;
  try {
    const res = await fetch(bundleUrl, { signal: AbortSignal.timeout(20_000) });
    if (!res.ok) return { ok: false, code: EXIT.RPC_UNREACHABLE, error: `provenance bundle http ${res.status}` };
    bundleRaw = await res.text();
    bundle = JSON.parse(bundleRaw);
  } catch (e) {
    return { ok: false, code: EXIT.RPC_UNREACHABLE, error: `provenance bundle fetch failed: ${(e as Error).message}` };
  }
  if (bundle.chainId !== 724 || !Array.isArray(bundle.contracts) || !bundle.contracts.length) {
    return { ok: false, code: EXIT.RPC_UNREACHABLE, error: "provenance bundle is not a chain-724 contract list" };
  }
  const bundleSha = sha256(bundleRaw);

  // 2. Pin a block and prove every address by code size.
  const head = await p.blockNumber();
  const blockTag = "0x" + head.toString(16);
  const live: LiveSet = {
    block: head.toString(),
    addresses: [],
    retired: [],
    bundle_url: bundleUrl,
    bundle_sha256: bundleSha,
  };
  for (const c of bundle.contracts) {
    const code = await p.getCode(c.address, blockTag);
    const size = code === "0x" ? 0 : (code.length - 2) / 2;
    const entry = { name: c.role, address: c.address.toLowerCase(), code_size: size };
    if (size === 0) live.retired.push(entry as never);
    else live.addresses.push(entry);
  }

  // 3. Cross-check the deployment JSON's bridge address against the live set.
  try {
    const dep = JSON.parse(readFileSync(depPath, "utf8"));
    const depContracts = dep.contracts ?? {};
    // Find the deployment record's bridge-ish entries and compare addresses.
    const depAddrs = new Set<string>();
    for (const [k, v] of Object.entries(depContracts)) {
      if (typeof v === "string" && /^0x[0-9a-fA-F]{40}$/.test(v)) depAddrs.add(v.toLowerCase());
      if (Array.isArray(v)) for (const a of v) if (typeof a === "string" && /^0x[0-9a-fA-F]{40}$/.test(a)) depAddrs.add(a.toLowerCase());
    }
    const liveAddrs = new Set(live.addresses.map((a) => a.address));
    const depBridge = Object.entries(depContracts).find(([k]) => /bridge/i.test(k));
    if (depBridge) {
      const depBridgeAddr = Array.isArray(depBridge[1]) ? null : String(depBridge[1]).toLowerCase();
      if (depBridgeAddr && !liveAddrs.has(depBridgeAddr)) {
        // Deployment JSON names an address that is not in the live set.
        // If its code is zero this is the expected pre-restart divergence (WARN);
        // if it has code but isn't in the bundle, that IS a divergence (exit 53).
        const code = await p.getCode(depBridgeAddr, blockTag);
        if (code !== "0x" && (code.length - 2) / 2 > 0) {
          return { ok: false, code: EXIT_724.DEPLOYMENT_JSON_DIVERGES, error: `deployment JSON bridge ${depBridgeAddr} has code but is absent from the provenance live set` };
        }
        // zero code → expected retirement, warn only
        console.error(`WARN: deployment JSON bridge ${depBridgeAddr} has zero code at block ${head} — pre-restart record, retired set`);
      }
    }
    void depAddrs;
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e;
  }

  // 4. Write both artifacts.
  const liveArt = artifact("live-set-724", {
    block: live.block,
    addresses: live.addresses,
    retired: live.retired,
    bundle_url: live.bundle_url,
    bundle_sha256: live.bundle_sha256,
  }, { rpcUrl: p.url, blockTag });
  const retiredArt = artifact("retired-addresses-724", {
    checked_at_block: live.block,
    note: "These addresses answered zero bytes at the pinned block. They are the pre-restart deployment record, not the live set.",
    retired: live.retired,
  }, { rpcUrl: p.url, blockTag });
  const a1 = writeArtifact(`${outDir}/live-addresses-724.json`, liveArt);
  const a2 = writeArtifact(`${outDir}/retired-addresses-724.json`, retiredArt);
  return { ok: true, live, artifacts: { live: a1, retired: a2 } };
}
