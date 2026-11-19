// Runs the ten plants under test/plants-724/ and reports pass/fail.
import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { execFileSync } from "node:child_process";

const dir = "test/plants-724";
const walk=(d)=>readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(join(d,e.name)):(e.name.startsWith("plant-")&&e.name.endsWith(".mjs")?[join(d,e.name)]:[]));
const files = walk(dir).sort();
let fail = 0;
for (const f of files) {
  try {
    const out = execFileSync("node", [f], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
    console.log(`PASS ${f}: ${out.trim().split("\n").pop()}`);
  } catch (e) {
    fail++;
    const err = e as { status?: number; stderr?: string; stdout?: string };
    console.log(`FAIL ${f}: exit ${err.status} ${(err.stderr || err.stdout || "").trim().split("\n").pop()}`);
  }
}
console.log(`${files.length - fail}/${files.length} plants passed`);
process.exit(fail ? 1 : 0);
