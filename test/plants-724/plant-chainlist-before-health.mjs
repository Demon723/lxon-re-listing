// Chainlist entry must be refused (exit 52 path) while health is red.
import { prepareChainlistEntry } from "../../src/chains/724/chainlist.ts";
import { fakeProvider } from "./_fake.mjs";
const p = fakeProvider();
const redHealth = { head: "1", head_timestamp: "", blocks_sampled: 0, block_times_sec: null, produces_blocks: false, last_block_age_sec: 99999, non_adjacent_sample: false, status: "red", reasons: ["head older than AMBER_MAX_AGE"] };
const ex = { url: "https://x", reachable: true, head: "1", lag_blocks: 0, last_checked: "" };
const r = await prepareChainlistEntry({ provider: p, health: redHealth, explorer: ex, outDir: "/tmp/plant-cl" });
if (!r.entry && r.refused?.code === 52) { console.log("PLANT OK chainlist_before_health: refused exit 52"); process.exit(0); }
console.error(`PLANT FAIL chainlist_before_health: entry=${!!r.entry} code=${r.refused?.code}`);
process.exit(1);
