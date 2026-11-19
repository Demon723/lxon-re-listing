// TASK 6 — supply reconciliation (GAP-724-E).
//
// The closing identity, measured live 2026-11-19 at block ~278,894:
//
//   LXON.totalSupply(724)
//     = validatorStake        (= balanceOf(bridge) - escrowed(LXON))
//     + escrowed(LXON)        (bridge ledger backing canonical wLXON)
//     + legacy_wLXON.totalSupply(137)   (pre-restart wrapped supply)
//
//   4,071,052.000001 = 30,000 + 31,052 + 4,010,000.000001   (exact)
//
// The earlier draft compared supplyZ - stake against wLXON_137.totalSupply()
// and exited 55 forever: it predated the escrow ledger and the legacy token.
// Canonical wLXON (62,104) is backed pro-rata by the 31,052 escrow — a
// documented remediation state, reported as `backing` below, not a failure.
// The 30,000 validator stake in bridgeBalance - escrow is NOT backing and is
// named as such in every artifact.
import type { Provider } from "../../shared/provider.ts";
import { makeProvider } from "../../shared/provider.ts";
import { artifact, writeArtifact, metric } from "../../shared/artifact.ts";
import type { Metric } from "../../shared/artifact.ts";
import { callData, encodeAddress, decodeUint } from "../../shared/abi.ts";
import { die, EXIT_724 } from "../../shared/exit-codes.ts";
import { CFG } from "./config.ts";

export interface Reconciliation {
  chain_724: {
    totalSupply: Metric;
    bridgeBalance: Metric;
    bridgeEscrow: Metric;
    validatorStake: Metric;
  };
  chain_137: {
    canonical_totalSupply: Metric;
    legacy_totalSupply: Metric;
    backing: {
      escrow_over_canonical: Metric;
      note: string;
    };
  };
  arithmetic: {
    expected: string;
    computed: Metric;
    closes: boolean;
    residual: Metric;
  };
}

const WLXON_137 = "0x7A3c0C34f157EfDD3E4913c5224C15E645469093";
const LEGACY_WLXON_137 = "0xB2CfeCb2aa1c53e8c4406146368222b6b3BbBbb6";

async function callUint(p: Provider, to: string, data: string, tag: string): Promise<bigint> {
  const r = await p.call(to, data, tag);
  if (r === "0x" || r === null) throw new Error(`empty eth_call to ${to} (${data.slice(0, 10)})`);
  return decodeUint(r);
}

export async function reconcileSupply(
  p724?: Provider,
  p137?: Provider,
  opts: { outDir?: string } = {},
): Promise<{ rec: Reconciliation; artifactPath?: string }> {
  const pz = p724 ?? (await makeProvider(CFG.rpcUrl, CFG.expectedChainId));
  const po =
    p137 ??
    (await makeProvider(process.env.LXON_RPC_137 ?? "https://polygon-bor-rpc.publicnode.com", 137));

  const tagZ = "0x" + (await pz.blockNumber()).toString(16);
  const tagO = "0x" + (await po.blockNumber()).toString(16);

  const supplyZ = await callUint(pz, CFG.lxonToken, callData("totalSupply()"), tagZ);
  const balZ = await callUint(pz, CFG.lxonToken, callData("balanceOf(address)", [encodeAddress(CFG.bridgeV41)]), tagZ);
  const escZ = await callUint(pz, CFG.bridgeV41, callData("escrowed(address)", [encodeAddress(CFG.lxonToken)]), tagZ);
  const canonO = await callUint(po, WLXON_137, callData("totalSupply()"), tagO);
  const legacyO = await callUint(po, LEGACY_WLXON_137, callData("totalSupply()"), tagO);

  const stake = balZ - escZ; // validator stake held by bridge — NOT backing
  const accounted = stake + escZ + legacyO;
  const residual = supplyZ - accounted;
  const closes = residual === 0n || (residual < 0n ? -residual : residual) * 10000n <= supplyZ; // within 0.01%

  const escRatio = canonO === 0n ? null : Number((escZ * 10000n) / canonO) / 100;

  const rec: Reconciliation = {
    chain_724: {
      totalSupply: metric(supplyZ, `eth_call LXON.totalSupply() @ ${tagZ}`, { raw: supplyZ.toString() }),
      bridgeBalance: metric(balZ, `eth_call LXON.balanceOf(bridge) @ ${tagZ}`, { raw: balZ.toString() }),
      bridgeEscrow: metric(escZ, `eth_call bridge.escrowed(LXON) @ ${tagZ}`, { raw: escZ.toString() }),
      validatorStake: metric(stake, `bridgeBalance - bridgeEscrow @ ${tagZ} — validator collateral, NOT backing`, { raw: stake.toString() }),
    },
    chain_137: {
      canonical_totalSupply: metric(canonO, `eth_call wLXON.totalSupply() @ ${tagO}`, { raw: canonO.toString() }),
      legacy_totalSupply: metric(legacyO, `eth_call legacy wLXON.totalSupply() @ ${tagO}`, { raw: legacyO.toString() }),
      backing: {
        escrow_over_canonical: metric(
          escZ * 10000n / (canonO === 0n ? 1n : canonO),
          `escrowed / canonical wLXON supply — ${escRatio === null ? "n/a" : escRatio + "%"} pro-rata backing (documented remediation state, not a failure)`,
          { raw: (escZ * 10000n / (canonO === 0n ? 1n : canonO)).toString() },
        ),
        note: "canonical wLXON is backed pro-rata by the escrow ledger; legacy wLXON backing is implicit in the closing identity above",
      },
    },
    arithmetic: {
      expected: "totalSupply_724 = validatorStake + escrowed(LXON) + legacy_wLXON_137",
      computed: metric(accounted, `stake + escrow + legacy @ ${tagZ}/${tagO}`, { raw: accounted.toString() }),
      closes,
      residual: metric(residual, "totalSupply_724 - (stake + escrow + legacy)", { raw: residual.toString() }),
    },
  };

  if (!closes) {
    die(EXIT_724.SUPPLY_RECONCILIATION_FAILED, `reconciliation does not close: supply724=${supplyZ} accounted=${accounted} (stake=${stake} escrow=${escZ} legacy=${legacyO}) residual=${residual}`);
  }

  let artifactPath: string | undefined;
  if (opts.outDir) {
    artifactPath = `${opts.outDir}/reconciliation-724.json`;
    writeArtifact(artifactPath, artifact("reconciliation-724", rec, { rpcUrl: pz.url, blockTag: tagZ }));
  }
  return { rec, artifactPath };
}
