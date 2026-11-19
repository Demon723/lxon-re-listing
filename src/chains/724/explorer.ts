// TASK 7 — explorer probe (GAP-724-G). Measures, never assumes. The URL
// comes from config (registry), not guessed. Blockscout-style endpoints
// first, /api/v2 fallback, else "unmeasurable" — never "broken".
import { artifact, writeArtifact, now } from "../../shared/artifact.ts";
import { makeProvider } from "../../shared/provider.ts";
import { CFG } from "./config.ts";

export interface ExplorerStatus {
  url: string;
  reachable: boolean | "unmeasurable";
  head: string | null;
  lag_blocks: number | "unmeasurable";
  last_checked: string;
  reason?: string;
}

async function getJson(url: string): Promise<{ status: number; json: any } | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(15_000), redirect: "follow" });
    const text = await res.text();
    try {
      return { status: res.status, json: JSON.parse(text) };
    } catch {
      return { status: res.status, json: null };
    }
  } catch {
    return null;
  }
}

export async function probeExplorer(opts: { outDir?: string; explorerUrl?: string } = {}): Promise<{ status: ExplorerStatus; artifactPath?: string }> {
  const base = (opts.explorerUrl ?? CFG.explorerUrl).replace(/\/$/, "");
  const rpcHead = await (await makeProvider(CFG.rpcUrl, CFG.expectedChainId)).blockNumber();

  let head: bigint | null = null;
  let reachable: boolean | "unmeasurable" = "unmeasurable";
  let reason: string | undefined;

  // Blockscout v1-style
  const v1 = await getJson(`${base}/api?module=block&action=eth_block_number`);
  if (v1?.status === 200 && v1.json?.result) {
    head = BigInt(v1.json.result);
    reachable = true;
  } else {
    // Blockscout v2-style
    const v2 = await getJson(`${base}/api/v2/blocks/latest`);
    if (v2?.status === 200 && (v2.json?.result?.number ?? v2.json?.number)) {
      const n = v2.json.result?.number ?? v2.json.number;
      head = BigInt(n);
      reachable = true;
    } else {
      reachable = "unmeasurable";
      reason = `neither ${base}/api?module=block&action=eth_block_number nor /api/v2/blocks/latest returned usable block data (v1=${v1?.status ?? "no response"}, v2=${v2?.status ?? "no response"})`;
    }
  }

  // If reachable, verify a recent block is retrievable.
  let lag: number | "unmeasurable" = "unmeasurable";
  if (head !== null) {
    lag = Number(rpcHead - head);
    const blk = await getJson(`${base}/api?module=block&action=getblockbyno&blockno=${head.toString()}&txlist=false`);
    if (!(blk?.status === 200 && blk.json?.result)) {
      reachable = "unmeasurable";
      reason = "eth_block_number answered but getblockbyno did not return the block";
      lag = "unmeasurable";
    }
  }

  const st: ExplorerStatus = {
    url: base,
    reachable,
    head: head?.toString() ?? null,
    lag_blocks: lag,
    last_checked: now(),
    ...(reason ? { reason } : {}),
  };

  let artifactPath: string | undefined;
  if (opts.outDir) {
    artifactPath = `${opts.outDir}/explorer-724.json`;
    writeArtifact(artifactPath, artifact("explorer-724", st, { rpcUrl: CFG.rpcUrl, blockTag: "0x" + rpcHead.toString(16) }));
  }
  return { status: st, artifactPath };
}
