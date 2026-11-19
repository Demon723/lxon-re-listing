import { readFileSync, existsSync } from "node:fs";
const p="smoke-test-724.md";
if(!existsSync(p)){console.log("SKIP smoke file absent");process.exit(0)}
const md=readFileSync(p,"utf8");
if(/\[SMOKE TEST RESULT: ______\]/.test(md)){console.log("PLANT OK smoke_result_filled_by_tool: blank preserved");process.exit(0)}
console.error("PLANT FAIL: result blank missing or filled");process.exit(1);
