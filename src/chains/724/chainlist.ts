// TASK 8 — chainlist entry (GAP-724-A). Produces a PR-ready
// _data/chains/eip155-724.json ONLY when every precondition is measured:
// health not red, RPC is https+domain+chainId 0x2d4, explorer serves a
// recent block, token metadata read live. Otherwise exit 52.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import type { Provider } from "../../shared/provider.ts";
import { makeProvider, assertEndpoint } from "../../shared/provider.ts";
import { artifact, writeArtifact } from "../../shared/artifact.ts";
import { callData, decodeUint, decodeString } from "../../shared/abi.ts";
import { die, EXIT_724, ToolError } from "../../shared/exit-codes.ts";
import { measureHealth, type Health } from "./health.ts";
import { probeExplorer, type ExplorerStatus } from "./explorer.ts";
import { CFG } from "./config.ts";

export interface ChainlistEntry {
  _meta: { tool: string; generated_at_utc: string; rpcUrl: string; blockTag: string };
  path: string;
  content: {
    name: string;
    chain: string;
    rpc: string[];
    faucets: string[];
    nativeCurrency: { name: string; symbol: string; decimals: number };
    infoURL: string;
    shortName: string;
    chainId: number;
    networkId: number;
    explorers: { name: string; url: string; standard: string }[];
  };
  pr_instructions: string;
  preconditions: {
    health_status: string;
    explorer_reachable: boolean | "unmeasurable";
    explorer_lag_blocks: number | "unmeasurable";
  };
}

export async function prepareChainlistEntry(
  opts: {
    outDir?: string;
    health?: Health;
    explorer?: ExplorerStatus;
    provider?: Provider;
    writeFile?: boolean;
  } = {},
): Promise<{ entry: ChainlistEntry | null; artifactPath?: string; refused?: { code: number; field: string; reason: string } }> {
  const failures: { field: string; reason: string }[] = [];

  const p = opts.provider ?? (await makeProvider(CFG.rpcUrl, CFG.expectedChainId));
  const head = await p.blockNumber();
  const tag = "0x" + head.toString(16);

  // 1. Health must not be red.
  const health = opts.health ?? (await measureHealth(p)).health;
  if (health.status === "red" || health.status === "unmeasurable") {
    failures.push({ field: "health", reason: `health status is ${health.status}: ${health.reasons.join("; ")}` });
  }

  // 2. RPC must be https + domain + chainId 0x2d4 (provider already enforced;
  //    re-assert for the artifact record).
  try {
    await assertEndpoint(CFG.rpcUrl);
  } catch (e) {
    failures.push({ field: "rpc_url", reason: (e as Error).message });
  }
  if (!CFG.rpcUrl.startsWith("https://")) {
    failures.push({ field: "rpc_url", reason: `not https: ${CFG.rpcUrl}` });
  }

  // 3. Explorer must answer with a recent block.
  const ex = opts.explorer ?? (await probeExplorer({})).status;
  if (ex.reachable !== true) {
    failures.push({ field: "explorer_url", reason: `explorer not measurable/reachable: ${ex.reason ?? ex.reachable}` });
  } else if (typeof ex.lag_blocks === "number" && ex.lag_blocks > CFG.explorerMaxLag) {
    failures.push({ field: "explorer_url", reason: `explorer lag ${ex.lag_blocks} blocks > ${CFG.explorerMaxLag}` });
  }

  // 4. Token metadata from the live contract.
  let name = "", symbol = "", decimals = 0;
  try {
    name = decodeString(await p.call(CFG.lxonToken, callData("name()"), tag));
    symbol = decodeString(await p.call(CFG.lxonToken, callData("symbol()"), tag));
    decimals = Number(decodeUint(await p.call(CFG.lxonToken, callData("decimals()"), tag)));
  } catch (e) {
    failures.push({ field: "nativeCurrency", reason: `token metadata read failed: ${(e as Error).message}` });
  }
  if (!symbol || !decimals) failures.push({ field: "nativeCurrency", reason: "symbol/decimals empty" });

  if (failures.length) {
    const refused = { code: EXIT_724.CHAINLIST_PRECONDITION_FAILED, field: failures[0].field, reason: failures.map((f) => `${f.field}: ${f.reason}`).join(" | ") };
    const art = artifact("chainlist-724-entry-refused", { refused, failures }, { rpcUrl: p.url, blockTag: tag });
    let artifactPath: string | undefined;
    if (opts.outDir) {
      artifactPath = `${opts.outDir}/chainlist-724-entry.json`;
      writeArtifact(artifactPath, art);
    }
    return { entry: null, artifactPath, refused };
  }

  const entry: ChainlistEntry = {
    _meta: { tool: "prepareChainlistEntry", generated_at_utc: new Date().toISOString(), rpcUrl: p.url, blockTag: tag },
    path: "_data/chains/eip155-724.json",
    content: {
      name,
      chain: name,
      rpc: [CFG.rpcUrl],
      faucets: [],
      nativeCurrency: { name, symbol, decimals },
      infoURL: CFG.infoUrl,
      shortName: "lxon",
      chainId: 724,
      networkId: 724,
      explorers: [{ name: "LXON Explorer", url: CFG.explorerUrl, standard: "EIP3091" }],
    },
    pr_instructions:
      "fork ethereum-lists/chains, add _data/chains/eip155-724.json with the content above, open a PR; verification evidence attached as a comment is this artifact's _meta/provenance",
    preconditions: {
      health_status: health.status,
      explorer_reachable: ex.reachable,
      explorer_lag_blocks: ex.lag_blocks,
    },
  };

  let artifactPath: string | undefined;
  if (opts.outDir) {
    artifactPath = `${opts.outDir}/chainlist-724-entry.json`;
    writeArtifact(artifactPath, artifact("chainlist-724-entry", entry, { rpcUrl: p.url, blockTag: tag }));
    if (opts.writeFile !== false) {
      mkdirSync(dirname(artifactPath), { recursive: true });
      writeFileSync(`${opts.outDir}/eip155-724.json`, JSON.stringify(entry.content, null, 2) + "\n");
    }
  }
  return { entry, artifactPath };
}
