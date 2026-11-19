// hasRole returns false for every candidate → positive control impossible → exit 54.
import { measureRoles } from "../../src/chains/724/roles.ts";
import { fakeProvider, expectExit } from "./_fake.mjs";
const word = "0x" + "0".repeat(64);
const p = fakeProvider({
  async call() { return word; }, // every call returns 0
});
await expectExit(measureRoles(p, { candidates: ["0x1111111111111111111111111111111111111111"] }), 54, "role_no_control");
