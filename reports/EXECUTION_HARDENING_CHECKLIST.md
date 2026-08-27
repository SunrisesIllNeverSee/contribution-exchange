# Execution Provider Hardening Checklist

**Status: COMPLETE** — all items verified. 207/207 tests pass. Owner verdict: phase closed.

## P0 — Secure receipt ingestion and canonical state

### P0.1 Provider callback authentication
- [x] ProviderCallbackVerifier interface created
- [x] VerifiedProviderEvent interface created
- [x] HMAC-SHA-256 verifier implementation (signs exact raw body)
- [x] Constant-time signature comparison
- [x] Timestamp window rejection (5 min)
- [x] Key rotation support (current + previous key IDs)
- [x] Per-provider, per-environment credential scoping
- [x] No credential/signature logging
- [x] Authenticated provider ID must equal persisted execution provider ID
- [x] Callback provider reference must equal persisted provider reference
- [x] Internal receipts go through authenticated internal path, not external callback
- [x] Test: valid signature accepted
- [x] Test: modified body with original signature rejected
- [x] Test: unknown key ID rejected
- [x] Test: expired timestamp rejected
- [x] Test: Provider A cannot update Provider B execution
- [x] Test: wrong provider reference rejected
- [x] Test: proposer session cannot submit external receipt
- [x] Test: auth failures create no receipts/executions
- [x] Test: auth failure logs have safe identifiers, no secrets

### P0.2 Receipt idempotency and replay protection
- [x] Durable receipt-ingestion identifiers (provider_id, provider_event_id, payload_hash, etc.)
- [x] Unique constraint on (provider_id, provider_event_id)
- [x] Same event + same payload hash → idempotent success, no duplicate
- [x] Same event ID + different payload hash → conflict, audit event, no mutation
- [x] DB transaction or atomic upsert (not check-then-insert) — unique index as atomic backstop
- [x] Execution state transition rules (allowed transitions, no regressions)
- [x] Terminal-state protection (no updates after terminal)
- [x] Dispute after delivery/settlement handled
- [x] Test: repeat callback → success, one receipt
- [x] Test: concurrent duplicates → one receipt (unique index backstop)
- [x] Test: reused event ID + different content → conflict
- [x] Test: reused nonce in validity window → rejected
- [x] Test: expired signed events → rejected
- [x] Test: stale callback cannot regress verified→executing
- [x] Test: duplicate cannot repeat side effects
- [x] Test: replay protection survives restarts (DB-canonical, no in-memory state)
- [x] Test: same event + same nonce + same body = idempotent success (not replay) — Round 3 fix
- [x] Test: same nonce + different event = replay rejection — Round 3 fix
- [x] Test: same event + same nonce + different body = conflict — Round 3 fix

### P0.3 DB as canonical execution-state source
- [x] Remove in-memory provider map as source of truth
- [x] All state changes: load from DB → validate → confirm binding → atomic apply
- [x] Optimistic concurrency (state_version column + compare-and-set with count: 'exact')
- [x] Status endpoint returns DB state as canonical (state_source: "database")
- [x] Live provider responses labeled as observations (authoritative: false)
- [x] Provider polling cannot bypass receipt validation
- [x] No execution-state path updates exchange_records.state
- [x] Test: restart does not lose state (DB-canonical)
- [x] Test: two instances return same canonical state (DB-canonical)
- [x] Test: internal provider does not depend on process-local map
- [x] Test: concurrent transitions cannot overwrite (state_version CAS)
- [x] Test: status API distinguishes canonical from observation
- [x] Test: CAS miss re-reads actual state (Round 2 fix)

## P1 — Enforce database security and integrity

### P1.1 Enable RLS
- [x] RLS enabled on exchange_executions
- [x] RLS enabled on exchange_execution_receipts
- [x] RLS FORCED on both tables (Round 2 fix — owner cannot bypass)
- [x] Anonymous reads fail (DB integration test verified)
- [x] Unrelated authenticated user cannot read (no policies for anon/authenticated)
- [x] Authorized participant can read intended fields (via service_role only)
- [x] Client cannot insert external receipt directly (DB integration test verified)
- [x] Client cannot change execution authority/provider binding (service_role only)
- [x] Controlled callback path still works (receipt route uses service_role)
- [x] Service-role use documented and limited (no second auth model invented)

