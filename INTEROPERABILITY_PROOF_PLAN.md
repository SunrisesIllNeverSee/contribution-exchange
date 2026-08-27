# Interoperability Proof Plan

## Status

**Hardening layer: CLOSED.** The Contribution Exchange execution provider layer passed all gates: implemented, deployed, migration-parity clean, RLS-enforced, DB-canonical, runtime-tested at 207/207. Per owner directive, the hardening layer is not reopened.

**Current phase: REAL EXTERNAL INTEROPERABILITY.** The next objective is proving that an actual external execution provider and real counterparties can use the system without breaking its internal logic.

---

## 1. Frozen Contribution Exchange Core

The following primitives are presumed-stable. No speculative redesign unless real operation exposes a defect.

```text
Discovery
Proposal
Negotiation
Commitment
Authorization
Execution boundary
Verification boundary
Vesting
Settlement
Lineage
```

These are implemented across:

- `exchange-gateway/src/types.ts` — canonical types (ContributionCommitment, ExecutionRequest, ExecutionReceipt, ExecutionProvider interface)
- `exchange-gateway/src/execution-router.ts` — routing with policy enforcement, authority non-expansion, budget limits
- `exchange-gateway/src/execution-state.ts` — normalized state machine with transition validation
- `exchange-gateway/src/providers/internal.ts` — default self-executed provider
- `exchange-gateway/src/providers/callback-verifier.ts` — HMAC-SHA-256 callback authentication
- `exchange-gateway/src/providers/verifier-bootstrap.ts` — env-based credential loading
- `app/api/exchange/exchanges/[id]/execute/route.ts` — execution creation
- `app/api/exchange/exchanges/[id]/execution/route.ts` — execution status (DB-canonical + provider observations)
- `app/api/exchange/exchanges/[id]/execution/receipt/route.ts` — receipt submission with idempotency, nonce replay protection, optimistic concurrency

**Rule:** The system should not be reshaped to fit the provider. The provider must fit the system.

---

## 2. Owner-Decision Blockers

The following decisions must be made by the owner before the first real adapter can be implemented. These are NOT engineering decisions — they are product/strategy decisions about which external counterparty to prove against.

### 2.1 Which external execution provider?

The prompt specifies "one actual external execution provider." The adapter contract (Section 3 below) is provider-agnostic, but the implementation requires knowing which provider's API, SDK, webhook format, and authentication scheme to target.

Candidate provider categories (not exhaustive):

- Task execution networks (e.g., on-demand coding task platforms)
- Agent-to-agent execution networks
- Specialist execution services (code review, documentation, testing)
- Existing task marketplaces with APIs

**Owner must specify:** the provider name, its API documentation URL, and whether a test/sandbox environment is available.

### 2.2 What is the deliberately boring first transaction?

The prompt suggests a documentation-fix flow. The specific target must be chosen:

- Which domain hosts the documentation defect?
- What is the defect? (typo, broken link, missing section, incorrect instruction)
- What are the acceptance criteria?
- What is the budget? (low dollar amount, no production credentials, no deploy authority)

### 2.3 Credentials and sandbox access

- Does the chosen provider have a sandbox/test environment?
- What credentials are needed? (API keys, webhook secrets)
- Where do credentials live? (env vars, following the `EXECUTION_PROVIDER_<ID>_CREDENTIALS` convention)

---

## 3. Adapter Contract

Every external execution provider adapter must implement the `ExecutionProvider` interface from `exchange-gateway/src/types.ts`:

```typescript
interface ExecutionProvider {
  id: string
  capabilities(): ExecutionCapabilities
  canExecute(commitment: ContributionCommitment, request: ExecutionRequest): Promise<ExecutionAssessment>
  createExecution(request: ExecutionRequest): Promise<ExecutionReference>
  getExecution(reference: ExecutionReference): Promise<ExecutionStatus>
  cancelExecution?(reference: ExecutionReference): Promise<void>
  verifyExecution?(reference: ExecutionReference): Promise<ExecutionReceipt>
}
```

The adapter performs exactly two translations:

```text
ExecutionRequest  →  Provider-native task/request
Provider-native result  →  ExecutionReceipt
```

### Architectural rules enforced by the adapter

