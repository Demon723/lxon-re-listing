// TASK 10 — owner decisions (GAP-724-H). Measures current state for the
// four open owner decisions and writes owner-decisions-724.md with four
// literal [OWNER DECISION N: ______] blanks. The tool NEVER fills them.
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import type { Provider } from "../../shared/provider.ts";
import { makeProvider } from "../../shared/provider.ts";
import { callData, decodeUint, decodeAddress, decodeBool, encodeUint, encodeAddress } from "../../shared/abi.ts";
import { CFG } from "./config.ts";
import { measureRoles, type RoleInventory } from "./roles.ts";

export interface OwnerDecisions {
  markdown: string;
  blanks: number;
}

export async function ownerDecisions724(
  provider?: Provider,
  opts: { outPath?: string; roles?: RoleInventory } = {},
): Promise<OwnerDecisions> {
  const p = provider ?? (await makeProvider(CFG.rpcUrl, CFG.expectedChainId));
  const head = await p.blockNumber();
  const tag = "0x" + head.toString(16);
  const call = async (to: string, sig: string, args: string[] = []) => {
    try { return await p.call(to, callData(sig, args), tag); } catch { return "0x"; }
  };

  let roles = opts.roles;
  if (!roles) {
    try {
      roles = (await measureRoles(p, { skipEventScan: true })).inventory;
    } catch {
      roles = {
        token: CFG.lxonToken, minterRoleHash: "", burnerRoleHash: "", adminRoleHash: "",
        roleHashSource: "unmeasured", minterHolders: [], burnerHolders: [], adminHolders: [],
        minterAdmin: "", burnerAdmin: "", adminAdmin: "",
        positiveControl: { address: "", role: "", result: true as const },
        candidates_tested: 0, provenance_calls: 0,
      };
    }
  }

  // V41 has no global cap()/payout()/payToken() — lanes are per-(srcChain,srcToken)
  // via inbound(uint256,address) -> (payToken, payout, cap, live). Measure the
  // LXON lane: srcChain 137, srcToken = canonical wLXON on Polygon.
  const WLXON_137 = "0x7A3c0C34f157EfDD3E4913c5224C15E645469093";
  const laneR = await call(CFG.bridgeV41, "inbound(uint256,address)", [encodeUint(137), encodeAddress(WLXON_137)]);
  let cap = "unmeasurable", payout = "unmeasurable", payToken = "unmeasurable", laneLive = "unmeasurable";
  if (laneR && laneR !== "0x" && laneR.length >= 2 + 64 * 4) {
    const h = laneR.slice(2);
    payToken = "0x" + h.slice(24, 64);
    payout = decodeUint("0x" + h.slice(64, 128)).toString();
    cap = decodeUint("0x" + h.slice(128, 192)).toString();
    laneLive = decodeBool("0x" + h.slice(192, 256)) ? "true" : "false";
  }
  const pausedR = await call(CFG.bridgeV41, "paused()");
  const sealedR = await call(CFG.bridgeV41, "configSealed()");
  const everUsedR = await call(CFG.bridgeV41, "everUsed()");
  const paused = pausedR !== "0x" ? decodeBool(pausedR) : "unmeasurable";
  const sealed = sealedR !== "0x" ? decodeBool(sealedR) : "unmeasurable";
  const everUsed = everUsedR !== "0x" ? decodeBool(everUsedR) : "unmeasurable";

  const minterList = roles.minterHolders.length ? roles.minterHolders.join(", ") : "none measured";

  const md = `# Owner decisions — chain 724 (${new Date().toISOString()}, block ${head})

Measured by the re-listing toolchain. Every number below was read live at
block ${head} via ${p.url}. These are measurements, not decisions — the four
sections each end with an unfilled owner blank.

## 1. Lane ceiling

Current: inbound(137, wLXON).cap = ${cap} (lane live=${laneLive})

Option A: no cap / Release payout needs no cap
Option A2: Mint payout requires cap > 0 and token bound to bridge
Option B: cap = current LXON totalSupply on 724
Option C: cap = <owner-named number>

[OWNER DECISION 1: ______]

## 2. Mint vs Escrow

Current: inbound(137, wLXON).payout = ${payout} (0=None,1=Release,2=Mint), payToken = ${payToken}

Option A: Mint on 137 against escrowed LXON on 724
Option B: Escrow on 137 against burned LXON on 724

[OWNER DECISION 2: ______]

## 3. MINTER_ROLE holder

Current: ${minterList} (role hash ${roles.minterRoleHash}, source ${roles.roleHashSource}; positive control ${roles.positiveControl.address} via ${roles.positiveControl.role})

Option A: bridge contract
Option B: multisig
Option C: timelock

[OWNER DECISION 3: ______]

## 4. Live window

Current: paused() = ${paused}, configSealed() = ${sealed}, everUsed() = ${everUsed}

Option A: always live
Option B: specific blocks
Option C: manual toggle

[OWNER DECISION 4: ______]
`;

  const blanks = (md.match(/\[OWNER DECISION \d+: ______\]/g) ?? []).length;
  const outPath = opts.outPath ?? join(process.cwd(), "owner-decisions-724.md");
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, md);
  return { markdown: md, blanks };
}