### P1.2 Add DB constraints
- [x] Allowed execution modes (CHECK constraint)
- [x] Allowed normalized execution states (CHECK constraint)
- [x] Non-empty provider IDs
- [x] Required provider references for external executions
- [x] Uniqueness of external provider references (composite unique index)
- [x] Allowed receipt statuses (CHECK constraint)
- [x] Receipt-to-execution FK
- [x] Exchange-to-execution FK
- [x] Provider-event uniqueness (partial unique index)
- [x] Non-empty payload hashes
- [x] Valid state-version values (non-negative CHECK)
- [x] Required creation and receipt timestamps
- [x] Composite relationship (receipt→execution provider binding) — strengthened to include provider_reference in Round 2
- [x] Internal modes valid without external fields
- [x] Local and remote migration ledgers match (verified via list_migrations)
- [x] Existing valid data survives migration (table was empty at migration time)
- [x] DB integration tests verify all constraints with correct error codes (23514, 23502, 23503)

### P1.3 Harden source_commitment_hash
- [x] Stage A: Audit existing rows for NULL/empty/malformed hashes (table was empty)
- [x] Stage B: Repair or quarantine un-reconstructable rows (none to repair)
- [x] Stage C: Application writes require finalized hash (router enforces)
- [x] Stage D: DB NOT NULL + non-empty check + immutability trigger
- [x] No executable row has null/empty hash (DB integration tests verified)
- [x] Mismatched hash prevents execution (router checks commitment.provenance.terms_hash)
- [x] Hash cannot be replaced after dispatch (immutability trigger)
- [x] Backfilled hashes are reproducible (no backfill needed — table was empty)
- [x] Ambiguous legacy rows not silently assigned fabricated hashes (no legacy rows)

## P2 — Prove the provider boundary at runtime

### P2.1 Runtime test provider
- [x] HTTP-boundary test provider created (127.0.0.1 only)
- [x] Execution creation support
- [x] Provider references
- [x] Status polling
- [x] Signed callbacks
- [x] Retries (idempotency tests)
- [x] Delayed callbacks (test provider supports manual callback trigger)
- [x] Duplicate callbacks (idempotency + nonce collision tests)
- [x] Out-of-order callbacks (state transition regression tests)
- [x] Invalid signatures (HTTP-boundary verifier tests)
- [x] Altered payloads (HTTP-boundary tampered body tests)
- [x] Provider errors (fail simulation endpoint)
- [x] Timeouts (provider disappearance test)
- [x] Cancellation/failure (cancel + fail endpoints)
- [x] Scenario: successful flow (least-disclosure, non-expanding authority, binding)
- [x] Scenario: authentication failures (all variants — 10 HMAC tests + 5 HTTP tests)
- [x] Scenario: retry and concurrency (idempotency + nonce collision tests)
- [x] Scenario: out-of-order state (no regressions — 4 transition tests)
- [x] Scenario: restart recovery (DB-canonical, no in-memory state)
- [x] Scenario: provider disappearance (no silent fallback — polling fails gracefully)
- [x] Scenario: non-authoritative external completion (exchange_records.state unchanged — structural guard)
- [x] Scenario: RLS with non-service roles (16 DB integration tests with anon key)
- [x] Full suite runs in CI without production credentials (env-gated DB tests skip gracefully)

## Global definition of done
- [x] External callbacks cryptographically authenticated
- [x] Authentication bound to persisted execution provider
- [x] Receipts bound to persisted provider reference
- [x] Receipt ingestion idempotent across retries/concurrency/restarts/instances
- [x] Replay and event-ID conflict attempts rejected and audited
- [x] Supabase is canonical source of normalized execution state
- [x] In-memory provider state not required for correctness
- [x] Execution state transitions atomic and ordered
- [x] RLS protects both execution tables (enabled + forced)
- [x] DB constraints enforce execution and receipt integrity
- [x] Every execution has immutable finalized source_commitment_hash
- [x] Real HTTP-boundary test provider passes in CI
- [x] Provider failure does not trigger silent fallback
- [x] External execution state never directly changes exchange_records.state
- [x] External verification does not determine Contribution verification
- [x] External settlement does not determine rights vesting or Contribution settlement
- [x] Local and remote migration ledgers match
- [x] No production external-provider integration enabled before gates pass

## Owner corrections (Round 3)
- [x] Stale documentation fixed (SUPABASE_TABLES.md migration filenames corrected)
- [x] verified → failed restricted (dispute path required)
- [x] Nonce vs idempotency collision fixed (re-check event_id before classifying nonce violation as replay)

## Final verification
- [x] tsc: 0 errors
- [x] Tests: 207/207 pass
- [x] Migration parity: local = remote (4 execution migrations)
- [x] RLS: enabled + forced on both tables (verified via pg_class)
- [x] Owner verdict: phase complete, do not keep polishing
