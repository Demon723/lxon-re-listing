import { test } from "node:test";
import assert from "node:assert/strict";
import { measureRoles, ROLE_HASHES } from "../../../src/chains/724/roles.ts";
import { fakeProvider } from "../../plants-724/_fake.mjs";

test("positive control found and holders enumerated", async () => {
  const minter = "0x1111111111111111111111111111111111111111";
  const p = fakeProvider({
    async call(_to: string, data: string) {
      // hasRole(bytes32,address): selector 0x91d14854; return 1 only for minter+MINTER hash
      if (data.startsWith("0x91d14854")) {
        const role = data.slice(10, 74);
        const addrWord = data.slice(74, 138);
        const isMinter = addrWord.endsWith(minter.slice(2));
        const isMinterRole = role === ROLE_HASHES.MINTER_ROLE.slice(2);
        return "0x" + (isMinter && isMinterRole ? "1" : "0").padStart(64, "0");
      }
      if (data.startsWith("0x248a9ca3")) return "0x" + "0".repeat(64); // getRoleAdmin
      return "0x"; // MINTER_ROLE() getter absent → keccak fallback
    },
  });
  const { inventory } = await measureRoles(p as never, { candidates: [minter, "0x2222222222222222222222222222222222222222"] });
  assert.equal(inventory.positiveControl.result, true);
  assert.deepEqual(inventory.minterHolders.sort(), [minter].sort());
  assert.equal(inventory.burnerHolders.length, 0);
});
