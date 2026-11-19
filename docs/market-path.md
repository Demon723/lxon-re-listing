# LXON market path — measured 2026-11-20

## Current price sources (honest)

- 724 LXON/WETH pool 0x3fc4133f…4d32: 1 WETH / 500 LXON → ~$3.49/LXON at
  ETH=$1,744. Depth ~1 WETH — real but fragile, seeded not organic.
- 137 wLXON/USDC.e QuickSwap pair 0x8bFB69eD898654D49cCBB59B7E594280dF4CB8fd:
  reserves 1,260,684 USDC.e-units ($1.26) / 7.189 wLXON. Effectively zero depth.

## To get a CoinGecko/CoinMarketCap price

CoinGecko prices from DEX liquidity on TRACKED chains. wLXON on Polygon is
trackable; LXON on 724 is not (chain too new, not indexed).

Steps (owner funds required):
1. Acquire wLXON on 137 (bridge from 724 or buy)
2. Add liquidity to 0x8bFB69eD… via QuickSwap router
   0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff:
   - approve(wLXON, router, amount)
   - approve(USDC.e, router, amount)
   - addLiquidityUSDCe(wLXON, usdcAmount, wlxonAmount, min0, min1, to, deadline)
   Suggested first depth: $500-$2,000 USDC.e side — enough for CG to index,
   small enough to be honest seed liquidity.
3. Submit/update CoinGecko + CoinMarketCap applications (forms already
   prepared in LXON/docs/listing/) citing the QuickSwap pool.

## CEX listings
Not executable by tooling — requires legal entity, custody, compliance.
Timeline: months. Revisit after DEX price discovery is live.
