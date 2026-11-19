// Artifact + Metric primitives shared by every 724 measurement.
import { createHash } from "node:crypto";
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

export interface Metric {
  value: string; // decimal string, never a float
  unit?: string;
  decimals?: number;
  raw?: string;
  source: string; // e.g. "eth_call totalSupply() @ block 267073"
}

export interface Artifact<T> {
  _meta: {
    tool: string;
    generated_at_utc: string;
    rpcUrl?: string;
    blockTag?: string;
    sha256_inputs?: string;
  };
  value: T;
}

export function artifact<T>(tool: string, value: T, extra: Partial<Artifact<T>["_meta"]> = {}): Artifact<T> {
  return { _meta: { tool, generated_at_utc: now(), ...extra }, value };
}

export function metric(value: bigint | string, source: string, opts: Partial<Metric> = {}): Metric {
  return { value: value.toString(), source, ...opts };
}

export function sha256(s: string | Buffer): string {
  return createHash("sha256").update(s).digest("hex");
}

export function writeArtifact(path: string, obj: unknown): string {
  mkdirSync(dirname(path), { recursive: true });
  const body = JSON.stringify(obj, null, 1) + "\n";
  writeFileSync(path, body);
  return sha256(body);
}

export function now(): string {
  return new Date().toISOString();
}
