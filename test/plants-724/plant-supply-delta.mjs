// A 1-unit change in 724 supply must surface as a non-closing residual → exit 55.
import { reconcileSupply } from "../../src/chains/724/reconciliation.ts";
import { fakeProvider, expectExit } from "./_fake.mjs";
import { callData, encodeAddress } from "../../src/shared/abi.ts";

const u256 = (n) => "0x" + BigInt(n).toString(16).padStart(64, "0");
const addr = (a) => "0x" + "0".repeat(24) + a.slice(2);

const p724 = fakeProvider({
  async call(to, data) {
    if (data.startsWith("0x18160ddd")) return u256(4071052000001000000000001n); // +1 wei drift
    if (data.startsWith("0x70a08231")) return u256(61052n * 10n ** 18n);
    if (data.startsWith("0xd01242f9")) return u256(31052n * 10n ** 18n);
    if (data.startsWith("0x8fb44409")) return u256(0n);
    return "0x";
  },
});
const p137 = fakeProvider({
  async call() { return u256(62104n * 10n ** 18n); },
});
await expectExit(reconcileSupply(p724, p137, {}), 55, "supply_delta");
