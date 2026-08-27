# Execution Provider Governance Boundary Repair Report

**Date:** 2026-08-24
**Author:** DREP1
**Status:** PR #72 OPEN, CI green, ready to merge

---

## 1. Context

The initial Execution Provider implementation (commit `b5501d54`) contained governance boundary violations. PR #72 was opened to repair them. This report documents each violation, the fix, and the root cause.

## 2. P0 violations (state corruption / security)

### P0-1: Receipt advancing authoritative exchange state

**Violation:** The receipt route directly called `exchange_records.update({ state: 'delivered' })` and `update({ state: 'verified' })` when a receipt came in with matching status.

**Impact:** An external provider reporting "delivered" or "verified" would automatically move the Contribution Exchange to that state, bypassing the governed transition path. This is exactly what the architectural plan prohibited.

**Fix:** Removed all `exchange_records.update({ state: })` from the receipt route. Receipts now only update execution state and emit an event with `authoritative_exchange_state_advanced: false`. The response directs to the governed transition endpoint.

### P0-2: Receipts not bound to persisted provider

**Violation:** The receipt route accepted any `provider` and `provider_reference` in the body. Only checked that `execution_id` existed.

**Impact:** A receipt could claim to be from provider "internal" when the execution was routed to an external provider, breaking the provenance chain.

**Fix:** Added checks that `receipt.provider`, `receipt.execution_reference.provider`, `receipt.provider_reference`, and `receipt.execution_reference.provider_reference` all match the persisted execution.

### P0-3: Proposer self-declaring external provider result

**Violation:** Both company admin and proposer could submit receipts for any provider, including external providers.

**Impact:** Without provider authentication, a proposer could self-declare that an external provider "delivered" the work.

**Fix:** External provider receipts (`execution.provider !== 'internal'`) require company principal. Proposer can only submit internal provider receipts.

### P0-4: Supabase migration ledger drift

**Violation:** Local migration file was `20260824200000_0038_execution_provider.sql` but Supabase recorded it as `20260824213300` when applied via MCP.

**Impact:** CI migration parity check would fail on every future PR touching the database.

**Fix:** Renamed local files to match the remote ledger timestamps:
- `20260824150000` → `20260824190900` (contribution exchange)
- `20260824200000` → `20260824213300` (execution provider)

## 3. P1 violations (governance enforcement)

### P1-1: Silent fallback to self_executed

**Violation:** Four places in the router fell back to `self_executed` when a provider failed (not registered, canExecute false, canExecute throws, createExecution throws).

**Fix:** All four changed to `mode: 'human'` with "no fallback execution was created" messages. Added try/catch around canExecute.

### P1-2: No finalized Commitment hash required

**Violation:** `buildExecutionRequest` used `terms_hash ?? ''` — allowed empty string.

**Fix:** Throws if no hash. Router returns `mode: 'human'` if commitment has no terms hash.

### P1-3: human_required_for_execution not enforced

**Violation:** Router checked derived constraints but never checked `policy.human_required_for_execution`.

**Fix:** Added: `if (policy.human_required_for_execution && !options?.principal_approved)` → `mode: 'human'`.

### P1-4: Access-scope ceiling not enforced

**Violation:** `authorityWithinPolicy` checked 4 booleans but not `access_scope`.

**Fix:** Access scope now enforced in the router.

### P1-5: No regression tests

**Violation:** No tests for the governance boundary.

**Fix:** Added `__tests__/contract/execution-governance-boundary.test.mjs` with 4 tests:
1. Receipts cannot advance authoritative exchange state
2. Receipt ingestion binds provider identity to persisted execution
3. Company-admin execution route marks principal approval explicitly
4. Router fails closed instead of silently self-executing

## 4. Root cause

The boundary was defined correctly in types. The routes and router then violated it by taking shortcuts: auto-advancing exchange state, silent fallbacks, missing binding, missing auth gap analysis, missing tests, missing migration verification.

## 5. PR #72 CI status

- Secret scan: pass
- TypeScript: pass
- Lint: pass
- Canonical tests: pass
- Hardening tests: pass
- Full coverage tests: pass
- Cross-repo contracts: pass
- Supabase migration parity: pass
- E2E: pass
- CodeQL: pass
- Dependency audit: pass

## 6. Remaining NEXT items (before external provider)

| Priority | Item |
|----------|------|
| P1 | Provider callback authentication (signatures/scoped credentials) |
| P1 | Receipt idempotency + replay protection |
| P1 | DB as canonical execution-state source (not in-memory) |
| P2 | RLS on exchange_executions + exchange_execution_receipts |
| P2 | DB constraints (execution states, provider refs, receipt uniqueness) |
| P2 | source_commitment_hash non-null at DB layer |
| P2 | Full runtime provider integration test |
