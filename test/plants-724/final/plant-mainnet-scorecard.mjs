import { existsSync, readFileSync } from "node:fs";
const p="mainnet-readiness-724.md";
if(!existsSync(p)){console.log("SKIP scorecard absent");process.exit(0)}
const md=readFileSync(p,"utf8");
const m=md.match(/Mainnet ready: (YES|NO|BLOCKED BY OWNER)/);
if(!m){console.error("PLANT FAIL: no verdict");process.exit(1)}
if(m[1]==="YES"){
  // YES is only honest if the scorecard itself reports no blocking gaps.
  const blocking=(md.match(/Blocking gaps: (.+)/)||[])[1]??"";
  if(blocking && !/^none/.test(blocking.trim())){console.error(`PLANT FAIL: YES verdict but blocking gaps: ${blocking}`);process.exit(1)}
  console.log("PLANT OK mainnet_scorecard: YES with zero blocking gaps");process.exit(0);
}
console.log(`PLANT OK mainnet_ready_false_positive: verdict=${m[1]}`);process.exit(0);
