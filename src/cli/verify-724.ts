// make verify-724 — runs every 724 measurement in order, writes artifacts,
// prints the four owner blanks. Hard module failures (live-set, health,
// provider) abort immediately; measurement-level refusals (roles 54,
// reconciliation 55, chainlist 52) are recorded and the run continues so all
// artifacts are produced. Final exit = worst recorded code.
import { run } from "./_run.ts";
import { makeProvider } from "../shared/provider.ts";
import { exitCodeOf, ToolError } from "../shared/exit-codes.ts";
import { CFG } from "../chains/724/config.ts";
import { readLiveSet } from "../chains/724/live-set.ts";
import { measureHealth, type Health } from "../chains/724/health.ts";
import { measureRoles, type RoleInventory } from "../chains/724/roles.ts";
import { reconcileSupply } from "../chains/724/reconciliation.ts";
import { probeExplorer, type ExplorerStatus } from "../chains/724/explorer.ts";
import { prepareChainlistEntry } from "../chains/724/chainlist.ts";
import { prepareVerification724 } from "../chains/724/verification.ts";
import { ownerDecisions724 } from "../chains/724/owner-decisions.ts";

await run(async () => {
  const out = CFG.artifactsDir;
  const p = await makeProvider(CFG.rpcUrl, CFG.expectedChainId);
  const head = await p.blockNumber();
  console.log(`chain 724 @ block ${head} via ${CFG.rpcUrl}`);

  const results: Record<string, string> = {};
  let worst = 0;
  const note = (step: string, code: number, msg: string) => {
    if (code > worst) worst = code;
    results[step] = `FAILED exit ${code}: ${msg}`;
    console.log(`${step}: FAILED exit ${code} — ${msg}`);
  };

  // 1. live set — fundamental, abort on failure
  const live = await readLiveSet(p, { outDir: out });
  if (!live.ok) { console.error(`live-set FAILED exit ${live.code}: ${live.error}`); process.exit(live.code); }
  results["live-set"] = `${live.live.addresses.length} live / ${live.live.retired.length} retired @ block ${live.live.block}`;
  console.log(`live-set: ${results["live-set"]}`);

  // 2. health — red aborts inside measureHealth (57); amber continues
  let health: Health | undefined;
  try {
    const h = await measureHealth(p, { outDir: out });
    health = h.health;
    results["health"] = `${h.health.status} (head age ${h.health.last_block_age_sec}s, p95 ${h.health.block_times_sec?.p95 ?? "n/a"}s)`;
    console.log(`health: ${results["health"]} -> ${h.artifactPath}`);
  } catch (e) {
    note("health", exitCodeOf(e), (e as Error).message);
  }

  // 3. roles — may legitimately refuse (54) when no role holder exists
  let roles: RoleInventory | undefined;
  try {
    const candidates = live.live.addresses.map((a) => a.address);
    const r = await measureRoles(p, { candidates, outDir: out });
    roles = r.inventory;
    results["roles"] = `minter=${r.inventory.minterHolders.length} burner=${r.inventory.burnerHolders.length} admin=${r.inventory.adminHolders.length} control=${r.inventory.positiveControl.address}`;
    console.log(`roles: ${results["roles"]} -> ${r.artifactPath}`);
  } catch (e) {
    note("roles", exitCodeOf(e), (e as Error).message);
  }

  // 4. reconciliation — may legitimately fail (55) on supply drift
  try {
    const { artifactPath } = await reconcileSupply(p, undefined, { outDir: out });
    results["reconciliation"] = `closed -> ${artifactPath}`;
    console.log(`reconciliation: closed -> ${artifactPath}`);
  } catch (e) {
    note("reconciliation", exitCodeOf(e), (e as Error).message);
  }

  // 5. explorer
  let ex: ExplorerStatus | undefined;
  try {
    const { status, artifactPath } = await probeExplorer({ outDir: out });
    ex = status;
    results["explorer"] = `${status.reachable} lag=${status.lag_blocks}`;
    console.log(`explorer: ${results["explorer"]} -> ${artifactPath}`);
  } catch (e) {
    note("explorer", exitCodeOf(e), (e as Error).message);
  }

  // 6. chainlist entry — refused (52) is a valid measured result
  try {
    const cl = await prepareChainlistEntry({ outDir: out, health, explorer: ex, provider: p });
    if (cl.entry) {
      results["chainlist"] = `PRODUCED -> ${cl.artifactPath}`;
      console.log(`chainlist: PRODUCED -> ${cl.artifactPath}`);
    } else {
      results["chainlist"] = `REFUSED exit ${cl.refused?.code}: ${cl.refused?.reason}`;
      console.log(`chainlist: REFUSED (${cl.refused?.field}) — ${cl.refused?.reason}`);
      if ((cl.refused?.code ?? 0) > worst) worst = cl.refused!.code;
    }
  } catch (e) {
    note("chainlist", exitCodeOf(e), (e as Error).message);
  }

  // 7. verification inputs
  try {
    const { artifactPath: vPath } = await prepareVerification724(p, { outDir: `${process.cwd()}/verification-input/724/canonical` });
    results["verification-input"] = `-> ${vPath}`;
    console.log(`verification-input: -> ${vPath}`);
  } catch (e) {
    note("verification-input", exitCodeOf(e), (e as Error).message);
  }

  // 8. owner decisions — blanks stay blank; roles may be absent
  try {
    const od = await ownerDecisions724(p, { outPath: `${process.cwd()}/owner-decisions-724.md`, roles });
    results["owner-decisions"] = `${od.blanks} blanks preserved -> owner-decisions-724.md`;
    console.log(`owner-decisions: ${od.blanks} blanks preserved -> owner-decisions-724.md`);
  } catch (e) {
    note("owner-decisions", exitCodeOf(e), (e as Error).message);
  }

  console.log("\n== verify-724 summary ==");
  for (const [k, v] of Object.entries(results)) console.log(`  ${k}: ${v}`);
  console.log("  owner blanks: [OWNER DECISION 1..4] intentionally unfilled");
  if (worst > 0) {
    console.log(`verify-724: completed with failures, worst exit ${worst}`);
    process.exit(worst);
  }
  process.exit(0);
});
