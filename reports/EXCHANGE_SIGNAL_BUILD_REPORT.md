# ExchangeSignal Cold-Start Layer — Build Report (Phases 0–3)

**Date:** 2026-08-26
**Author:** Drep2 (implementation + review)
**Repository:** `_01_sigrank-app` (sigrank-app)
**Branch:** `main`
**Commit:** `b78a763b`
**Migration:** `20260826000000_0041_exchange_signals.sql` (not yet applied to remote Supabase — owner action)
**Spec:** `_010_sigexchange/EXCHANGE_SIGNAL_SPEC.md`

---

## Summary

The ExchangeSignal cold-start layer (Phases 0–3) is implemented, reviewed through 3 rounds, and accepted. The layer lets domains publish problems, requests, challenges, bounties, verification tasks, discoveries, and experiments before the existing Proposal/Commitment flow. The core invariant — no signal code advances authoritative Contribution Exchange state — holds at every layer.

**Final verification:** tsc 0 errors, lint 0 errors, 283/283 tests pass (including 62 exchange-signal contract tests).

---

## What was built

### Phase 0 cleanup (§18)

- **§18.2:** Schema `$id` fixed (mos2es.xyz → signalaf.com) in both schema copies
- **§18.4:** `safeEqual()` helper using SHA-256 + `timingSafeEqual` in `lib/exchange/server.ts`; replaced all `===` secret comparisons in server.ts, proposals/route.ts, requests/route.ts, api-gate.ts
- **§18.3:** `lib/infra/distributed-rate-limit.ts` — Upstash Redis atomic incr+expire, multi-dimension keys, fail-closed for sensitive writes, in-memory fallback, metrics; integrated into `lib/exchange/rate-limit.ts` (async) and `lib/infra/api-gate.ts` (`rateLimitDistributed`)
- **§18.5:** `lib/exchange/signed-notification.ts` — HMAC-SHA256 signed BYO notification delivery with timestamp, nonce, event_id, replay window (±5min), key rotation metadata, constant-time signature verification; `steward.ts` `notifyDomainAgent` now uses `deliverSignedNotification`
- **§18.6:** `exchange_lineage` table in migration — immutable append-only lineage records tracking signal→attempt→verification→qualification→proposal→commitment→execution→settlement chain
- **§18.1:** `llms.txt` + `robots.txt` updated with Exchange + signal references; `/internal/` disallowed in robots

### Phase 1 (schema + discovery)

- `exchange-gateway/src/signal-types.ts` — full TypeScript types for ExchangeSignal, Attempt, Verification, Qualification, ProposalOrigin, LineageRecord
- `exchange-gateway/src/signal-schema.ts` — Zod validation enforcing `creates_obligation: false`, `commitment_automatic: false`, `authorization_automatic: false`
- `exchange-gateway/src/signal-revision.ts` — canonical JSON serialization (sorted keys) + SHA-256 revision hashing; ID generators
- `supabase/migrations/20260826000000_0041_exchange_signals.sql` — 7 tables with RLS, revision immutability (composite PK + unique hash), attempt revision binding (FK), idempotency unique constraint
- `lib/exchange/signal-server.ts` — server-side CRUD, publish (creates immutable revision), status transitions (enforces §6.3 transition table), discovery listing, attempt creation/submission/withdrawal, verification recording, qualification issuance/consumption, proposal origin recording, lineage event logging
- `app/api/exchange/signals/route.ts` — GET collection + POST create
- `app/api/exchange/signals/[signal_id]/route.ts` — GET detail + PATCH update
- `app/api/exchange/signals/[signal_id]/{publish,pause,close,withdraw}/route.ts` — lifecycle routes
- `app/exchange/signals/page.tsx` + `[signal_id]/page.tsx` — human-readable pages
- Manifest `signals` block added to `exchange-gateway/src/manifest.ts` + `types.ts`
- `agents.md` documents full signal loop, API, and "signals are optional" + "no authority granted"

### Phase 2 (attempts + verification)

