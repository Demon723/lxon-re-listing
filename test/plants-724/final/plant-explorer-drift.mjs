// explorer reachable with lag>100 must not be reported as clean pass
import { probeExplorer } from "../../../src/chains/724/explorer.ts";
const { status } = await probeExplorer({});
const lagOk = status.lag_blocks === "unmeasurable" || (typeof status.lag_blocks === "number" && status.lag_blocks <= 100);
if (lagOk) { console.log("PLANT OK explorer_head_drift: lag=" + status.lag_blocks); process.exit(0); }
console.error("PLANT FAIL: lag=" + status.lag_blocks); process.exit(1);
