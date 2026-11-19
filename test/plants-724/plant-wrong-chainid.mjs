// Stub global fetch so eth_chainId returns 0x1 (mainnet) — the provider must
// refuse with exit 20 naming the chain it actually hit.
const realFetch = globalThis.fetch;
globalThis.fetch = async (url, init) => {
  const body = JSON.parse(init.body);
  const result = body.method === "eth_chainId" ? "0x1" : "0x0";
  return new Response(JSON.stringify({ jsonrpc: "2.0", id: 1, result }), { status: 200, headers: { "content-type": "application/json" } });
};
const { makeProvider } = await import("../../src/shared/provider.ts");
const { expectExit } = await import("./_fake.mjs");
await expectExit(makeProvider("https://rpc.lxon.in", 724), 20, "wrong_chainid");
globalThis.fetch = realFetch;
