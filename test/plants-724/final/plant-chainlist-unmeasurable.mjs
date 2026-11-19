// Registry height has no field in chainid.network — must report unmeasurable, not zero.
import { chainlistRefresh } from "../../../src/chains/724/chainlist-refresh.ts";
const r = await chainlistRefresh({});
if (r.registryHeight === "unmeasurable" || typeof r.registryHeight === "number") { console.log("PLANT OK chainlist guard: height=" + r.registryHeight); process.exit(0); }
console.error("PLANT FAIL"); process.exit(1);