1. **Authorization non-expansion:** The execution authority sent to the provider is always a subset of the commitment's authorization. Provider capabilities never create authorization.
2. **Least disclosure:** The ExecutionRequest includes only what the executor requires. Private negotiation history, unrelated rights clauses, internal company policies, and unnecessary credentials are not forwarded.
3. **Separate state machines:** The provider's native state machine maps into the normalized execution lifecycle (`created → offered → accepted → funded → executing → delivered → verified → settled`). Provider-specific state names never enter the canonical Contribution Exchange state machine.
4. **Callback authentication:** External provider callbacks must be cryptographically authenticated (HMAC-SHA-256 or the provider's native asymmetric webhook signature). Company admin keys and proposer sessions are never accepted for external provider callbacks.
5. **DB-canonical state:** The database is the canonical source of execution state. Provider observations are labeled non-authoritative.
6. **Idempotency:** Provider event IDs + payload hashes prevent duplicate processing. Nonces prevent replay attacks.
7. **Provenance preservation:** Every execution artifact references `contribution_id`, `commitment_hash`, `execution_id`, `provider_reference`, `artifact_hash`, `originator`, and `executor`.

### Callback verifier registration

The adapter's provider ID must be registered with a callback verifier via `verifier-bootstrap.ts`. Credentials follow the env convention:

```text
EXECUTION_PROVIDER_<PROVIDER_ID_UPPER>_CREDENTIALS="keyId:secret;oldKeyId:oldSecret"
```

A provider with no env credentials has no registered verifier, and its callbacks are rejected at the receipt route (fail closed).

### Adapter scaffold

A concrete adapter scaffold is at `exchange-gateway/src/providers/external-provider-adapter.ts`. It implements the `ExecutionProvider` interface with clear TODO markers for provider-specific API calls. Once the owner selects a provider, the scaffold is instantiated with the provider's base URL, credentials, and native API mappings.

---

## 4. First Real Transaction

The deliberately boring first transaction, per the prompt:

```text
Agent encounters domain
  → identifies documentation defect
  → proposes fix
  → Contribution Commitment
  → limited authorization (inspect + test, no modify/deploy)
  → external provider executes
  → artifact returned
  → execution receipt authenticated
  → Contribution layer independently verifies
  → settle
  → lineage retained
```

**Constraints:**
- Low dollar amount
- No production credentials
- No deploy authority
- Easy objective verification

**Verification checklist (from EXECUTION_PROVIDER_PLAN.md Section 18):**
- [ ] originator remains recorded
- [ ] executor is separately recorded
- [ ] authorization does not expand
- [ ] provider state maps correctly
- [ ] artifact hash returns
- [ ] verification evidence returns
- [ ] execution settlement is captured
- [ ] Contribution settlement remains independent
- [ ] rights vest only under Contribution Commitment rules
- [ ] lineage remains intact

---

## 5. Exchange Sequence (3-5 real exchanges)

After the first transaction succeeds, run a small sequence with different shapes:

| # | Shape | What it tests |
|---|-------|---------------|
| 1 | Straightforward successful contribution | Happy path end-to-end |
| 2 | External execution failure and reroute | Failure handling, commitment survives |
| 3 | Disputed/failed verification | Dispute path, verification independence |
| 4 | Originator different from executor | Economic role separation, originator economics |
| 5 | Paid transaction with actual settlement | Settlement, vesting, transaction fee model |

At this point we will know more from five real transactions than from another hundred synthetic tests.

---

## 6. Post-Validation Questions

After the exchange sequence, the project's center of gravity changes. The questions become:

```text
Do agents actually discover the Exchange Profile?
Do they understand what they can propose?
Do domains respond?
What kinds of value are discovered?
What gets accepted?
How long does negotiation take?
What consideration structures emerge?
Do originator economics matter?
Do companies want this installed?
Does the 5% transaction model work?
```

This is where the product actually gets weighed.

---

## 7. Endpoint

```text
CONCEPT                          ✅
PROTOCOL / OBJECT MODEL          ✅
DOMAIN ECONOMIC INTERFACE        ✅
DOMAIN AGENT                     ✅
COMMITMENT / GOVERNANCE          ✅
EXECUTION PROVIDER ABSTRACTION   ✅
SECURITY / HARDENING             ✅
REAL EXTERNAL INTEROPERABILITY   ← NEXT
FIRST REAL EXCHANGES             ↓
ECONOMIC / BEHAVIORAL VALIDATION ↓
DISTRIBUTION + ADOPTION          ↓
```

The foundational build is finished proving that we can keep building the machine. The next phase is proving that other machines and real counterparties can use it without breaking its internal logic. Once that works, the foundational build is considered finished. From there it becomes an operating product that gets improved from evidence, not continuously re-litigated as an architecture.
