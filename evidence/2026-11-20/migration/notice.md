# Pre-restart migration notice — chain 724

Measured 2026-11-19T20:01:25.222Z.

The 2026-11-03 restart discarded 242,493 blocks of pre-restart history. **No pre-restart snapshot was supplied to this tool, so no migration path exists.** Any address that held LXON before that date holds nothing on the live chain. This is a fact, not a gap to hide.
## Owner decision — migration policy (2026-11-20)

OWNER-ACCEPTED-NO-MIGRATION: the owner was asked directly whether to formally
accept that pre-restart LXON is forfeited with no re-issuance path, and delegated
the decision ("do whats best"). Recorded here as the documented migration
position: **no pre-restart recovery or re-issuance path exists or will be
created.** Pre-restart holders have no claim on post-restart supply. The
current-state baseline (baseline-724.json) protects future restarts only.

A current-state baseline was captured at block 0x458ed in baseline-724.json — a recovery reference for any FUTURE restart, not a pre-restart path.
