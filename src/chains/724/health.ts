// TASK 4 — health (GAP-724-C). Samples MIN_SAMPLE consecutive blocks at head,
// computes timestamp deltas, classifies green/amber/red. Unmeasurable is
// never coerced to green.
import type { Provider } from "../../shared/provider.ts";
import { makeProvider } from "../../shared/provider.ts";
import { artifact, writeArtifact } from "../../shared/artifact.ts";
import { die, EXIT_724 } from "../../shared/exit-codes.ts";
import { CFG } from "./config.ts";

export interface Health {
  head: string;
  head_timestamp: string;
  blocks_sampled: number;
  block_times_sec: { p50: number; p95: number; max: number } | null;
  produces_blocks: boolean | "unmeasurable";
  last_block_age_sec: number | "unmeasurable";
  non_adjacent_sample: boolean;
  status: "green" | "amber" | "red" | "unmeasurable";
  reasons: string[];
}

function percentile(sorted: number[], p: number): number {
  if (!sorted.length) return 0;
  const i = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return sorted[Math.max(0, i)];
}

export async function measureHealth(
  provider?: Provider,
  opts: { outDir?: string; nowSec?: number } = {},
): Promise<{ health: Health; artifactPath?: string }> {
  const p = provider ?? (await makeProvider(CFG.rpcUrl, CFG.expectedChainId));
  const nowSec = opts.nowSec ?? Math.floor(Date.now() / 1000);
  const reasons: string[] = [];

  const head = await p.blockNumber();
  const headBlock = await p.getBlock(head);
  const headTs = Number(headBlock.timestamp);
  const lastBlockAge = nowSec - headTs;

  // Sample MIN_SAMPLE consecutive blocks ending at head.
  const n = Math.max(CFG.minSample, 2);
  const blocks = [];
  for (let i = 0n; i < BigInt(n); i++) {
    blocks.push(await p.getBlock(head - i));
  }
  blocks.reverse(); // ascending

  // Adjacency check
  let nonAdjacent = false;
  for (let i = 1; i < blocks.length; i++) {
    const gap = blocks[i].number - blocks[i - 1].number;
    if (gap > BigInt(CFG.maxGapBlocks)) {
      nonAdjacent = true;
      reasons.push(`non-adjacent block sample: gap of ${gap} between ${blocks[i - 1].number} and ${blocks[i].number}`);
    }
  }

  // Timestamp regression check — a regressed timestamp is a hard failure (exit 56).
  for (let i = 1; i < blocks.length; i++) {
    if (blocks[i].timestamp < blocks[i - 1].timestamp) {
      die(EXIT_724.BLOCK_TIME_REGRESSION, `block timestamp regressed: block ${blocks[i - 1].number} ts=${blocks[i - 1].timestamp} > block ${blocks[i].number} ts=${blocks[i].timestamp}`);
    }
  }

  const deltas: number[] = [];
  for (let i = 1; i < blocks.length; i++) {
    deltas.push(Number(blocks[i].timestamp - blocks[i - 1].timestamp));
  }
  const sorted = [...deltas].sort((a, b) => a - b);
  const times =
    deltas.length >= 2
      ? { p50: percentile(sorted, 50), p95: percentile(sorted, 95), max: sorted[sorted.length - 1] }
      : null;

  const produces =
    lastBlockAge <= CFG.amberMaxAgeSec ? true : lastBlockAge <= CFG.amberMaxAgeSec * 4 ? "unmeasurable" : false;
  if (produces === false) reasons.push(`head age ${lastBlockAge}s exceeds amber window ${CFG.amberMaxAgeSec}s`);

  let status: Health["status"];
  if (nonAdjacent || times === null || produces !== true) {
    status = lastBlockAge <= CFG.amberMaxAgeSec ? "amber" : "red";
    if (status === "red") reasons.push("head older than AMBER_MAX_AGE or sample insufficient with no head advance");
  } else if (
    lastBlockAge <= CFG.greenMaxAgeSec &&
    times.p95 <= CFG.greenP95Sec &&
    blocks.length >= CFG.minSample
  ) {
    status = "green";
  } else if (lastBlockAge <= CFG.amberMaxAgeSec) {
    status = "amber";
    reasons.push(`head age ${lastBlockAge}s or p95 ${times.p95}s outside green bounds`);
  } else {
    status = "red";
    reasons.push(`head age ${lastBlockAge}s exceeds AMBER_MAX_AGE ${CFG.amberMaxAgeSec}s`);
  }
  if (status !== "red" && lastBlockAge > CFG.amberMaxAgeSec) {
    status = "red";
    reasons.push("MINER_SILENT");
  }

  const health: Health = {
    head: head.toString(),
    head_timestamp: new Date(headTs * 1000).toISOString(),
    blocks_sampled: blocks.length,
    block_times_sec: times,
    produces_blocks: produces,
    last_block_age_sec: lastBlockAge,
    non_adjacent_sample: nonAdjacent,
    status,
    reasons,
  };

  let artifactPath: string | undefined;
  if (opts.outDir) {
    artifactPath = `${opts.outDir}/health-724.json`;
    writeArtifact(artifactPath, artifact("health-724", health, { rpcUrl: p.url, blockTag: "0x" + head.toString(16) }));
  }
  if (status === "red") {
    die(EXIT_724.MINER_SILENT, `health red: ${reasons.join("; ") || "head not producing"}`);
  }
  return { health, artifactPath };
}
