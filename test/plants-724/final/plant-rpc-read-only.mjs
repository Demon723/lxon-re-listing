import { probeWritePath, classifyProbe } from "../../../src/chains/724/write-path.ts";
const { state } = await probeWritePath({});
if (state.public_rpc_accepts_writes === false) { console.log("PLANT OK rpc_read_only_as_green: read-only measured, not pass"); process.exit(0); }
console.error("PLANT FAIL: accepts=" + state.public_rpc_accepts_writes); process.exit(1);
