import { existsSync, readFileSync } from "node:fs";
for (const f of ["deployments/lxon-chain-724.live.json","deployments/lxon-chain-724.retired.json","deployments/README.md"]) {
  if(!existsSync(f)){console.log("SKIP "+f+" absent (run writeDeploymentRecord)");process.exit(0)}
}
const live=JSON.parse(readFileSync("deployments/lxon-chain-724.live.json","utf8"));
const retired=JSON.parse(readFileSync("deployments/lxon-chain-724.retired.json","utf8"));
const v=live.value??live, rv=retired.value??retired;
if((v.addresses??[]).length>0 && (rv.retired??[]).length>=25){console.log("PLANT OK deployment_stale_as_live: live>0 retired>=25");process.exit(0)}
console.error("PLANT FAIL");process.exit(1);
