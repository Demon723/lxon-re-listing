# wLXON backing disclosure (measured 2026-11-20)

Canonical wLXON on Polygon (0x7A3c0C34f157EfDD3E4913c5224C15E645469093):

| Metric | Value |
|---|---|
| wLXON totalSupply (137) | 62,104 |
| LXON escrowed in bridge V41 (724) | 30,952 |
| Pro-rata backing | ~49.8% |

wLXON is a claim on escrowed LXON at roughly 50 cents on the dollar.
The remainder of its backing is implicit in the legacy wLXON supply
(0xB2CfeCb2aa1c53e8c4406146368222b6b3BbBbb6, ~4.01M) under the
closing identity:

  supply724 = validatorStake + escrowed + legacy_wLXON + releasedToUsers

## Listing-safe language

- "wLXON is a wrapped claim on LXON, backed pro-rata (~50%) by LXON
  escrowed in the LXON Chain 724 bridge. Backing is transparent and
  measurable on-chain; it is not 1:1."
- Do NOT claim "fully backed", "1:1", or "verified reserves" — none is true.

## What would change this

- Additional LXON escrowed against wLXON burns (organic bridge usage)
- A recapitalization decision by the owner (economic, not technical)
- Legacy wLXON retirement completing (frees the implicit backing term)

## Owner decision — backing policy (2026-11-20)

OWNER-ACCEPTED-PARTIAL-BACKING: delegated decision ("do whats best").
Policy: wLXON remains ~50% pro-rata backed by design of the current
bridge/legacy structure; the disclosure above is the canonical public
statement. No recapitalization, no synthetic backing, no 1:1 claims.
Revisit if: legacy wLXON retirement completes, or organic bridge volume
materially grows escrow.
