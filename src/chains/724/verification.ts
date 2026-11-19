// TASK 9 — verification package (GAP-724-F). Reads runtime bytecode, extracts
// the CBOR metadata tail, writes verification-input/724/canonical/ with the
// ipfs digest + solc version. NEVER claims "verified" — the digest is the
// artifact; verification is a third-party judgment.
import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { Provider } from "../../shared/provider.ts";
import { makeProvider } from "../../shared/provider.ts";
import { artifact, writeArtifact, sha256 } from "../../shared/artifact.ts";
import { CFG } from "./config.ts";

export interface VerificationInput {
  address: string;
  chainId: 724;
  blockTag: string;
  code_size: number;
  code_sha256: string;
  cbor: {
    ipfs: string | null;
    solc_version: string | null;
    cbor_hex: string;
  };
  source_path: string | null;
  repoPath_hint: string | null;
  note: string;
}

// CBOR tail: last 2 bytes = CBOR length; the digest map inside contains
// "ipfs" (multihash base58) and "solc" (version string).
export function extractCborMetadata(codeHex: string): { ipfs: string | null; solc: string | null; cborHex: string } {
  const code = codeHex.startsWith("0x") ? codeHex.slice(2) : codeHex;
  if (code.length < 4) return { ipfs: null, solc: null, cborHex: "" };
  const cborLen = parseInt(code.slice(-4), 16);
  const start = code.length - (cborLen + 2) * 2;
  if (start < 0) return { ipfs: null, solc: null, cborHex: "" };
  const cborHex = code.slice(start);
  const cbor = Buffer.from(cborHex, "hex");
  // Naive scan: find "ipfs" and "solc" keys and their following text strings.
  const text = cbor.toString("latin1");
  const grab = (key: string): string | null => {
    const i = text.indexOf(key);
    if (i < 0) return null;
    // value follows as a CBOR text string: 0x60+len or 0x78 len or 0x79 len16
    let j = i + key.length;
    const b = cbor[j];
    if (b === undefined) return null;
    let len = 0, off = j + 1;
    if (b >= 0x60 && b <= 0x77) { len = b & 0x1f; }
    else if (b === 0x78) { len = cbor[j + 1]; off = j + 2; }
    else if (b === 0x79) { len = (cbor[j + 1] << 8) | cbor[j + 2]; off = j + 3; }
    else return null;
    return cbor.slice(off, off + len).toString("utf8");
  };
  return { ipfs: grab("ipfs"), solc: grab("solc"), cborHex };
}

export async function prepareVerification724(
  provider?: Provider,
  opts: { outDir?: string; bundleUrl?: string } = {},
): Promise<{ inputs: VerificationInput[]; artifactPath?: string }> {
  const p = provider ?? (await makeProvider(CFG.rpcUrl, CFG.expectedChainId));
  const head = await p.blockNumber();
  const tag = "0x" + head.toString(16);

  // Read the provenance bundle for role→source mapping.
  let roles: Record<string, { source?: string; repoPath?: string }> = {};
  try {
    const res = await fetch(opts.bundleUrl ?? CFG.provenanceBundleUrl, { signal: AbortSignal.timeout(20_000) });
    const b = (await res.json()) as { contracts: { address: string; role: string; source?: string; repoPath?: string }[] };
    for (const c of b.contracts) roles[c.address.toLowerCase()] = { source: c.source, repoPath: c.repoPath };
  } catch { /* bundle optional for this artifact */ }

  const inputs: VerificationInput[] = [];
  for (const [addr, meta] of Object.entries(roles)) {
    const code = await p.getCode(addr, tag);
    if (code === "0x") continue;
    const codeBytes = (code.length - 2) / 2;
    const cbor = extractCborMetadata(code);
    inputs.push({
      address: addr,
      chainId: 724,
      blockTag: tag,
      code_size: codeBytes,
      code_sha256: sha256(Buffer.from(code.slice(2), "hex")),
      cbor,
      source_path: meta.source ?? null,
      repoPath_hint: meta.repoPath ?? null,
      note: "metadata digest extracted from deployed bytecode; this artifact does NOT claim the contract is verified — that is a third-party judgment",
    });
  }

  const out = opts.outDir ?? "verification-input/724/canonical";
  mkdirSync(out, { recursive: true });
  const manifest = inputs.map((i) => ({ address: i.address, role: Object.keys(roles).find((k) => k === i.address) ? undefined : undefined, ipfs: i.cbor.ipfs, solc: i.cbor.solc }));
  void manifest;
  writeFileSync(join(out, "manifest.json"), JSON.stringify({ generated_at_utc: new Date().toISOString(), blockTag: tag, inputs }, null, 1) + "\n");
  for (const i of inputs) {
    writeFileSync(join(out, `${i.address}.json`), JSON.stringify(i, null, 1) + "\n");
  }
  const artifactPath = `${opts.outDir ?? "artifacts"}/verification-724.json`;
  writeArtifact(artifactPath, artifact("verification-724", { count: inputs.length, out_dir: out }, { rpcUrl: p.url, blockTag: tag }));
  return { inputs, artifactPath };
}
