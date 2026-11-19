# CEX listing pack — chain 724 / LXON (prepared 2026-11-20)

Status: PREPARED, NOT SUBMITTED. Every exchange requires a legal entity,
KYC, and custody answer. This pack is the factsheet + requirements checklist
so an application is a form-filling exercise once the entity exists.

## Token facts (measured)

- Name: LXON — chain 724 (eip155-724), RPC https://rpc.lxon.in,
  explorer https://explorer.lxon.in
- Canonical token 0x57b875ab86a40d79a1c35e44aa22008dfd049dc9
- totalSupply: 4,071,052 (measured, reconciliation-closed)
- Consensus: QBFT, 3 validators; blocks ~5s; chain live since 2026-11-03
  (pre-restart history discarded — see migration/notice.md)
- Write path: explorer.lxon.in/write-rpc (rate-limited, public)
- Bridge: attested 2-of-3 validator bridge to Polygon wLXON
  (round trip proven 2026-11-20, txs in smoke-test-724.md)
- Price: seeded LXON/WETH pool on 724 (~$3.49 implied, ~1 WETH depth);
  wLXON/USDC.e on Polygon ~$1.26 depth — thin, honest
- wLXON backing: ~50% pro-rata by escrow (disclosed, owner-accepted)

## What each tier needs

| Exchange | Entity | Min. liquidity | Timeline | Notes |
|---|---|---|---|---|
| Coinbase | yes (US) | meaningful DEX vol | 3-6 mo | strictest; needs legal opinion |
| Kraken | yes | DEX liquidity | 2-4 mo | more approachable |
| Binance | yes | varies | 1-3 mo | listing fee possible |
| KuCoin/ Gate/ MEXC | lighter | low | weeks | realistic first step |
| Uniswap (already effectively listed) | no | pool exists | — | 724 not indexed by CG yet |

## Prerequisites checklist (owner)

- [ ] Legal entity (C-corp/LLC) + registered address
- [ ] Custody answer (self-custody multisig? exchange custody?)
- [ ] wLXON/USDC.e liquidity >= ~$10k for serious consideration
- [ ] CoinGecko/CoinMarketCap listing FIRST (CEXs check these)
- [ ] Security audit or public audit-trail link (re-listing repo)
- [ ] Do NOT claim: fully-backed wLXON, organic volume, or "verified"
      reserves — see docs/wlxon-backing-disclosure.md

## Realistic sequencing

1. Deepen wLXON/USDC.e pool (owner funds, ~$500-2k to start)
2. CoinGecko + CoinMarketCap submissions (forms ready)
3. KuCoin/Gate/MEXC application (lightest requirements)
4. Kraken/Coinbase only after track record + entity + liquidity
