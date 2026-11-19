// Shared fakes for plants. Not a plant itself (underscore prefix, .mjs but
// plants-724.ts only runs files matching plant-*.mjs — see runner).
export function fakeProvider(overrides = {}) {
  return {
    url: "https://fixture.invalid",
    chainId: 724,
    async call() { return "0x"; },
    async blockNumber() { return 1000n; },
    async getBlock(n) {
      const num = typeof n === "bigint" ? n : 1000n;
      return { number: num, timestamp: 1700000000n + num, hash: "0x" + "ab".repeat(32) };
    },
    async getCode() { return "0x"; },
    ...overrides,
  };
}
export function expectExit(promise, code, label) {
  return promise.then(
    () => { console.error(`PLANT FAIL ${label}: expected exit ${code}, got success`); process.exit(1); },
    (e) => {
      const got = e?.code ?? e?.exitCode ?? null;
      if (got === code) { console.log(`PLANT OK ${label}: exit ${code} (${e.message.slice(0, 80)})`); process.exit(0); }
      console.error(`PLANT FAIL ${label}: expected exit ${code}, got ${got}: ${e.message}`);
      process.exit(1);
    },
  );
}
