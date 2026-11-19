import { existsSync, readFileSync } from "node:fs";
const p="mainnet-readiness-724.md";
if(!existsSync(p)){console.log("SKIP scorecard absent");process.exit(0)}
const md=readFileSync(p,"utf8");
const m=md.match(/Mainnet ready: (YES|NO|BLOCKED BY OWNER)/);
if(m && m[1]!=="YES"){console.log("PLANT OK mainnet_ready_false_positive: verdict="+m[1]);process.exit(0)}
if(m&&m[1]==="YES"){console.error("PLANT FAIL: YES verdict with open gaps?");process.exit(1)}
console.error("PLANT FAIL: no verdict");process.exit(1);
