# CMC listing submission — CURRENT facts (measured 2026-11-20)

All values measured live today. Supersedes stale pre-restart docs in
LXON/docs/listing/ (those quote dead addresses — see their own warnings).

## Identity
- Name: LXON | Symbol: LXON | Chain: eip155-724 (own L1, QBFT, ~5s blocks)
- Token: 0x57b875ab86a40d79a1c35e44aa22008dfd049dc9 (LXON)
- totalSupply: 4,071,052 (reconciliation-closed)
- Decimals: 18
- Website: https://www.lxon.in | Explorer: https://explorer.lxon.in
- RPC: https://rpc.lxon.in (read-only public, chainId 0x2d4)
- Write RPC: https://explorer.lxon.in/write-rpc (rate-limited, public)

## Infrastructure (all live-measured)
- Explorer API: GET shim serving real Besu data (blocks/txs live)
- Health: green, ~5s block time, head advancing
- Bridge: attested 2-of-3 validator bridge LXON<->wLXON on Polygon;
  round trip PROVEN 2026-11-20 (txs 0x4660e4fb, 0x6425ef49, 0xb5e43973)
- Roles: MINTER/BURNER held by timelock 0x6daf1b06...; admin deployer EOA
- Toolchain: github.com/Demon723/lxon-re-listing (verify-724, 26/26 plants)

## Markets (honest)
- 724 LXON/WETH pool 0x3fc4133f...: 1 WETH / 500 LXON (~$3.49 implied, ~1 WETH depth)
- 137 wLXON/USDC.e QuickSwap 0x8bFB69eD...: ~$1.26 depth — effectively none
- No CEX listings yet

## Contract security note
- wLXON compiled with solc ^0.8.26; Polygonscan compiler-bug banner reviewed —
  none of the flagged patterns (recursive storage structs, bytes-array deletes,
  via-IR, mutual recursion) exist in the source. Boilerplate, not exposure.

## Required disclosures (do not omit)
- Chain restarted 2026-11-03; pre-restart history discarded; no migration
  path exists (owner-accepted, migration/notice.md)
- wLXON is ~50% pro-rata backed by escrow — NOT 1:1 (wlxon-backing-disclosure.md)
- Pre-restart holders have no claim (accepted forfeiture)

## Still needed before submit
- [FILL] Website logo/brand assets approved
- [FILL] Twitter/Telegram/Discord links (if any exist)
- [FILL] CMC account login — the form itself requires sign-in
- Liquidity: ~$500+ USDC.e into wLXON pool recommended first so CMC sees a market
