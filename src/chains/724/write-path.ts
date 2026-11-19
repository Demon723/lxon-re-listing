// TASK 1 — write path (GAP-724-1). Probes whether any RPC accepts
// eth_sendRawTransaction. "method not found"/read-only refusal => false;
// "insufficient funds"/"invalid sender" => the endpoint accepts writes.
// Unmeasurable is never coerced to false or pass.
import { artifact, writeArtifact } from "../../shared/artifact.ts";
import { CFG } from "./config.ts";

export interface WritePathState {
  public_rpc_accepts_writes: boolean | "unmeasurable";
  write_rpc_configured: boolean;
  write_rpc_url: string | null;
  documented_path: "Option A" | "Option B" | "Option C" | null;
  evidence: { probe: string; result: string }[];
  options: { id: string; description: string; measured_state: string }[];
}

const TEST_RAW = "0xdeadbeef"; // deliberately malformed: a read-only gateway refuses the METHOD (-32601) before parsing the tx

async function probeSend(url: string): Promise<{ kind: string; raw: string }> {
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", method: "eth_sendRawTransaction", params: [TEST_RAW], id: 1 }),
      signal: AbortSignal.timeout(15_000),
    });
    const j = (await res.json().catch(() => null)) as any;
    const msg = String(j?.error?.message ?? j?.result ?? "").toLowerCase();
    // The LXON gateway answers write attempts with HTTP 403 AND a JSON-RPC
    // -32601 body — parse the body before judging reachability.
    if (res.status !== 200 && !msg) return { kind: "unmeasurable", raw: `http ${res.status}` };
    if (j?.error?.code === -32601 || msg.includes("not available") || msg.includes("read-only") || msg.includes("not found"))
      return { kind: "read_only", raw: msg };
    if (msg.includes("insufficient funds") || msg.includes("insufficient balance"))
      return { kind: "accepts_writes", raw: msg };
    if (msg.includes("invalid") || msg.includes("sender") || msg.includes("nonce") || msg.includes("intrinsic"))
      return { kind: "accepts_writes", raw: msg };
    return { kind: "unmeasurable", raw: msg };
  } catch (e) {
    return { kind: "unmeasurable", raw: (e as Error).message };
  }
}

export function classifyProbe(kind: string): boolean | "unmeasurable" {
  if (kind === "read_only") return false;
  if (kind === "accepts_writes") return true;
  return "unmeasurable";
}

export async function probeWritePath(opts: { outDir?: string } = {}): Promise<{ state: WritePathState; artifactPath?: string }> {
  const evidence: { probe: string; result: string }[] = [];

  const pub = await probeSend(CFG.rpcUrl);
  evidence.push({ probe: `eth_sendRawTransaction -> ${CFG.rpcUrl}`, result: `${pub.kind}: ${pub.raw}` });
  const publicAccepts = classifyProbe(pub.kind);

  const writeUrl = process.env.LXON_WRITE_RPC_724 ?? CFG.writeRpcUrl ?? null;
  let writeConfigured = false;
  let writeAccepts: boolean | "unmeasurable" = "unmeasurable";
  if (writeUrl) {
    writeConfigured = true;
    const w = await probeSend(writeUrl);
    evidence.push({ probe: `eth_sendRawTransaction -> ${writeUrl}`, result: `${w.kind}: ${w.raw}` });
    writeAccepts = classifyProbe(w.kind);
  }

  const accepts = publicAccepts === true || writeAccepts === true;
  const state: WritePathState = {
    public_rpc_accepts_writes: publicAccepts,
    write_rpc_configured: writeConfigured,
    write_rpc_url: writeUrl,
    documented_path: accepts ? (writeConfigured ? "Option B" : "Option A") : null,
    evidence,
    options: [
      { id: "Option A", description: "enable eth_sendRawTransaction on public RPC behind rate limits/quotas", measured_state: publicAccepts === true ? "available" : publicAccepts === false ? "refused (-32601 read-only)" : "unmeasurable" },
      { id: "Option B", description: "second endpoint write.rpc.lxon.in with allowlist/token", measured_state: writeConfigured ? `configured ${writeUrl} accepts=${writeAccepts}` : "not configured" },
      { id: "Option C", description: "settlement chain: users transact on 137, 724 is backing ledger", measured_state: accepts ? "not needed" : "only honest path until A or B exists" },
    ],
  };

  let artifactPath: string | undefined;
  if (opts.outDir) {
    artifactPath = `${opts.outDir}/write-path-724.json`;
    writeArtifact(artifactPath, artifact("write-path-724", state));
  }
  return { state, artifactPath };
}
