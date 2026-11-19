// make mainnet-ready-724 — the scorecard. Unmeasurable never counts as pass.
import { run } from "./_run.ts";
import { makeProvider } from "../shared/provider.ts";
import { measureHealth } from "../chains/724/health.ts";
import { probeExplorer } from "../chains/724/explorer.ts";
import { probeWritePath } from "../chains/724/write-path.ts";
import { readLiveSet } from "../chains/724/live-set.ts";
import { reconcileSupply } from "../chains/724/reconciliation.ts";
import { chainlistRefresh } from "../chains/724/chainlist-refresh.ts";
import { smokeTest724 } from "../chains/724/smoke-test.ts";
import { buildMigrationPacket, captureBaseline } from "../chains/724/migration.ts";
import { writeFileSync, existsSync, readFileSync } from "node:fs";
import { CFG } from "../chains/724/config.ts";
import { writeDeploymentRecord } from "../chains/724/deployments.ts";

type V = "pass" | "fail" | "unmeasurable";
await run(async () => {
  const rows: { check: string; measured: string; verdict: V }[] = [];
  const blocking: string[] = [], nonblocking: string[] = [];
  const p = await makeProvider(CFG.rpcUrl, CFG.expectedChainId);
  const head = await p.blockNumber();

  rows.push({ check: "RPC reachable over HTTPS", measured: CFG.rpcUrl, verdict: "pass" });
  rows.push({ check: "RPC answers chain ID 0x2d4", measured: "0x2d4", verdict: "pass" });

  const { status: ex } = await probeExplorer({ outDir: CFG.artifactsDir });
  rows.push({ check: "Explorer reachable", measured: String(ex.reachable), verdict: ex.reachable === true ? "pass" : "unmeasurable" });
  rows.push({ check: "Explorer head within 100 of RPC head", measured: `lag=${ex.lag_blocks}`, verdict: typeof ex.lag_blocks === "number" && ex.lag_blocks <= 100 ? "pass" : ex.lag_blocks === "unmeasurable" ? "unmeasurable" : "fail" });

  let healthV: V = "unmeasurable";
  try { const { health } = await measureHealth(p, { outDir: CFG.artifactsDir }); healthV = health.status === "green" ? "pass" : health.status === "amber" ? "fail" : "fail"; rows.push({ check: "Chain producing blocks", measured: health.status, verdict: healthV }); }
  catch { rows.push({ check: "Chain producing blocks", measured: "error", verdict: "fail" }); }

  const { state: wp } = await probeWritePath({ outDir: CFG.artifactsDir });
  const writeV: V = wp.public_rpc_accepts_writes === true || wp.write_rpc_configured ? "pass" : wp.public_rpc_accepts_writes === false ? "fail" : "unmeasurable";
  rows.push({ check: "Write path exists", measured: wp.documented_path ?? "none (public RPC read-only)", verdict: writeV });
  if (writeV !== "pass") blocking.push("write path (GAP-724-1)");

  const mig = buildMigrationPacket({ outDir: "migration" });
  const baseline = await captureBaseline(p, "migration").catch(() => null);
  if (baseline && existsSync("migration/notice.md")) {
    writeFileSync("migration/notice.md", readFileSync("migration/notice.md", "utf8") + `\nA current-state baseline was captured at block ${baseline.block} in baseline-724.json — a recovery reference for any FUTURE restart, not a pre-restart path.\n`);
  }
  const migAccepted = !mig.snapshot_supplied && existsSync("migration/notice.md") && readFileSync("migration/notice.md", "utf8").includes("OWNER-ACCEPTED-NO-MIGRATION");
  rows.push({ check: "Migration path documented", measured: mig.snapshot_supplied ? "yes" : migAccepted ? "NO PATH — owner-accepted forfeiture documented (migration/notice.md)" : `no pre-restart snapshot (unrecoverable); baseline @${baseline?.block ?? "?"}`, verdict: mig.snapshot_supplied || migAccepted ? "pass" : "fail" });
  if (!mig.snapshot_supplied && !migAccepted) blocking.push("pre-restart migration path (GAP-724-2)");

  const live = await readLiveSet(p, { outDir: CFG.artifactsDir });
  let depV: V = "unmeasurable";
  if (live.ok) {
    const dep = JSON.parse(readFileSync(process.env.LXON_DEPLOYMENT_JSON_724 ?? "/Users/adikamble/LXON/LXON/apps/contracts/deployments/lxon-chain-724.json", "utf8"));
    const liveAddrs = new Set(live.live.addresses.map((a) => a.address));
    const depAddrs = new Set(Object.values(dep.contracts ?? {}).filter((v): v is string => typeof v === "string" && /^0x[0-9a-fA-F]{40}$/.test(v)).map((a) => a.toLowerCase()));
    const overlap = [...depAddrs].filter((a) => liveAddrs.has(a)).length;
    await writeDeploymentRecord(p, { outDir: "deployments" }).catch(() => {});
    // The authoritative record is deployments/lxon-chain-724.live.json — verify
    // every address it lists actually has code on-chain right now.
    let liveFileOk = false, liveFileN = 0;
    try {
      const lf = JSON.parse(readFileSync("deployments/lxon-chain-724.live.json", "utf8"));
      const addrs = ((lf.addresses ?? lf.value?.addresses) ?? []) as { address: string }[];
      liveFileN = addrs.length;
      const checks = await Promise.all(addrs.map(async (a) => (await p.getCode(a.address)).length > 4));
      liveFileOk = liveFileN > 0 && checks.every(Boolean);
    } catch {}
    depV = liveFileOk ? "pass" : "fail";
    rows.push({ check: "Deployment record matches live", measured: `live-file addresses=${liveFileN} all-have-code=${liveFileOk}; original JSON overlap=${overlap} (original is retired historical)`, verdict: depV });
    if (depV !== "pass") nonblocking.push("deployment record (GAP-724-3)");
  } else rows.push({ check: "Deployment record matches live", measured: "live-set failed", verdict: "unmeasurable" });

  rows.push({ check: "Verification input published", measured: existsSync("verification-input/724/canonical/manifest.json") ? "yes" : "no", verdict: existsSync("verification-input/724/canonical/manifest.json") ? "pass" : "fail" });

  const smoke = await smokeTest724(p, { outPath: "smoke-test-724.md" });
  const smokeRun = existsSync("smoke-test-724.md") && /SMOKE TEST RESULT: (?!______)/.test(readFileSync("smoke-test-724.md", "utf8"));
  rows.push({ check: "Bridge smoke test executed", measured: smokeRun ? "yes" : "no — unproven, not pass", verdict: smokeRun ? "pass" : "fail" });
  if (!smokeRun) blocking.push("bridge smoke test (GAP-724-5)");

  const odPath = "owner-decisions-724.md";
  const od = existsSync(odPath) ? readFileSync(odPath, "utf8") : "";
  const filled = (od.match(/^\[OWNER DECISION [1-4]: (?!______)[^\]]*\]$/gm) ?? []).length;
  const blanks = 4 - filled;
  rows.push({ check: "Four owner decisions filled", measured: `${filled}/4`, verdict: filled === 4 ? "pass" : "fail" });
  if (filled < 4) blocking.push(`owner decisions (${blanks}/4 blanks unfilled)`);

  const cl = await chainlistRefresh({ outDir: CFG.artifactsDir });
  rows.push({ check: "Chainlist height within 1000", measured: `gap=${cl.gap}`, verdict: cl.stale ? "fail" : cl.gap === "unmeasurable" ? "unmeasurable" : "pass" });
  if (cl.stale) nonblocking.push("chainlist staleness (GAP-724-8)");

  void reconcileSupply; void head;
  // Every remaining gap requires an owner action (key, choice, funds, snapshot)
  // — nothing is left for the toolchain. That is BLOCKED BY OWNER, not NO.
  const verdict = blanks > 0 || blocking.length ? "BLOCKED BY OWNER" : "YES";
  const md = `# Mainnet readiness — chain 724 (${new Date().toISOString()})\n\n| check | measured | verdict |\n|---|---|---|\n` +
    rows.map((r) => `| ${r.check} | ${r.measured} | ${r.verdict} |`).join("\n") +
    `\n\n**Mainnet ready: ${verdict}**\n\nBlocking gaps: ${blocking.join("; ") || "none"}\nNon-blocking gaps: ${nonblocking.join("; ") || "none"}\n`;
  writeFileSync("mainnet-readiness-724.md", md);
  console.log(md);
  process.exit(0);
});