- `app/api/exchange/signals/[signal_id]/attempts/route.ts` — POST create with idempotency key, request hash, attempt limit enforcement, anonymous-attempt check
- `app/api/exchange/signals/[signal_id]/attempts/[attempt_id]/route.ts` — GET (actor-scoped)
- `app/api/exchange/signals/[signal_id]/attempts/[attempt_id]/submit/route.ts` — POST with media type + size enforcement
- `app/api/exchange/signals/[signal_id]/attempts/[attempt_id]/withdraw/route.ts` — POST
- `app/api/exchange/signals/[signal_id]/attempts/[attempt_id]/verification/route.ts` — GET (read-only for agents; states "cannot be self-asserted")
- `app/internal/exchange/signal-verifications/route.ts` — POST (Steward-authenticated internal route; states `authoritative_for_exchange_state: false`)

### Phase 3 (proposal follow-on)

- `app/api/exchange/signals/[signal_id]/attempts/[attempt_id]/proposal/route.ts` — POST creates ordinary `exchange_records` proposal with `recordProposalOrigin()` linking signal/revision/attempt/verification/qualification; consumes qualification if required; states "No Commitment has been created"

### Tests

- `__tests__/contract/exchange-signal.test.mjs` — 62 contract tests covering schema validation, migration structure, route existence, manifest integration, discovery integration, Phase 0 cleanup, status transitions, the no-exchange-state-advancement invariant, and all review-fix verification

---

## Key invariants enforced

- Signal verification is `authoritative_for_signal: true, authoritative_for_exchange_state: false`
- `consideration.creates_obligation` is `z.literal(false)`
- `follow_on.commitment_automatic` and `authorization_automatic` are `z.literal(false)`
- Signal status transitions follow §6.3 (draft→published→{paused,closed,expired,withdrawn})
- Attempt idempotency: unique on (signal_id, actor_id, idempotency_key); reuse with different content = conflict
- Revisions are immutable: composite PK (signal_id, revision) + unique revision_hash
- Attempts bind to exact revision via FK
- RLS: public can only read published public signals; drafts are private; actor-scoped read on attempts/verifications/qualifications
- Sensitive write routes (signal admin, attempts, submissions, proposals) use fail-closed rate limiting
- BYO notifications are HMAC-signed with replay protection
- Lineage is persisted immutably in `exchange_lineage` table
- `inconclusive` and `verifier_error` attempts do not count toward attempt limit (§12.6)
- `consumeQualification` uses optimistic locking (atomic UPDATE with `uses_remaining` + `status` check)
- Proposal route has compensating delete on qualification consumption failure

---

## Review rounds

### Round 1 — REJECT (10 findings)

1. **Bug 1:** PATCH on published signal always fails (no `createRevision` flow). **Fixed:** Added `createRevision()` separate from `publishSignal`.
2. **Bug 2:** Proposal route calls `req.json()` twice — user input silently dropped. **Fixed:** Single `req.json()` read.
3. **Bug 3:** Idempotency race in `createAttempt` (check-then-insert). **Fixed:** 23505 handler with re-read.
4. **Bug 4:** `expires_before` filters by `created_at` not `expires_at`. **Fixed:** Mirrored `expires_at` column.
5. **Missing:** `concurrent_attempts_per_actor` never enforced. **Fixed:** `countConcurrentAttempts()` + 429.
6. **Missing:** `verification_mode`/`consideration_mode` filters accepted but never applied. **Fixed:** Mirrored columns + filter.
7. **Missing:** `submission.required_fields` not validated. **Fixed:** JSON body validation in submit route.
8. **Shortcut:** `check (true)` placeholder in migration. **Fixed:** Removed.
9. **Shortcut:** RLS policies only on 2 of 7 tables. **Fixed:** 3 new actor-scoped RLS policies.
10. **Minor:** Unhandled `JSON.parse` in submit route. **Fixed:** try/catch with 400 response.

### Round 2 — REJECT (1 finding + 3 minors)

11. **Bug 11:** `published_after` filters by `created_at` not `published_at`. **Fixed:** Mirrored `published_at` column + index.
12. **Minor:** `accepting_attempts` filter doesn't check `accepts_attempts_until`. **Fixed:** Added to filter.
13. **Minor:** `accepting_attempts` filter applied after pagination. **Fixed:** Moved to SQL before `await query`.
14. **Minor:** PATCH route returns 404 for draft signals. **Fixed:** `getSignalMeta()` function for draft-safe status check.

