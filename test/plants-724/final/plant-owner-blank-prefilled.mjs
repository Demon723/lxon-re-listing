import { readFileSync, existsSync } from "node:fs";
const p="owner-decisions-724.md";
if(!existsSync(p)){console.log("PLANT OK owner_blank_prefilled (file absent — generated later)");process.exit(0)}
const md=readFileSync(p,"utf8");
const blanks=(md.match(/^\[OWNER DECISION [1-4]: ______\]$/gm)??[]).length;
if(blanks===4){console.log("PLANT OK owner_blank_prefilled: 4 literal blanks");process.exit(0)}
console.error(`PLANT FAIL: ${blanks} blanks`);process.exit(1);
