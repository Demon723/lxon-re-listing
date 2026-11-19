// owner-decisions-724.md must contain exactly 4 [OWNER DECISION] blanks and
// zero filled-in values. We simulate by generating with a fake provider and
// checking the artifact, plus scanning the real file if present.
import { readFileSync, existsSync } from "node:fs";
import { ownerDecisions724 } from "../../src/chains/724/owner-decisions.ts";
import { fakeProvider } from "./_fake.mjs";

const p = fakeProvider({
  async call(to, data) {
    const w = (n) => "0x" + BigInt(n).toString(16).padStart(64, "0");
    if (data.startsWith("0x63bd1d4a") || data.startsWith("0x355274ea") || data.startsWith("0x18160ddd")) return w(1);
    if (data.startsWith("0x5c975abb") || data.startsWith("0x58624a73") || data.startsWith("0xb322b3d2")) return w(0);
    if (data.startsWith("0x96336b30") || data.startsWith("0x248a9ca3")) return "0x" + "0".repeat(24) + "11".repeat(20);
    return "0x";
  },
});
const roles = { minterRoleHash: "0x" + "11".repeat(32), burnerRoleHash: "0x" + "22".repeat(32), adminRoleHash: "0x" + "33".repeat(32), roleHashSource: "test", minterHolders: ["0x1111111111111111111111111111111111111111"], burnerHolders: [], adminHolders: [], minterAdmin: "0x" + "0".repeat(64), burnerAdmin: "0x" + "0".repeat(64), adminAdmin: "0x" + "0".repeat(64), positiveControl: { address: "0x1", role: "MINTER", result: true }, candidates_tested: 1, provenance_calls: 3 };
const r = await ownerDecisions724(p, { outPath: "/tmp/plant-owner.md", roles });
const md = r.markdown;
const markers = (md.match(/\[OWNER DECISION \d+: ______\]/g) ?? []).length;
const filled = /\[OWNER DECISION \d+: (?!______)/.test(md);
if (markers === 4 && !filled) {
  // also verify the on-disk file if it exists
  if (existsSync("owner-decisions-724.md")) {
    const disk = readFileSync("owner-decisions-724.md", "utf8");
    const dm = (disk.match(/\[OWNER DECISION/g) ?? []).length;
    if (dm !== 4) { console.error(`PLANT FAIL owner_prefilled: disk file has ${dm} markers`); process.exit(1); }
  }
  console.log("PLANT OK owner_prefilled: 4 blanks, none filled");
  process.exit(0);
}
console.error(`PLANT FAIL owner_prefilled: markers=${markers} filled=${filled}`);
process.exit(1);
