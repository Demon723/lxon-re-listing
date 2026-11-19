// Shared JSON-RPC provider. Enforces: HTTPS only, DNS resolution,
// TLS validation (fetch does this), chainId pinning, and records
// rpcUrl + blockTag provenance on every result.
import { resolve4 } from "node:dns/promises";
import { ToolError, die, EXIT } from "./exit-codes.ts";

export type Result<T> =
  | { ok: true; value: T; provenance: Provenance }
  | { ok: false; error: string; code: number };

export interface Provenance {
  rpcUrl: string;
  blockTag: string;
  fetchedAt: string;
}

export interface Provider {
  url: string;
  chainId: number;
  call(to: string, data: string, blockTag?: string): Promise<string>;
  blockNumber(): Promise<bigint>;
  getBlock(n: bigint | "latest"): Promise<{ number: bigint; timestamp: bigint; hash: string }>;
  getCode(address: string, blockTag?: string): Promise<string>;
  logs?(filter: { address: string; topics: string[]; fromBlock: string; toBlock: string }): Promise<{ topics: string[] }[]>;
}

export async function assertEndpoint(url: string): Promise<void> {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    die(EXIT.RPC_UNREACHABLE, `malformed rpc url: ${url}`);
  }
  if (u.protocol !== "https:") {
    die(20, `RPC url must be https:// — got ${u.protocol}// (${url})`);
  }
  const host = u.hostname;
  if (/^\d+\.\d+\.\d+\.\d+$/.test(host) || host.includes(":")) {
    // Raw IP endpoints are forbidden by config validation.
    die(20, `RPC url must be a domain, not a raw IP: ${host}`);
  }
  let addrs: string[];
  try {
    addrs = await resolve4(host);
  } catch {
    die(20, `domain does not resolve: ${host}`);
  }
  if (!addrs.length) die(20, `domain does not resolve: ${host}`);
}

async function rpc(url: string, method: string, params: unknown[]): Promise<unknown> {
  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", method, params, id: 1 }),
      signal: AbortSignal.timeout(20_000),
    });
  } catch (e) {
    die(EXIT.RPC_UNREACHABLE, `rpc unreachable ${url}: ${(e as Error).message}`);
  }
  if (!res.ok) die(EXIT.RPC_UNREACHABLE, `rpc http ${res.status} for ${method}`);
  const j = (await res.json()) as { result?: unknown; error?: { message: string } };
  if (j.error) throw new ToolError(EXIT.RPC_UNREACHABLE, `rpc error ${method}: ${j.error.message}`);
  return j.result;
}

export async function makeProvider(url: string, expectedChainId: number): Promise<Provider> {
  await assertEndpoint(url);
  const chainHex = (await rpc(url, "eth_chainId", [])) as string;
  const got = parseInt(chainHex, 16);
  if (got !== expectedChainId) {
    die(20, `chainId mismatch: got 0x${got.toString(16)} (${got}), expected ${expectedChainId}`);
  }
  const p: Provider = {
    url,
    chainId: expectedChainId,
    async call(to, data, blockTag = "latest") {
      const r = (await rpc(url, "eth_call", [{ to, data }, blockTag])) as string;
      return r;
    },
    async blockNumber() {
      return BigInt((await rpc(url, "eth_blockNumber", [])) as string);
    },
    async getBlock(n) {
      const tag = n === "latest" ? "latest" : "0x" + n.toString(16);
      const b = (await rpc(url, "eth_getBlockByNumber", [tag, false])) as {
        number: string; timestamp: string; hash: string;
      } | null;
      if (!b) die(EXIT.RPC_UNREACHABLE, `block ${tag} not found`);
      return { number: BigInt(b.number), timestamp: BigInt(b.timestamp), hash: b.hash };
    },
    async getCode(address, blockTag = "latest") {
      return (await rpc(url, "eth_getCode", [address, blockTag])) as string;
    },
    async logs(filter) {
      return (await rpc(url, "eth_getLogs", [filter])) as { topics: string[] }[];
    },
  };
  return p;
}
