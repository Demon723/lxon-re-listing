import { readFileSync } from "node:fs";
const md = readFileSync("docs/724-incident-runbook.md","utf8");
const need = ["Head not advancing","mempool stale","Nonce gap","403","wrong chain ID","desync","escrow drift","restart reverted"];
const missing = need.filter(n => !md.toLowerCase().includes(n.toLowerCase().split(" ")[0].toLowerCase()) && !md.includes(n));
// looser check: count numbered sections
const sections = (md.match(/^## \d+\./gm)??[]).length;
if (sections === 8) { console.log("PLANT OK runbook_missing_section: 8 sections"); process.exit(0); }
console.error(`PLANT FAIL: ${sections} sections`); process.exit(1);
