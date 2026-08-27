# Execution Provider Build Report

**Date:** 2026-08-24
**Author:** DREP1
**Status:** Built, deployed, then repaired (PR #72)

---

## 1. What was built

The Execution Provider layer from `EXECUTION_PROVIDER_PLAN.md` was implemented in commit `b5501d54` on `sigrank-app`.

### New modules

| File | Lines | Purpose |
|------|-------|---------|
| `exchange-gateway/src/types.ts` | +164 | ExecutionProvider, ExecutionRequest, ExecutionReceipt, ExecutionCapabilities, ExecutionMode, ExecutionState, ExecutionAuthority, ExecutionReference, ExecutionStatus, ExecutionAssessment, ExecutionRouterResult, external_execution policy block |
| `exchange-gateway/src/schema.ts` | +109 | Zod validation for all execution objects |
| `exchange-gateway/src/providers/internal.ts` | new | Default self-executed provider |
| `exchange-gateway/src/execution-router.ts` | new | Provider registry, mode determination, authority derivation, request building, routing |

### Modified modules

| File | Change |
|------|--------|
| `exchange-gateway/src/policy.ts` | external_execution block in default + merge policy |
| `exchange-gateway/src/manifest.ts` | Advertises execution modes + providers |

### New API routes

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/exchange/exchanges/[id]/execute` | POST | Route an authorized commitment to a provider |
| `/api/exchange/exchanges/[id]/execute` | GET | List executions for an exchange |
| `/api/exchange/exchanges/[id]/execution` | GET | Execution status + receipts + live provider status |
| `/api/exchange/exchanges/[id]/execution/receipt` | POST | Submit an execution receipt |

### New Supabase tables (migration 0038)

| Table | Purpose |
|-------|---------|
| `exchange_executions` | Execution requests, provider, mode, state, task, budget, authority, verification, provenance |
| `exchange_execution_receipts` | Normalized results, executor, artifact, verification, settlement, timestamps |

### Documentation updated

- `EXECUTION_PROVIDER_PLAN.md` — full architectural plan
- `SUPABASE_TABLES.md` — new tables documented
- `API_REFERENCE.md` — execution provider API documented
- `domains/*.json` — execution block added to all 6 domain profiles

---

## 2. Verification at build time

- Type-check: tsc --noEmit clean (0 errors)
- Agent readiness test: 11/11 pass
- Supabase migration: applied live, both tables confirmed
- Manifest live: `/.well-known/exchange.json` includes execution block
- API routes live: all routes responding

---

## 3. Governance boundary violations found and repaired

PR #72 ("Harden execution governance boundary") was opened to repair critical issues in the initial implementation.

### P0 — State corruption / security

| # | Violation | Original code | PR #72 fix |
|---|-----------|---------------|------------|
| 1 | Receipt advancing authoritative exchange state | `exchange_records.update({ state: 'delivered' })` on receipt | Removed — receipts only update execution state, return `authoritative_exchange_state_advanced: false` |
| 2 | Receipt not bound to persisted provider | Accepted any provider/reference in body | Must match persisted execution's provider + provider_reference |
| 3 | Proposer self-declares external result | Both company + proposer could submit external receipts | External receipts require company principal until provider auth exists |
| 4 | Migration ledger drift | Local file `20260824200000` vs remote `20260824213300` | Renamed local files to match remote ledger |

### P1 — Governance enforcement

| # | Violation | Original code | PR #72 fix |
|---|-----------|---------------|------------|
| 5 | Silent fallback to self_executed | 4 places fell back to `self_executed` on provider failure | All changed to `mode: 'human'` — fail closed |
| 6 | No terms hash required | `terms_hash ?? ''` allowed empty string | Throws if no hash; router blocks execution |
| 7 | human_required_for_execution not enforced | Router ignored the base policy flag | Checked in router: `if (policy.human_required_for_execution && !principal_approved)` |
| 8 | Access-scope ceiling not enforced | Checked 4 booleans, not access_scope | Fixed in router |
| 9 | No regression tests | None | Added `execution-governance-boundary.test.mjs` (4 tests) |

---

## 4. Root cause

The architectural boundary was defined correctly in types: external execution state must never become authoritative Contribution Exchange state. The API routes and router then violated that boundary:

1. Receipt route let execution state bleed into exchange state
2. Router chose convenience (silent fallback) over safety (fail closed)
3. Receipts weren't bound to persisted execution identity
4. External provider auth gap not considered
5. No governance boundary tests
6. Migration ledger not verified after apply

**Lesson:** Boundaries defined in types must be enforced in every code path that crosses them, with tests that prove the enforcement.

---

## 5. Current state

- PR #72 is OPEN, CI green, ready to merge
- After merge: the execution provider layer is production-safe for internal provider use
- External provider integration requires the NEXT items below

---

## 6. Next steps (before external provider)

| Priority | Item | Status |
|----------|------|--------|
| P1 | Provider callback authentication (signatures/scoped credentials) | NEXT |
| P1 | Receipt idempotency + replay protection | NEXT |
| P1 | DB as canonical execution-state source (not in-memory) | NEXT |
| P2 | RLS on execution tables | NEXT |
| P2 | DB constraints (execution states, provider refs, receipt uniqueness) | NEXT |
| P2 | `source_commitment_hash` non-null at DB layer | NEXT, after data check |
| P2 | Full runtime provider integration test | NEXT before external provider |
