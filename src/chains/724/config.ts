// 724 chain configuration. Every value is env-overridable so plants can
// point the toolchain at fixtures without editing sources.
export const CFG = {
  rpcUrl: process.env.LXON_RPC_724 ?? "https://rpc.lxon.in",
  expectedChainId: 724,
  provenanceBundleUrl:
    process.env.LXON_PROVENANCE_724 ?? "https://www.lxon.in/724-provenance.json",
  deploymentJson:
    process.env.LXON_DEPLOYMENT_JSON_724 ??
    "/Users/adikamble/LXON/LXON/apps/contracts/deployments/lxon-chain-724.json",
  explorerUrl:
    process.env.LXON_EXPLORER_724 ?? "https://explorer.lxon.in",
  infoUrl: process.env.LXON_INFO_URL ?? "https://www.lxon.in",
  writeRpcUrl: "https://explorer.lxon.in/write-rpc", // write-path Option B, live 2026-11-19
  artifactsDir: process.env.LXON_ARTIFACTS ?? "artifacts",
  lxonToken: "0x57b875ab86a40d79a1c35e44aa22008dfd049dc9",
  bridgeV41: "0xcd39954cd1484dd8c7277881f3a7d328a6940788",
  // Health thresholds (GAP-724-C)
  greenMaxAgeSec: Number(process.env.GREEN_MAX_AGE ?? 300),
  greenP95Sec: Number(process.env.GREEN_P95 ?? 30),
  amberMaxAgeSec: Number(process.env.AMBER_MAX_AGE ?? 1800),
  minSample: Number(process.env.MIN_SAMPLE ?? 10),
  maxGapBlocks: Number(process.env.MAX_GAP_BLOCKS ?? 2),
  explorerMaxLag: Number(process.env.HEALTH_MAX_LAG ?? 100),
} as const;
