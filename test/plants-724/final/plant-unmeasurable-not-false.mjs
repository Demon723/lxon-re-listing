import { classifyProbe } from "../../../src/chains/724/write-path.ts";
if (classifyProbe("unmeasurable")==="unmeasurable" && classifyProbe("read_only")===false){console.log("PLANT OK unmeasurable_as_zero: distinct states");process.exit(0)}
console.error("PLANT FAIL");process.exit(1);
