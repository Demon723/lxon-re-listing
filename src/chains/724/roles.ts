// TASK 5 — role inventory (GAP-724-D). Enumerates MINTER/BURNER/ADMIN
// holders on the 724 LXON token. Positive control is mandatory: at least
// one (role,address) must return true before any false is believed.
import type { Provider } from "../../shared/provider.ts";
import { makeProvider } from "../../shared/provider.ts";
import { artifact, writeArtifact } from "../../shared/artifact.ts";
import { callData, encodeAddress, encodeBytes32, decodeUint, decodeAddress } from "../../shared/abi.ts";
import { die, EXIT_724 } from "../../shared/exit-codes.ts";
import { CFG } from "./config.ts";

export interface RoleInventory {
  token: string;
  minterRoleHash: string;
  burnerRoleHash: string;
  adminRoleHash: string;
  roleHashSource: string;
  minterHolders: string[];
  burnerHolders: string[];
  adminHolders: string[];
  minterAdmin: string;
  burnerAdmin: string;
  adminAdmin: string;
  positiveControl: { address: string; role: string; result: true };
  candidates_tested: number;
  provenance_calls: number;
}

// keccak256("ROLE") values, pinned via `cast keccak`. Used when the token
// does not expose a public getter for the role constant.
export const ROLE_HASHES = {
  MINTER_ROLE: "0x9f2df0fed2c77648de5860a4cc508cd0818c85b8b8a1ab4ceeef8d981c8956a6",
  BURNER_ROLE: "0x3c11d16cbaffd01df69ce1c404f6340ee057498f5f00246190ea54220576a848",
  DEFAULT_ADMIN_ROLE: "0x" + "0".repeat(64), // OZ AccessControl: DEFAULT_ADMIN_ROLE is bytes32(0)
} as const;

