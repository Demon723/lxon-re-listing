// Explorer URL that 404s must be "unmeasurable", never assumed broken/working.
const realFetch = globalThis.fetch;
globalThis.fetch = async (url, init) => {
  const u = String(url);
  const method = init?.body ? JSON.parse(init.body).method : "";
  if (method === "eth_chainId") {
    return new Response(JSON.stringify({ jsonrpc: "2.0", id: 1, result: "0x2d4" }), { status: 200 });
  }
  if (method === "eth_blockNumber") {
    return new Response(JSON.stringify({ jsonrpc: "2.0", id: 1, result: "0x64" }), { status: 200 });
  }
  if (method === "eth_getBlockByNumber") {
    return new Response(JSON.stringify({ jsonrpc: "2.0", id: 1, result: { number: "0x64", timestamp: "0x6553f100", hash: "0x" + "00".repeat(32) } }), { status: 200 });
  }
  return new Response("not found", { status: 404 });
};
const { probeExplorer } = await import("../../src/chains/724/explorer.ts");
const { status } = await probeExplorer({ explorerUrl: "https://explorer.invalid" });
if (status.reachable === "unmeasurable") { console.log("PLANT OK explorer_placeholder: unmeasurable, not broken"); process.exit(0); }
console.error(`PLANT FAIL explorer_placeholder: reachable=${status.reachable}`);
process.exit(1);
