// Exit-code taxonomy. 724 codes live in the EXIT_724 namespace (50-59);
// shared/137 codes occupy lower ranges. Every code has a README row.
export const EXIT = {
  OK: 0,
  USAGE: 1,
  INTERNAL: 2,
  ARTIFACT_WRITE: 3,
  RPC_UNREACHABLE: 10,
  RPC_TLS: 11,
  RPC_DNS: 12,
  CHAINID_MISMATCH: 13,
  STALE_BLOCK: 14,
  DEPLOYMENT_MISMATCH: 24,
  OWNER_BLANK_FILLED: 13, // shared with generic misuse; see plants-724 table
} as const;

export const EXIT_724 = {
  CHAIN_NOT_PRODUCING: 50,
  EXPLORER_UNREACHABLE: 51,
  CHAINLIST_PRECONDITION_FAILED: 52,
  DEPLOYMENT_JSON_DIVERGES: 53,
  ROLE_PROBE_REFUSED: 54,
  SUPPLY_RECONCILIATION_FAILED: 55,
  BLOCK_TIME_REGRESSION: 56,
  MINER_SILENT: 57,
} as const;

export class ToolError extends Error {
  code: number;
  constructor(code: number, message: string) {
    super(message);
    this.name = "ToolError";
    this.code = code;
  }
}

export function die(code: number, msg: string): never {
  throw new ToolError(code, msg);
}

export const EXIT_724_FINAL = {
  WRITE_PATH_MISSING: 60,
  MIGRATION_PATH_ABSENT_AND_UNSTATED: 61,
  DEPLOYMENT_AND_LIVE_AGREE: 62,
  EXPLORER_HEAD_DRIFT: 63,
  CHAINLIST_LAG: 64,
  SMOKE_TEST_UNPROVEN: 65,
  RUNBOOK_SECTION_MISSING: 66,
  SMOKE_RESULT_PREFILLED: 67,
  HEALTH_GREEN_ON_RED: 68,
  MAINNET_READY_FALSE_POSITIVE: 69,
} as const;

export function exitCodeOf(e: unknown): number {
  if (e instanceof ToolError) return e.code;
  return EXIT.INTERNAL;
}
