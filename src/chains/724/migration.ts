// TASK 2 — migration packet (GAP-724-2). No snapshot => honest "no path" notice.
// Snapshot present => merkle-rooted claim list + notice + unsigned reissue cmds.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { join } from "node:path";
import { artifact, writeArtifact, sha256 } from "../../shared/artifact.ts";
import { die, EXIT_724_FINAL } from "../../shared/exit-codes.ts";
import { callData, decodeUint, encodeAddress } from "../../shared/abi.ts";
import { CFG } from "./config.ts";
import type { Provider } from "../../shared/provider.ts";

export interface MigrationResult {
  snapshot_supplied: boolean;
  notice: string;
  merkle_root?: string;
  claim_count?: number;
  exit_code: number;
}

function merkleRoot(pairs: { address: string; balance: string }[]): string {
  const leaves = pairs
    .map((p) => createHash("sha256").update(p.address.toLowerCase() + ":" + p.balance).digest())
    .sort((a, b) => Buffer.compare(a, b));
  if (!leaves.length) return "0x" + "0".repeat(64);
  let level = leaves;
  while (level.length > 1) {
    const next: Buffer[] = [];
    for (let i = 0; i < level.length; i += 2) {
      const l = level[i], r = level[i + 1] ?? l;
      next.push(createHash("sha256").update(Buffer.concat([l, r])).digest());
    }
    level = next;
  }
  return "0x" + level[0].toString("hex");
}

export function buildMigrationPacket(opts: { snapshotPath?: string; liveBlock?: string; outDir?: string; documentedTotalSupply?: string } = {}): MigrationResult {
  const outDir = opts.outDir ?? "migration";
  mkdirSync(outDir, { recursive: true });

  if (!opts.snapshotPath) {
    const noticePath = join(outDir, "notice.md");
    const prior = existsSync(noticePath) ? readFileSync(noticePath, "utf8") : "";
    const notice = `# Pre-restart migration notice — chain 724\n\nMeasured ${new Date().toISOString()}.\n\nThe 2026-11-03 restart discarded 242,493 blocks of pre-restart history. **No pre-restart snapshot was supplied to this tool, so no migration path exists.** Any address that held LXON before that date holds nothing on the live chain. This is a fact, not a gap to hide.\n` + (prior.includes("OWNER-ACCEPTED-NO-MIGRATION") ? prior.slice(prior.indexOf("## Owner decision")) : "");
    writeFileSync(noticePath, notice);
    writeFileSync(join(outDir, "claim-list.json"), JSON.stringify({ merkle_root: null, claim_count: 0, note: "no snapshot supplied" }, null, 1) + "\n");
    return { snapshot_supplied: false, notice, exit_code: 0 };
  }

  const raw = readFileSync(opts.snapshotPath, "utf8");
  const sha = sha256(raw);
  let pairs: { address: string; balance: string }[] = [];
  try {
    const j = JSON.parse(raw);
    const arr = Array.isArray(j) ? j : j.balances ?? j.accounts ?? [];
    pairs = arr.map((x: any) => ({ address: String(x.address ?? x[0]), balance: String(x.balance ?? x[1]) }));
  } catch {
    pairs = raw.trim().split("\n").filter(Boolean).map((l) => {
      const [a, b] = l.split(/[,\s]+/);
      return { address: a, balance: b };
    });
  }
  pairs.sort((a, b) => a.address.localeCompare(b.address));
  const total = pairs.reduce((s, p) => s + BigInt(p.balance || "0"), 0n);

  if (opts.documentedTotalSupply && BigInt(opts.documentedTotalSupply) !== total) {
    die(EXIT_724_FINAL.MIGRATION_PATH_ABSENT_AND_UNSTATED, `migration snapshot sum ${total} != documented pre-restart totalSupply ${opts.documentedTotalSupply}`);
  }

  const root = merkleRoot(pairs);
  writeFileSync(join(outDir, "claim-list.json"), JSON.stringify({ merkle_root: root, claim_count: pairs.length, snapshot_sha256: sha, live_block: opts.liveBlock ?? null }, null, 1) + "\n");
  const notice = `# Pre-restart migration notice — chain 724\n\n${pairs.length} claims, merkle root ${root}, snapshot sha256 ${sha}. Re-issue commands in reissue-commands.txt — unsigned, owner signs.\n`;
  writeFileSync(join(outDir, "notice.md"), notice);
  writeFileSync(join(outDir, "reissue-commands.txt"), pairs.map((p) => `# re-issue ${p.balance} to ${p.address}\ncast send <LXON_724> 'mint(address,uint256)' ${p.address} ${p.balance} --rpc-url <WRITE_RPC> --keystore <MINTER_KEY>\n`).join("\n"));
  return { snapshot_supplied: true, notice, merkle_root: root, claim_count: pairs.length, exit_code: 0 };
}

async function callUint(p: Provider, to: string, data: string, tag: string): Promise<bigint> {
  const r = await p.call(to, data, tag);
  return r === "0x" ? 0n : decodeUint(r);
}

// Captures a CURRENT-STATE baseline (not a pre-restart snapshot — that is
// unrecoverable). Gives any future restart a measured recovery reference.
export async function captureBaseline(provider: Provider, outDir = "migration"): Promise<Record<string, string>> {
  const tag = "0x" + (await provider.blockNumber()).toString(16);
  const supply = await callUint(provider, CFG.lxonToken, callData("totalSupply()"), tag);
  const escrow = await callUint(provider, CFG.bridgeV41, callData("escrowed(address)", [encodeAddress(CFG.lxonToken)]), tag);
  const bridgeBal = await callUint(provider, CFG.lxonToken, callData("balanceOf(address)", [encodeAddress(CFG.bridgeV41)]), tag);
  const baseline = {
    note: "CURRENT-STATE baseline captured post-restart. NOT a pre-restart snapshot — pre-restart balances are unrecoverable (242,493 blocks discarded 2026-11-03).",
    block: tag,
    captured_at: new Date().toISOString(),
    totalSupply_724: supply.toString(),
    escrowed_LXON_in_bridgeV41: escrow.toString(),
    bridgeV41_LXON_balance: bridgeBal.toString(),
    validator_stake_non_backing: (bridgeBal - escrow).toString(),
    lxonToken: CFG.lxonToken,
    bridgeV41: CFG.bridgeV41,
  };
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, "baseline-724.json"), JSON.stringify(baseline, null, 1) + "\n");
  return baseline;
}
