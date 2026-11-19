import { test } from "node:test";
import assert from "node:assert/strict";
import { reconcileSupply } from "../../../src/chains/724/reconciliation.ts";
import { fakeProvider } from "../../plants-724/_fake.mjs";

const u256 = (n: bigint) => "0x" + n.toString(16).padStart(64, "0");
const E18 = 10n ** 18n;

test("closing identity: supply724 = stake + escrow + legacy_wLXON_137", async () => {
  // Measured live 2026-11-19: 4,071,052.000001 = 30,000 + 31,052 + 4,010,000.000001
  const p724 = fakeProvider({
    async call(_to: string, data: string) {
      if (data.startsWith("0x18160ddd")) return u256(4071052000001000000000000n); // LXON supply
      if (data.startsWith("0x70a08231")) return u256(61052n * E18);              // bridge balance
      if (data.startsWith("0xd01242f9")) return u256(31052n * E18);              // escrowed
      return "0x";
    },
  });
  const p137 = fakeProvider({
    async call(_to: string, data: string) {
      // canonical wLXON vs legacy wLXON distinguished by call target
      return "0x";
    },
  });
  // distinguish by `to` address instead
  const canon = "0x7a3c0c34f157efdd3e4913c5224c15e645469093";
  const legacy = "0xb2cfecb2aa1c53e8c4406146368222b6b3bbbbb6";
  const p137b = fakeProvider({
    async call(to: string) {
      const a = to.toLowerCase();
      if (a === canon) return u256(62104n * E18);
      if (a === legacy) return u256(4010000000001000000000000n);
      return "0x";
    },
  });
  void p137;
  const { rec } = await reconcileSupply(p724 as never, p137b as never, {});
  assert.equal(rec.arithmetic.closes, true);
  assert.equal(rec.arithmetic.residual.value, "0");
  assert.equal(rec.chain_724.validatorStake.raw, (30000n * E18).toString());
  assert.equal(rec.chain_137.legacy_totalSupply.raw, "4010000000001000000000000");
});