export async function measureRoles(
  provider?: Provider,
  opts: { candidates?: string[]; outDir?: string; skipEventScan?: boolean } = {},
): Promise<{ inventory: RoleInventory; artifactPath?: string }> {
  const p = provider ?? (await makeProvider(CFG.rpcUrl, CFG.expectedChainId));
  const token = CFG.lxonToken;
  const head = await p.blockNumber();
  const blockTag = "0x" + head.toString(16);

  // Candidate set: explicit candidates + every account ever named in a
  // RoleGranted/RoleRevoked log on this token (chunked; public RPC caps
  // eth_getLogs ranges). Event-derived candidates are what makes the
  // inventory complete — the deployer EOA is not in the provenance bundle.
  const ROLE_GRANTED = "0x2f8788117e7eff1d82e926ec794901d17c78024a50270940304540a733656f0d";
  const ROLE_REVOKED = "0xf6391f5c32d9c69d2a47ea670b442974b53935d1edc7fd64eb21e047a839171b";
  const baseCandidates = [
    CFG.bridgeV41,
    "0x6daf1b064c5602353e9dd770c263748753f7f98e", // Timelock
    "0xFaE699d2848957c7c3bE67D8c90f0E456419cAdA", // deployer/validator
    "0xd8e2146BBf2c1439De6A64A7AC620813e007C8d2", // post-restart deployer EOA
    token,
    ...(opts.candidates ?? []), // caller-supplied (e.g. live set) — merged, never replaces
  ];
  const eventAccounts = new Set<string>();
  if (!opts.skipEventScan) {
    const head0 = await p.blockNumber();
    const CHUNK = 4500;
    for (let s = 0; s <= Number(head0); s += CHUNK) {
      const e = Math.min(s + CHUNK - 1, Number(head0));
      for (const topic of [ROLE_GRANTED, ROLE_REVOKED]) {
        try {
          const logs = (await p.logs?.({ address: token, topics: [topic], fromBlock: "0x" + s.toString(16), toBlock: "0x" + e.toString(16) })) ?? [];
          for (const l of logs) {
            if (l.topics[2]) eventAccounts.add("0x" + l.topics[2].slice(-40));
          }
        } catch { /* range unsupported — skip chunk */ }
      }
    }
  }
  const uniq = [...new Set([...baseCandidates, ...eventAccounts].map((a) => a.toLowerCase()))];

  const call = async (sig: string, args: string[] = []) => {
    const data = callData(sig, args);
    try {
      return await p.call(token, data, blockTag);
    } catch {
      return null; // revert / no such function
    }
  };

  // Try the public getters first; fall back to pinned keccak constants.
  let roleSource = "getter";
  let minterHash = ROLE_HASHES.MINTER_ROLE;
  let burnerHash = ROLE_HASHES.BURNER_ROLE;
  let adminHash = ROLE_HASHES.DEFAULT_ADMIN_ROLE;
  const m = await call("MINTER_ROLE()");
  const b = await call("BURNER_ROLE()");
  const a = await call("DEFAULT_ADMIN_ROLE()");
  if (m && m !== "0x") minterHash = "0x" + m.slice(-64);
  if (b && b !== "0x") burnerHash = "0x" + b.slice(-64);
  if (a && a !== "0x") adminHash = "0x" + a.slice(-64);
  if (!(m && m !== "0x") && !(b && b !== "0x") && !(a && a !== "0x")) roleSource = "keccak-constant";

  const hasRole = async (role: string, addr: string): Promise<boolean | null> => {
    const r = await call("hasRole(bytes32,address)", [encodeBytes32(role), encodeAddress(addr)]);
    if (r === null || r === "0x") return null;
    return decodeUint(r) !== 0n;
  };

  const roleAdmin = async (role: string): Promise<string> => {
    const r = await call("getRoleAdmin(bytes32)", [encodeBytes32(role)]);
    if (r === null || r === "0x") return "0x" + "0".repeat(64);
    return decodeAddress(r);
  };

  // Positive control FIRST: scan candidates for any true.
  let positiveControl: RoleInventory["positiveControl"] | null = null;
  const results: Record<string, Record<string, boolean | null>> = {
    [minterHash]: {},
    [burnerHash]: {},
    [adminHash]: {},
  };
  let calls = 0;
  for (const addr of uniq) {
    for (const [roleName, roleHash] of [
      ["MINTER", minterHash],
      ["BURNER", burnerHash],
      ["ADMIN", adminHash],
    ] as const) {
      const v = await hasRole(roleHash, addr);
      calls++;
      results[roleHash][addr] = v;
      if (v === true && !positiveControl) {
        positiveControl = { address: addr, role: roleName, result: true };
      }
    }
  }
  if (!positiveControl) {
    die(EXIT_724.ROLE_PROBE_REFUSED, "no MINTER_ROLE/BURNER_ROLE/ADMIN holder found among candidates — probe may be broken or roles unassigned; both require owner decision");
  }

  const holders = (hash: string) =>
    Object.entries(results[hash]).filter(([, v]) => v === true).map(([a]) => a);

  const inventory: RoleInventory = {
    token,
    minterRoleHash: minterHash,
    burnerRoleHash: burnerHash,
    adminRoleHash: adminHash,
    roleHashSource: roleSource,
    minterHolders: holders(minterHash),
    burnerHolders: holders(burnerHash),
    adminHolders: holders(adminHash),
    minterAdmin: await roleAdmin(minterHash),
    burnerAdmin: await roleAdmin(burnerHash),
    adminAdmin: await roleAdmin(adminHash),
    positiveControl,
    candidates_tested: uniq.length,
    provenance_calls: calls,
  };

  let artifactPath: string | undefined;
  if (opts.outDir) {
    artifactPath = `${opts.outDir}/roles-724.json`;
    writeArtifact(artifactPath, artifact("roles-724", inventory, { rpcUrl: p.url, blockTag }));
  }
  return { inventory, artifactPath };
}
