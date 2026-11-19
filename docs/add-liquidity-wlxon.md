# Add wLXON/USDC.e liquidity — QuickSwap (Polygon 137)

Pair: 0x8bFB69eD898654D49cCBB59B7E594280dF4CB8fd (current: $1.26 USDC.e / 7.19 wLXON)
Router: 0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff (QuickSwap V2)
wLXON: 0x7A3c0C34f157EfDD3E4913c5224C15E645469093
USDC.e: 0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174 (6 decimals)

## Steps (owner executes — needs MATIC gas + funds)

1. Get wLXON: bridge LXON from 724 -> 137 via bridge 0xcd39954c.../0xbDC32d8c...
   (attested claim, ~minutes) or buy on any DEX that lists it.

2. Approve router:
   cast send 0x7A3c0C34f157EfDD3E4913c5224C15E645469093 \
     'approve(address,uint256)' 0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff <WLXON_AMOUNT> \
     --rpc-url <POLYGON_RPC> --keystore <P137_KEY>
   cast send 0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174 \
     'approve(address,uint256)' 0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff <USDC_AMOUNT_6DEC> \
     --rpc-url <POLYGON_RPC> --keystore <P137_KEY>

3. Add liquidity (example: 100 USDC.e + matching wLXON at current ratio ~0.168 wLXON/USDC):
   cast send 0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff \
     'addLiquidity(address,address,uint256,uint256,uint256,uint256,address,uint256)' \
     0x7A3c0C34f157EfDD3E4913c5224C15E645469093 \
     0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174 \
     <WLXON_AMOUNT_WEI> <USDC_AMOUNT_6DEC> 0 0 <YOUR_ADDRESS> <DEADLINE> \
     --rpc-url <POLYGON_RPC> --keystore <P137_KEY>

4. Verify: getReserves() on the pair should show the new depths.

## What "enough" looks like
- ~$500 USDC.e side: most price aggregators start indexing
- ~$2,000+: CoinGecko/CoinMarketCap will typically list
- Below ~$100: stays invisible to frontends (current state)