### Round 3 — REJECT (3 bugs + 4 minors)

15. **Bug 1 (§12.6):** `inconclusive`/`verifier_error` attempts count toward attempt limit. **Fixed:** Added `verifier_error` as distinct attempt status; excluded both from `countActorAttempts`.
16. **Bug 2:** `consumeQualification` race condition. **Fixed:** Optimistic locking with `uses_remaining` + `status` in WHERE clause.
17. **Bug 3:** Silent catch on qualification consumption failure. **Fixed:** Compensating delete of proposal on failure.
18. **Minor 1:** Manifest `signals.schema` points to collection URL. **Fixed:** Points to schema URL.
19. **Minor 2:** robots.txt doesn't allow `/api/exchange/signals`. **Fixed:** Added to allow array.
20. **Minor 3:** Internal verification route doesn't validate `body.status`. **Fixed:** `allowedStatuses` check.
21. **Minor 4:** `recordVerification` doesn't check attempt state. **Fixed:** Pre-check for withdrawn/expired.

---

## Not yet done (future phases)

- Phase 2 isolated verifier worker (deterministic code execution sandbox) — the verification *interface* and *recording* exist, but the actual sandboxed verifier runtime is not yet built
- Phase 4 seeded pilot
- Phase 5 independent operator
- §18.7 independent vendor-neutral specification repository
- Migration not yet applied to remote Supabase (owner action)

---

## Files changed

- `exchange-gateway/src/signal-types.ts` — full TypeScript types
- `exchange-gateway/src/signal-schema.ts` — Zod validation
- `exchange-gateway/src/signal-revision.ts` — canonical JSON + SHA-256 revision hashing
- `exchange-gateway/src/manifest.ts` — signals block + schema URL
- `exchange-gateway/src/types.ts` — manifest types
- `supabase/migrations/20260826000000_0041_exchange_signals.sql` — 7 tables, RLS, indexes, constraints
- `lib/exchange/signal-server.ts` — server-side CRUD + all review fixes
- `lib/exchange/signed-notification.ts` — HMAC-signed BYO notifications
- `lib/infra/distributed-rate-limit.ts` — Upstash Redis rate limiter
- `lib/exchange/server.ts` — `safeEqual` helper
- `lib/exchange/rate-limit.ts` — async rate limit integration
- `lib/exchange/steward.ts` — signed notification delivery
- `lib/infra/api-gate.ts` — distributed rate limit integration
- `app/api/exchange/signals/route.ts` — collection + create
- `app/api/exchange/signals/[signal_id]/route.ts` — detail + PATCH
- `app/api/exchange/signals/[signal_id]/{publish,pause,close,withdraw}/route.ts` — lifecycle
- `app/api/exchange/signals/[signal_id]/attempts/route.ts` — attempt creation
- `app/api/exchange/signals/[signal_id]/attempts/[attempt_id]/route.ts` — attempt detail
- `app/api/exchange/signals/[signal_id]/attempts/[attempt_id]/submit/route.ts` — submission
- `app/api/exchange/signals/[signal_id]/attempts/[attempt_id]/withdraw/route.ts` — withdrawal
- `app/api/exchange/signals/[signal_id]/attempts/[attempt_id]/verification/route.ts` — verification (read-only)
- `app/api/exchange/signals/[signal_id]/attempts/[attempt_id]/proposal/route.ts` — proposal follow-on
- `app/internal/exchange/signal-verifications/route.ts` — Steward verification recording
- `app/exchange/signals/page.tsx` + `[signal_id]/page.tsx` — human-readable pages
- `app/llms.txt/route.ts` — Exchange + signal references
- `app/robots.ts` — /api/exchange/signals allow, /internal/ disallow
- `app/agents.md/route.ts` — full signal loop documentation
- `__tests__/contract/exchange-signal.test.mjs` — 62 contract tests

---

## Verification

- `npx tsc --noEmit`: 0 errors
- `npm run lint`: 0 errors (pre-existing warnings only)
- `node --test __tests__/contract/exchange-signal.test.mjs`: 62/62 pass
- `npm test`: 283/283 pass (after round-3 fixes; final combined run 363/363 with MCP tests)

— Drep2
