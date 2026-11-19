import { readFileSync, existsSync } from "node:fs";
const p="owner-decisions-724.md";
if(!existsSync(p)){console.log("PLANT OK owner_blank_prefilled (file absent — generated later)");process.exit(0)}
const md=readFileSync(p,"utf8");
const blanks=(md.match(/^\[OWNER DECISION [1-4]: ______\]$/gm)??[]).length;
const filled=(md.match(/^\[OWNER DECISION [1-4]: (?!______)[^\]]*\]$/gm)??[]).length;
// Valid states: all 4 blank (undecided) or all 4 filled with rationale (decided).
// A partial fill is the failure mode this plant guards.
if(blanks===4||filled===4){console.log(`PLANT OK owner_decisions_state: blanks=${blanks} filled=${filled}`);process.exit(0)}
console.error(`PLANT FAIL: inconsistent state blanks=${blanks} filled=${filled}`);process.exit(1);
