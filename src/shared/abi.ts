// Minimal ABI codec — just enough for the views this toolchain calls.
// No ethers dependency: selectors are keccak-derived constants verified
// against `cast sig` where the spec requires it.

export function sel(sig: string): string {
  // Keccak-256 is not in node:crypto (sha3-256 differs). Selectors used here
  // are pinned constants measured from the live contracts; see ABI_TABLE.
  const s = ABI_TABLE[sig];
  if (!s) throw new Error(`no pinned selector for ${sig}`);
  return s;
}

// Pinned 4-byte selectors. Values were taken from the contracts' verified
// interfaces (OpenZeppelin AccessControl / ERC20 / bridge views) and match
// `cast sig` output. Adding a signature requires adding its selector here.
export const ABI_TABLE: Record<string, string> = {
  "totalSupply()": "0x18160ddd",
  "balanceOf(address)": "0x70a08231",
  "decimals()": "0x313ce567",
  "symbol()": "0x95d89b41",
  "name()": "0x06fdde03",
  "hasRole(bytes32,address)": "0x91d14854",
  "getRoleAdmin(bytes32)": "0x248a9ca3",
  "getRoleMember(bytes32,uint256)": "0x9010d07c",
  "getRoleMemberCount(bytes32)": "0xca15c873",
  "paused()": "0x5c975abb",
  "cap()": "0x355274ea",
  "payout()": "0x63bd1d4a",
  "payToken()": "0x96336b30",
  "configSealed()": "0x58624a73",
  "everUsed()": "0xb322b3d2",
  "escrowed(address)": "0xd01242f9",
  "MINTER_ROLE()": "0xd5391393",
  "BURNER_ROLE()": "0x282c51f3",
  "DEFAULT_ADMIN_ROLE()": "0xa217fddf",
  "inbound(uint256,address)": "0x27eaf5c8",
  "totalReceivedFrom(uint256,address)": "0x8fb44409"
};

export function encodeAddress(a: string): string {
  const h = a.toLowerCase().replace(/^0x/, "");
  if (!/^[0-9a-f]{40}$/.test(h)) throw new Error(`bad address ${a}`);
  return h.padStart(64, "0");
}

export function encodeBytes32(h: string): string {
  const x = h.toLowerCase().replace(/^0x/, "");
  if (!/^[0-9a-f]{64}$/.test(x)) throw new Error(`bad bytes32 ${h}`);
  return x;
}

export function encodeUint(n: bigint | number): string {
  return BigInt(n).toString(16).padStart(64, "0");
}

export function decodeUint(hex: string): bigint {
  const h = hex.replace(/^0x/, "");
  if (h.length < 64) throw new Error(`short word: ${hex}`);
  return BigInt("0x" + h.slice(0, 64));
}

export function decodeAddress(hex: string): string {
  const h = hex.replace(/^0x/, "");
  if (h.length < 64) throw new Error(`short word: ${hex}`);
  return "0x" + h.slice(24, 64);
}

export function decodeBool(hex: string): boolean {
  return decodeUint(hex) !== 0n;
}

// ABI dynamic string: word0 = offset (0x20), word1 = length in bytes
// (odd = long-string flag, data follows padded to 32B), data at word2+.
export function decodeString(hex: string): string {
  const h = hex.replace(/^0x/, "");
  if (h.length < 128) throw new Error(`short string return: ${hex.slice(0, 66)}…`);
  const lenWord = BigInt("0x" + h.slice(64, 128));
  const isLong = (lenWord & 1n) === 1n;
  const len = Number(isLong ? (lenWord - 1n) / 2n : lenWord);
  const data = h.slice(128, 128 + len * 2);
  return Buffer.from(data, "hex").toString("utf8");
}

export function callData(sig: string, args: string[] = []): string {
  const s = sel(sig);
  return "0x" + s.slice(2) + args.join("");
}
