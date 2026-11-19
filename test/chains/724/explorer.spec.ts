import { test } from "node:test";
import assert from "node:assert/strict";
import { extractCborMetadata } from "../../../src/chains/724/verification.ts";

test("cbor extractor returns nulls on empty code", () => {
  const r = extractCborMetadata("0x");
  assert.equal(r.ipfs, null);
  assert.equal(r.solc, null);
});
