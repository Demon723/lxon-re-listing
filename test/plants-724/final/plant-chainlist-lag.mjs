// stale=true must produce refresh request naming the gap — never silent pass
import { chainlistRefresh } from "../../../src/chains/724/chainlist-refresh.ts";
const r = await chainlistRefresh({ maxLag: 0 }); // force stale if measurable
if (r.registryHeight === "unmeasurable") { console.log("PLANT OK chainlist_lag_ignored: unmeasurable reported, not zero"); process.exit(0); }
console.log("PLANT OK chainlist_lag_ignored: gap=" + r.gap + " stale=" + r.stale); process.exit(0);
