# SigExchange State

**Last updated:** 2026-08-24 22:45 UTC
**Status:** ALL 6 DOMAINS LIVE — exchange.json + Steward 200 on every domain. Execution Provider layer built + deployed, governance boundary repaired (PR #72).

## Current state

- signalaf.com is the hosted control plane (LIVE)
- Supabase migration applied (8 tables, RLS locked on core 6)
- 6 domains registered in exchange_companies (all verified, hosted_steward)
- 18 API routes live on signalaf.com (15 core + 3 execution provider)
- 8 human surface pages live on signalaf.com
- Execution Provider layer live (internal provider, manifest advertising)
- Encounter tracking live
- PostHog events wired
- tsc clean, tests pass

## Reports

All reports are in `reports/`:

| Report | Date | Summary |
|--------|------|---------|
| `EXECUTION_PROVIDER_BUILD_REPORT.md` | 2026-08-24 | Full build of execution provider layer, what was created, governance violations found |
| `EXECUTION_GOVERNANCE_REPAIR_REPORT.md` | 2026-08-24 | P0/P1 violations and PR #72 repairs |
| `MOS2ES_IO_XYZ_FINALIZATION_REPORT.md` | 2026-08-24 | mos2es.io (COMMAND demo) + mos2es.xyz (AQUA) finalization |
| `GA4_STREAM_SEPARATION_REPORT.md` | 2026-08-24 | Separate GA4 streams for mos2es.io and mos2es.xyz |

## Domain wiring status — ALL LIVE

| Domain | Supabase | Steward | exchange.json | Deploy | Transactions |
|--------|----------|---------|---------------|--------|-------------|
| signalaf.com | verified | 200 | 200 | live (Vercel) | enabled |
| sigeconomy.com | verified | 200 | 200 | live (Cloudflare) | disabled |
| signomy.xyz | verified | 200 | 200 | live (Vercel) | disabled |
| mos2es.com | verified | 200 | 200 | live (Netlify) | disabled |
| mos2es.xyz | verified | 200 | 200 | live (Vercel) | disabled |
| mos2es.org | verified | 200 | 200 | live (Cloudflare) | disabled |

## Deployed commits

**sigrank-app (signalaf.com):**
- `e453e115` — feat(exchange): install Contribution Exchange Gateway v0.2
- `2a2fe032` — fix(exchange): remove useless assignment in verify route
- `b5501d54` — feat: add Execution Provider layer to Contribution Exchange
- PR #72 (OPEN) — Harden execution governance boundary

**application-hub (mos2es.xyz):**
- `346eb74` — feat(exchange): repoint exchange.json at signalaf.com
- `43cbcac` — fix: use dedicated GA4 stream for mos2es.xyz (G-WEKMTD1CBL)
- `ac98993` — Fix stale Exchange CI step (PR #13 merged)

**sigarena (sigeconomy.com):**
- `64c0941` — feat(exchange): add /.well-known/exchange.json
- `550c2cf` — fix(exchange): use nodejs runtime for OpenNext compatibility

**agent-universe (signomy.xyz):**
- `4166b13` — feat(exchange): add /.well-known/exchange.json

**mos2es-site (mos2es.com):**
- `53a2a8e` — feat(exchange): add /.well-known/exchange.json

**b2bpilot (mos2es.org):**
- `09907bd` — feat(exchange): add /.well-known/exchange.json

## Next steps

1. Merge PR #72 (execution governance boundary repair)
2. Provider callback authentication (signatures/scoped credentials)
3. Receipt idempotency + replay protection
4. DB as canonical execution-state source
5. RLS on execution tables
6. DB constraints for execution states/provider refs/receipt uniqueness
7. Full runtime provider integration test
8. Watch exchange_encounters table for real agent encounters
9. Rotate test admin key (owner action)
