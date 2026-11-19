import { readFileSync, existsSync, readdirSync } from "node:fs";
const dir="verification-input/724/canonical";
if(!existsSync(dir)){console.log("SKIP verification dir absent");process.exit(0)}
const bad=[];
for(const f of readdirSync(dir)){
  const t=readFileSync(dir+"/"+f,"utf8");
  if(/\bverified\b/i.test(t) && !/not verified|never claim|does NOT claim/i.test(t)) bad.push(f);
}
if(!bad.length){console.log("PLANT OK verify_claim_no_proof: no 'verified' claims");process.exit(0)}
console.error("PLANT FAIL: "+bad.join(","));process.exit(1);
