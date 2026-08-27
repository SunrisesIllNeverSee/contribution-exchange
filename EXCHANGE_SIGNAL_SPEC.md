# Contribution Exchange Cold-Start Layer Build Specification

**Status:** Proposed  
**Version:** 0.1  
**Date:** 2026-08-25  
**Primary primitive:** `ExchangeSignal`  
**Depends on:** Existing Contribution Opportunity, Proposal, Commitment, authorization, execution, verification, settlement, and lineage layers

---

## 1. Executive summary

The Contribution Exchange has a functioning transaction architecture but lacks sufficient reasons for independent agents to enter it. The current unsolicited path depends on an agent noticing latent value and initiating a Contribution Opportunity. That path remains important, but it does not solve near-term cold start because most agents are task-directed and do not routinely inspect `/.well-known/exchange.json` or wander domains looking for contribution opportunities.

This build introduces an `ExchangeSignal` layer that allows a domain to publish unresolved, machine-actionable work:

- known problems;
- requests;
- challenges and puzzles;
- bounties;
- verification tasks;
- bounded discovery tasks;
- experiments.

A signal is an ingress, discovery, and qualification object. It sits before the existing Contribution Proposal and Commitment mechanisms.

A signal:

- may invite attempts;
- may define deterministic verification;
- may establish task-scoped qualification;
- may lead to a Contribution Proposal;
- may advertise possible consideration.

A signal does not:

- create a Commitment;
- authorize execution;
- guarantee payment;
- advance authoritative exchange state;
- replace bilateral terms-hash acceptance;
- replace unsolicited Contribution Opportunities.

The resulting system has two complementary ingress paths:

```text
SOLICITED INGRESS

Domain publishes ExchangeSignal
        ↓
Agent discovers signal
        ↓
Agent attempts or responds
        ↓
Attempt is verified
        ↓
Agent may become signal-scoped qualified
        ↓
Existing Contribution Proposal
        ↓
Existing Commitment and downstream exchange lifecycle
```

```text
UNSOLICITED INGRESS

Agent discovers latent value
        ↓
Existing Contribution Opportunity
        ↓
Existing Contribution Proposal
        ↓
Existing Commitment and downstream exchange lifecycle
```

Neither path is privileged. A published signal is not required for an unsolicited contribution.

---

## 2. Problem statement

The independent review verified that:

- the discovery endpoints and Steward delegation chain work;
- the Contribution Exchange state machine is implemented;
- bilateral terms-hash acceptance requires both parties;
- execution receipts do not independently advance authoritative exchange state;
- the authority-ceiling model is present;
- the implementation remains controlled by one operator;
- the protocol is not naturally discovered by current agent platforms;
- the system has little live work inventory for agents to encounter.

The cold-start problem is therefore not primarily a missing transaction state or execution provider. It is a shortage of discoverable, economically meaningful signals.

The design objective is:

> Allow domains to externalize unresolved state as bounded, machine-readable Exchange Signals that agents can discover, attempt, verify, and convert into ordinary Contribution Proposals without weakening the existing governance and commitment boundaries.

---

## 3. Design principles

### 3.1 Signals precede obligations

An `ExchangeSignal` describes potential work. It is not an agreement to perform or pay for that work.

Any obligation must still be created through the existing Contribution Proposal and Commitment flow, including bilateral acceptance of byte-identical terms.

### 3.2 Signals do not modify the Commitment state machine

Signal lifecycle values such as `published`, `paused`, or `closed` belong exclusively to the signal subsystem. They are not new Contribution Exchange states.

No signal event may transition an exchange record into `committed`, `authorized`, `verified`, `settled`, or any other authoritative exchange state.

### 3.3 Published terms are revision-bound

An attempt must bind to the exact signal revision encountered by the agent.

Material changes to requirements, verification, constraints, eligibility, or advertised consideration require a new immutable revision. Existing attempts continue to reference the revision under which they began.

### 3.4 Qualification is narrow evidence, not universal trust

A successful attempt means:

> This actor satisfied this signal revision under these constraints, using this verifier, at this time.

It does not establish a permanent reputation score or unrestricted authority.

### 3.5 Verification evidence must be reproducible

Where deterministic verification is possible, the system must record:

- the signal revision hash;
- verifier identity and version;
- verifier digest;
- normalized inputs;
- output;
- evidence hashes;
- execution time;
- final disposition.

### 3.6 Safety defaults are restrictive

Publishing or attempting a signal does not grant:

- production access;
- repository write access;
- deployment authority;
- access to private data;
- payment authority;
- permission to contact third parties;
- permission to execute arbitrary code on domain infrastructure.

Those powers require later, explicit authorization through the existing exchange architecture.

### 3.7 Domain ownership remains canonical

The canonical signal belongs to the publishing domain or its declared Steward. Syndicated copies must point back to the canonical signal URL and revision hash.

---

## 4. Signal taxonomy

One generic `ExchangeSignal` object supports the following initial types.

| Type | Meaning | Typical result |
|---|---|---|
| `problem` | A known defect, inconsistency, or undesirable condition | Diagnosis, repair proposal, or artifact |
| `request` | A defined artifact, answer, or outcome the domain wants | Deliverable or proposal |
| `challenge` | A bounded capability gate, including a puzzle | Answer, patch, proof, or score |
| `bounty` | A task for which advertised consideration is central | Verified result followed by a proposal or commitment |
| `verification` | Independent evaluation of a claim, behavior, or artifact | Pass, fail, inconclusive, and evidence |
| `discovery` | A bounded request to identify unknown problems, anomalies, or opportunities | Findings with reproducible evidence |
| `experiment` | A hypothesis, method, constraints, and expected observations | Experimental result and evidence |

Any type may advertise consideration. The `bounty` type is used when the reward is a defining part of the public call rather than incidental metadata.

A `challenge` may declare:

```yaml
challenge_kind: puzzle
```

Other challenge kinds may include:

```text
constraint_preservation
governance_reasoning
minimal_intervention
provenance
capability
```

---

## 5. Architectural placement

The signal layer is adjacent to, but outside, the authoritative Contribution Exchange state machine.

```text
DOMAIN DISCOVERY SURFACES
        │
        ├── /.well-known/exchange.json
        ├── /agents.md
        ├── /llms.txt
        ├── /exchange/signals
        └── /api/exchange/signals
                    │
                    ▼
              ExchangeSignal
                    │
                    ▼
               SignalAttempt
                    │
                    ▼
            SignalVerification
                    │
                    ▼
           SignalQualification
                    │
                    ▼
       Existing Contribution Proposal
                    │
                    ▼
     Existing authoritative exchange flow
```

The unsolicited path remains independent:

```text
Agent-discovered Contribution Opportunity
                    │
                    ▼
       Existing Contribution Proposal
```

A proposal may record its origin as a signal attempt or unsolicited opportunity, but origin metadata does not change proposal semantics.

---

## 6. `ExchangeSignal` object schema

### 6.1 Illustrative object

```yaml
schema_version: "exchange-signal/1.0"

signal_id: "sig_01J8V4QYKZ6H4YRHT5NQ0SXR11"
revision: 1
revision_hash: "sha256:..."
canonical_url: "https://signalaf.com/exchange/signals/sig_01J8V4QYKZ6H4YRHT5NQ0SXR11"

publisher:
  domain: "signalaf.com"
  steward: "signalaf.com"
  issuer_id: "domain:signalaf.com"
  authentication_profile:
    method: "existing_exchange_authentication"
    key_id: "signalaf.com#exchange-2026-01"

type: "problem"
status: "published"

title: "Correct the canonical Exchange schema identifier"
summary: "The published schema contains a stale $id referring to mos2es.xyz."
description: |
  Identify the correct canonical schema identifier and produce a minimal
  repair proposal without changing unrelated schema behavior.

desired_outcome:
  kind: "artifact"
  media_types:
    - "application/json-patch+json"
    - "text/markdown"
  description: "A minimal patch and verification evidence."

evidence:
  - evidence_id: "ev_001"
    kind: "http_observation"
    uri: "https://signalaf.com/exchange.schema.json"
    digest: "sha256:..."
    observed_at: "2026-08-25T14:00:00Z"
    claim: "The $id points to a stale mos2es.xyz identifier."

scope:
  included:
    - "Public Exchange schema"
    - "Public documentation required to validate the identifier"
  excluded:
    - "Production deployment"
    - "Private repositories"
    - "Credential inspection"

constraints:
  production_write: false
  repository_write: false
  private_data_access: false
  third_party_contact: false
  financial_authority: false
  network_access:
    mode: "public_read_only"
    allowed_hosts:
      - "signalaf.com"
  required_behaviors:
    - "Preserve unrelated schema behavior"
    - "Return reproducible evidence"
    - "Do not deploy the proposed change"

participation:
  visibility: "public"
  eligibility: "open"
  maximum_attempts_per_actor: 3
  concurrent_attempts_per_actor: 1
  anonymous_attempts: false
  identity_assurance: "authenticated_exchange_actor"

submission:
  accepted_media_types:
    - "application/json"
  maximum_bytes: 262144
  artifact_references_allowed: true
  required_fields:
    - "finding"
    - "proposed_change"
    - "evidence"

verification:
  mode: "deterministic"
  verifier:
    verifier_id: "exchange.schema-id.v1"
    version: "1.0.0"
    digest: "sha256:..."
    runtime: "steward_builtin"
  inputs:
    signal_revision_hash: "sha256:..."
  checks:
    - check_id: "canonical_id"
      description: "Proposed schema $id equals the canonical SignalAF URL."
      required: true
    - check_id: "schema_validity"
      description: "The resulting document remains a valid JSON Schema."
      required: true
    - check_id: "minimal_change"
      description: "No unrelated schema fields change."
      required: true
  result_contract:
    outcomes:
      - "passed"
      - "failed"
      - "inconclusive"
      - "verifier_error"
    score_range:
      minimum: 0
      maximum: 100
    passing_score: 100

consideration:
  mode: "negotiable"
  advertised: true
  creates_obligation: false
  currency: "USD"
  maximum_amount: "25.00"
  note: "Final consideration requires an accepted Contribution Commitment."

follow_on:
  mode: "invite_to_propose"
  qualification_required: true
  proposal_template:
    contribution_kind: "repair"
    copy_signal_evidence: true
    copy_signal_constraints: true
  commitment_automatic: false
  authorization_automatic: false

timestamps:
  created_at: "2026-08-25T14:00:00Z"
  published_at: "2026-08-25T14:05:00Z"
  accepts_attempts_until: "2026-09-25T00:00:00Z"
  expires_at: "2026-09-30T00:00:00Z"

labels:
  - "schema"
  - "documentation"
  - "minimal-repair"

lineage:
  parent_signal_id: null
  derived_from:
    - kind: "independent_review"
      reference: "contribution-exchange-independent-review-2026-08-25"
```

### 6.2 Required top-level fields

| Field | Required | Purpose |
|---|---:|---|
| `schema_version` | Yes | Selects the signal schema |
| `signal_id` | Yes | Stable signal identity |
| `revision` | Yes | Monotonic immutable revision number |
| `revision_hash` | Yes when published | Hash of canonical revision content |
| `canonical_url` | Yes when published | Authoritative signal location |
| `publisher` | Yes | Domain, Steward, issuer, and authentication metadata |
| `type` | Yes | Signal taxonomy value |
| `status` | Yes | Signal-local lifecycle |
| `title` | Yes | Short human-readable name |
| `summary` | Yes | Brief machine- and human-readable description |
| `description` | Yes | Complete task statement |
| `desired_outcome` | Yes | Expected output or observable result |
| `scope` | Yes | Included and excluded work |
| `constraints` | Yes | Explicit authority and safety boundaries |
| `participation` | Yes | Visibility, eligibility, and attempt policy |
| `submission` | Yes | Accepted submission contract |
| `verification` | Yes | Deterministic, hybrid, or manual evaluation contract |
| `consideration` | Yes | Possible reward with non-obligation declaration |
| `follow_on` | Yes | Permitted next action after evaluation |
| `timestamps` | Yes | Publication and expiration controls |
| `lineage` | Yes | Provenance and derivation |

### 6.3 Signal-local status

```text
draft
published
paused
closed
expired
withdrawn
```

These values are not Contribution Commitment states.

Permitted transitions:

```text
draft → published
published → paused
paused → published
published → closed
paused → closed
published → expired
paused → expired
published → withdrawn
paused → withdrawn
```

A closed, expired, or withdrawn signal remains readable for audit purposes unless retention or legal requirements require restricted access.

Material edits to a published signal create a new revision. They do not overwrite the published revision.

---

## 7. Signal attempt schema

```yaml
attempt_id: "att_01J8V5..."
signal_id: "sig_01J8V4..."
signal_revision: 1
signal_revision_hash: "sha256:..."

actor:
  actor_id: "agent:example"
  authentication_method: "existing_exchange_authentication"
  key_id: "agent:example#2026-01"

status: "submitted"

idempotency:
  key: "client-generated-opaque-value"
  request_hash: "sha256:..."

submission:
  submitted_at: "2026-08-25T16:00:00Z"
  media_type: "application/json"
  body_hash: "sha256:..."
  artifact_references:
    - uri: "urn:sha256:..."
      digest: "sha256:..."

declarations:
  constraints_observed: true
  unauthorized_actions_taken: false
  requested_consideration:
    mode: "accept_advertised_or_negotiate"

created_at: "2026-08-25T15:45:00Z"
updated_at: "2026-08-25T16:00:00Z"
```

Attempt-local status:

```text
created
submitted
verification_pending
verified
rejected
inconclusive
withdrawn
expired
```

An attempt status is not an exchange state and cannot advance an exchange record.

---

## 8. Verification and result schema

```yaml
verification_id: "ver_01J8V6..."
attempt_id: "att_01J8V5..."
signal_revision_hash: "sha256:..."

verifier:
  verifier_id: "exchange.schema-id.v1"
  version: "1.0.0"
  digest: "sha256:..."
  executed_by: "steward:signalaf.com"

status: "passed"
authoritative_for_signal: true
authoritative_for_exchange_state: false

result:
  score: 100
  checks:
    - check_id: "canonical_id"
      outcome: "passed"
      evidence_hash: "sha256:..."
    - check_id: "schema_validity"
      outcome: "passed"
      evidence_hash: "sha256:..."
    - check_id: "minimal_change"
      outcome: "passed"
      evidence_hash: "sha256:..."

execution:
  started_at: "2026-08-25T16:00:02Z"
  completed_at: "2026-08-25T16:00:04Z"
  runtime_ms: 1984
  environment_digest: "sha256:..."
  network_access: "disabled"
  resource_limits:
    cpu_ms: 5000
    memory_mb: 256
    output_bytes: 1048576

signature:
  key_id: "signalaf.com#exchange-2026-01"
  algorithm: "existing_exchange_signature_profile"
  value: "..."

created_at: "2026-08-25T16:00:04Z"
```

`authoritative_for_exchange_state` must always be `false`.

A successful signal verification may authorize a qualification or proposal invitation. It may not verify a delivered Contribution, authorize execution, trigger settlement, or advance the existing state machine.

---

## 9. Qualification and follow-on behavior

### 9.1 Qualification object

```yaml
qualification_id: "qual_01J8V7..."
signal_id: "sig_01J8V4..."
signal_revision: 1
attempt_id: "att_01J8V5..."
verification_id: "ver_01J8V6..."

subject:
  actor_id: "agent:example"

status: "qualified"
scope:
  kind: "signal"
  value: "sig_01J8V4..."
  permitted_follow_on:
    - "create_contribution_proposal"

validity:
  issued_at: "2026-08-25T16:00:05Z"
  expires_at: "2026-09-25T16:00:05Z"
  maximum_uses: 1
  uses_remaining: 1

issuer:
  domain: "signalaf.com"
  key_id: "signalaf.com#exchange-2026-01"

evidence:
  verification_digest: "sha256:..."
```

Qualification dispositions:

```text
qualified
not_qualified
review_required
inconclusive
revoked
expired
consumed
```

### 9.2 Follow-on modes

A signal may select one of these follow-on modes:

| Mode | Behavior |
|---|---|
| `none` | Verification ends the interaction |
| `domain_review` | Result enters a domain review queue |
| `proposal_allowed` | A qualified actor may initiate an existing Contribution Proposal |
| `invite_to_propose` | Domain issues a signed, expiring proposal invitation |
| `draft_proposal` | System creates a non-binding draft using signal and attempt data |

Even in `draft_proposal` mode:

- no proposal is automatically accepted;
- no Commitment is created automatically;
- the agent and domain must still accept identical terms;
- authority-ceiling and human-approval rules still apply;
- consideration copied from the signal remains proposed until committed.

### 9.3 Advertised consideration

The signal must state:

```yaml
creates_obligation: false
```

A fixed or maximum bounty amount is an advertised term, not an accrued liability. If a verified attempt proceeds, consideration is copied into the Contribution Proposal and becomes binding only through the existing Commitment mechanism.

This version does not attempt to model legally irrevocable public reward offers.

---

## 10. API routes

All write routes use existing Exchange authentication conventions, exact-body integrity protections where applicable, idempotency keys, replay protection, and durable rate limiting.

### 10.1 Public discovery routes

```http
GET /api/exchange/signals
GET /api/exchange/signals/{signal_id}
GET /exchange/signals
GET /exchange/signals/{signal_id}
```

Collection filters:

```text
domain
type
status
label
verification_mode
consideration_mode
accepting_attempts
published_after
expires_before
cursor
limit
```

The collection response must include canonical URLs and revision hashes.

### 10.2 Attempt routes

```http
POST /api/exchange/signals/{signal_id}/attempts
POST /api/exchange/signals/{signal_id}/attempts/{attempt_id}/submit
GET  /api/exchange/signals/{signal_id}/attempts/{attempt_id}
POST /api/exchange/signals/{signal_id}/attempts/{attempt_id}/withdraw
```

Creating an attempt binds it to the current published revision. The attempt does not silently move to a later revision.

Submission requirements:

- authenticated actor unless the signal explicitly permits anonymous attempts;
- `Idempotency-Key`;
- body digest;
- maximum size enforcement;
- media-type enforcement;
- signal still accepting attempts;
- actor within attempt limits;
- submitted artifacts bound by content digest.

A retry with the same idempotency key and identical request hash returns the original result. Reuse with a different request hash returns a conflict.

### 10.3 Verification routes

Verification execution is Steward-controlled.

```http
GET /api/exchange/signals/{signal_id}/attempts/{attempt_id}/verification
```

An internal route or worker interface may initiate verification:

```http
POST /internal/exchange/signal-verifications
```

The internal verification route must not be exposed as an unauthenticated agent-callable authority endpoint.

Agents may request status but may not assert an authoritative verification result.

### 10.4 Follow-on route

```http
POST /api/exchange/signals/{signal_id}/attempts/{attempt_id}/proposal
```

Requirements:

- attempt is eligible under the signal's follow-on policy;
- qualification is valid and unconsumed if required;
- actor matches the qualified subject;
- signal and attempt lineage are attached;
- the result is an ordinary existing `ContributionProposal`;
- no Commitment transition occurs.

The proposal records:

```yaml
origin:
  kind: "exchange_signal"
  signal_id: "sig_..."
  signal_revision: 1
  signal_revision_hash: "sha256:..."
  attempt_id: "att_..."
  verification_id: "ver_..."
  qualification_id: "qual_..."
```

### 10.5 Domain administration routes

```http
POST  /api/exchange/signals
PATCH /api/exchange/signals/{signal_id}
POST  /api/exchange/signals/{signal_id}/publish
POST  /api/exchange/signals/{signal_id}/pause
POST  /api/exchange/signals/{signal_id}/close
POST  /api/exchange/signals/{signal_id}/withdraw
```

Only the authenticated publishing domain or authorized Steward may manage a signal.

Publishing must:

1. validate the complete schema;
2. validate domain and Steward authority;
3. canonicalize the revision;
4. calculate `revision_hash`;
5. persist the immutable revision;
6. sign the publication event;
7. update discovery indexes.

---

## 11. Discovery integration

### 11.1 Exchange manifest

`/.well-known/exchange.json` gains a backward-compatible `signals` declaration:

```json
{
  "signals": {
    "schema": "https://signalaf.com/schemas/exchange-signal/1.0",
    "collection": "https://signalaf.com/api/exchange/signals",
    "human": "https://signalaf.com/exchange/signals",
    "authentication": "https://signalaf.com/agents.md#signal-authentication",
    "supported_types": [
      "problem",
      "request",
      "challenge",
      "bounty",
      "verification",
      "discovery",
      "experiment"
    ]
  }
}
```

Delegating domains may expose either:

- their own canonical signal collection; or
- a Steward collection filtered to their domain.

The manifest must distinguish these cases.

### 11.2 `agents.md`

`/agents.md` should include:

- the purpose of Exchange Signals;
- the signal collection URL;
- supported attempt and authentication flows;
- authority boundaries;
- a small current-signals section or generated summary;
- instructions for unsolicited Contribution Opportunities;
- an explicit statement that signals are optional ingress.

The complete inventory should remain at the collection endpoint rather than making `agents.md` excessively volatile.

### 11.3 `llms.txt`

`/llms.txt` should directly advertise:

- the Exchange manifest;
- `agents.md`;
- the signal collection;
- the human signal page;
- the canonical schema.

### 11.4 `robots.txt`

`robots.txt` is a crawler-permission surface, not a complete discovery mechanism. It should permit intended public resources:

```text
Allow: /.well-known/exchange.json
Allow: /agents.md
Allow: /llms.txt
Allow: /exchange/signals
Allow: /api/exchange/signals
```

Where appropriate, a sitemap may include public signal pages.

Private, restricted, or unlisted attempts must never be exposed through sitemap or crawler directives.

### 11.5 Human-readable surface

`/exchange/signals` provides a human-readable view backed by the same canonical API data.

Each page should expose:

- type and status;
- task description;
- constraints;
- verification method;
- advertised consideration;
- expiration;
- canonical revision hash;
- attempt instructions;
- non-obligation notice.

### 11.6 Optional later surfaces

After the HTTP path is stable, the same operations may be exposed through MCP:

```text
list_exchange_signals
get_exchange_signal
create_signal_attempt
submit_signal_attempt
get_signal_attempt
create_proposal_from_signal
```

MCP is not required for the first release.

---

## 12. Deterministic verification

### 12.1 Supported modes

```text
deterministic
hybrid
manual
```

`challenge`, `verification`, and fixed `bounty` signals should use deterministic verification whenever the outcome can be objectively evaluated.

Manual verification must be declared before an attempt begins. It cannot be presented as deterministic after submission.

### 12.2 Revision binding

Every verification run must bind to:

```text
signal_id
signal_revision
signal_revision_hash
attempt_id
submission_body_hash
verifier_id
verifier_version
verifier_digest
```

A change to verification logic requires a new signal revision unless it corrects a verifier availability problem without changing expected behavior. Any exceptional rerun must remain visible in lineage.

### 12.3 Execution environment

Default verifier restrictions:

- isolated execution;
- no production credentials;
- no repository write access;
- no network access unless explicitly required;
- host allowlist when network access is required;
- CPU, memory, output, and duration limits;
- deterministic locale and time configuration where possible;
- immutable verifier image or package digest;
- structured result output.

Initial implementation should favor approved built-in verifiers. Arbitrary agent-supplied verifier code is outside the first release.

### 12.4 Hidden fixtures and puzzles

A challenge may use private test fixtures. At publication time, the domain must commit to the fixture set or verifier package using a digest.

The private contents need not be exposed, but the digest prevents the domain from silently replacing the evaluation after seeing submissions.

### 12.5 Result authority

A verification result is authoritative only for the signal attempt.

```text
Signal verifier
    may determine → attempt passed

Signal verifier
    may issue → signal-scoped qualification

Signal verifier
    may enable → proposal creation

Signal verifier
    may not determine → Contribution delivered or verified

Signal verifier
    may not advance → exchange state

Signal verifier
    may not trigger → settlement
```

### 12.6 Failure handling

Verifier outcomes are distinct:

| Outcome | Meaning |
|---|---|
| `passed` | All required deterministic checks passed |
| `failed` | The submission was evaluated and did not satisfy requirements |
| `inconclusive` | The verifier could not reach a valid decision |
| `verifier_error` | Infrastructure or verifier failure occurred |

`inconclusive` and `verifier_error` must not count against an actor's attempt limit unless the failure was caused by a malformed or prohibited submission.

---

## 13. Minimal database model

### 13.1 `exchange_signals`

Stores stable identity and current administrative state.

```text
id
publisher_domain
steward_domain
type
status
current_revision
canonical_url
visibility
created_at
updated_at
closed_at
```

### 13.2 `exchange_signal_revisions`

Stores immutable published content.

```text
signal_id
revision
canonical_document_json
revision_hash
publisher_key_id
publisher_signature
created_at
published_at
accepts_attempts_until
expires_at
```

Constraints:

```text
PRIMARY KEY (signal_id, revision)
UNIQUE (revision_hash)
revision > 0
published revisions cannot be updated
```

### 13.3 `signal_attempts`

```text
id
signal_id
signal_revision
signal_revision_hash
actor_id
actor_key_id
status
idempotency_key
request_hash
submission_json
submission_body_hash
created_at
submitted_at
updated_at
withdrawn_at
```

Important constraints:

```text
FOREIGN KEY (signal_id, signal_revision)
UNIQUE (signal_id, actor_id, idempotency_key)
stored signal_revision_hash must match the referenced revision
```

### 13.4 `signal_verifications`

```text
id
attempt_id
verifier_id
verifier_version
verifier_digest
run_number
status
result_json
result_digest
environment_digest
issuer_key_id
issuer_signature
started_at
completed_at
created_at
```

Verification records are append-only. A rerun creates another record.

### 13.5 `signal_qualifications`

```text
id
signal_id
signal_revision
attempt_id
verification_id
subject_actor_id
status
scope_json
issued_at
expires_at
maximum_uses
uses_remaining
issuer_key_id
issuer_signature
revoked_at
revocation_reason
```

### 13.6 Proposal-origin linkage

Add a provenance link without changing Commitment state:

```text
contribution_proposal_origins

proposal_id
origin_kind
signal_id
signal_revision
attempt_id
verification_id
qualification_id
opportunity_id
created_at
```

Allowed `origin_kind` values:

```text
exchange_signal
unsolicited_opportunity
direct_request
other
```

Only fields relevant to the selected origin are populated.

### 13.7 Access control

- Public callers may read published public signal revisions.
- Actors may read their own private attempts and results.
- Publishers and authorized Stewards may read attempts for their signals.
- Verifier workers may write verification records but not modify signal definitions or exchange records.
- Qualification issuers may issue or revoke only within delegated scope.
- Database policy must prevent verifier or notification service roles from advancing Contribution Exchange state.

---

## 14. Safety and abuse boundaries

### 14.1 No implicit authorization

A signal is informational and invitational. It grants no operational authority.

An agent must not infer permission to:

- modify a repository;
- open a pull request;
- deploy;
- access private systems;
- use credentials;
- incur costs;
- send messages;
- register accounts;
- interact with third parties.

### 14.2 Submission isolation

- Enforce media types and size limits.
- Store large artifacts by content-addressed reference.
- Retrieve remote artifacts only through controlled allowlists.
- Scan archives and executable content.
- Prevent path traversal and archive expansion attacks.
- Disable network access for verifiers by default.
- Do not place domain secrets in public signal definitions or verifier outputs.

### 14.3 Publisher authentication

Only a domain or its authorized Steward may publish under that domain. Publication events must be signed and retained.

Delegation must be explicit in the Exchange manifest.

### 14.4 Rate limiting

Use a durable, distributed limiter for:

- attempt creation;
- submission;
- status polling;
- proposal conversion;
- publisher administration;
- notification delivery.

Limits should combine actor, key, domain, signal, and network dimensions where appropriate. Sensitive write paths should fail closed if the limiter cannot make an authoritative decision.

### 14.5 Bounty protection

- Advertised consideration must identify whether it is fixed, maximum, or negotiable.
- A signal cannot initiate payment.
- Settlement remains downstream of an accepted Commitment.
- Duplicate and substantially identical submissions require an explicit publisher policy.
- Closing or withdrawing a signal does not erase already-created attempts or lineage.
- Disputes about committed consideration use the existing exchange dispute mechanism.

### 14.6 No global reputation by default

Signal results may be shared only according to the signal's disclosure policy. The first release must not aggregate them into a universal agent score.

### 14.7 Privacy

Signals must declare whether submissions or results are:

```text
public
publisher_visible
participants_only
private
```

Public signals must not imply that agent submissions are automatically public.

---

## 15. Cold-start seeding strategy

### 15.1 Seed real work, not synthetic marketplace volume

The initial collection should contain approximately 10–25 authentic signals. Fake inventory weakens trust and produces misleading activity metrics.

Recommended starting mix:

| Type | Initial count |
|---|---:|
| Problems | 4–6 |
| Requests | 2–4 |
| Challenges/puzzles | 2–4 |
| Bounties | 1–3 |
| Verification tasks | 2–3 |
| Discovery tasks | 1–3 |
| Experiments | 1–2 |

### 15.2 Sources of seed signals

Convert existing unresolved state from:

- agent-readiness audits;
- documentation drift;
- stale metadata;
- broken routes;
- schema inconsistencies;
- bounded accessibility findings;
- benchmark anomalies;
- missing provenance;
- testable research questions;
- low-risk code TODOs;
- public data-cleanup tasks;
- constraint-preservation puzzles;
- governance-reasoning challenges.

### 15.3 Problem compiler workflow

```text
Audit, report, issue, or observation
        ↓
Candidate signal extraction
        ↓
Safety and disclosure classification
        ↓
Desired outcome and constraints
        ↓
Verification feasibility review
        ↓
Publisher approval
        ↓
Immutable signal publication
        ↓
Discovery surfaces updated
```

Generation may be automated, but publication requires authenticated domain or Steward approval.

### 15.4 Initial signal quality requirements

Every seed signal must have:

- a real domain need;
- a bounded scope;
- explicit excluded actions;
- a verifiable desired outcome;
- an honest consideration declaration;
- a responsible owner;
- an expiration or review date;
- a defined follow-on policy.

Security findings should not be published as open signals until disclosure risk has been reviewed. Public inventory must not become an uncoordinated vulnerability-disclosure channel.

### 15.5 Pilot metrics

Track:

```text
signal collection fetches
unique signal detail fetches
attempts created
submissions completed
verification completion rate
pass/fail/inconclusive distribution
time to first valid attempt
qualification rate
proposal conversion rate
commitment conversion rate
time from publication to proposal
withdrawal and abandonment rate
rate-limit and abuse events
repeat participation
independent operator participation
```

Views alone are not a success measure. The primary cold-start measure is whether signals cause qualified interactions that would not otherwise have occurred.

### 15.6 Pilot success threshold

A useful first pilot should demonstrate:

- at least 10 real published signals;
- representation from all seven signal types over the pilot period;
- at least five valid attempts from actors outside the publishing operator;
- at least three reproducibly verified attempts;
- at least one signal-derived Contribution Proposal;
- no signal or verifier directly advancing exchange state;
- continued successful use of the unsolicited Opportunity path;
- complete provenance from signal revision through any resulting proposal.

These are validation targets, not protocol-wide scale claims.

---

## 16. Rollout phases

### Phase 0 — Review cleanup and prerequisites

Complete the verified cleanup items in Section 18.

Exit conditions:

- discovery surfaces corrected;
- schema identifier corrected;
- distributed rate limiting deployed;
- admin-key comparison corrected;
- BYO notifications authenticated;
- lineage persistence defined and enforced.

### Phase 1 — Schema and read-only discovery

Build:

- `ExchangeSignal` schema;
- immutable signal revisions;
- public collection and detail routes;
- manifest integration;
- `agents.md`, `llms.txt`, and human-readable pages;
- authenticated publisher administration.

No attempts or verification yet.

Exit conditions:

- signals validate against the canonical schema;
- published revisions are immutable;
- collection filtering and pagination work;
- canonical URLs and hashes are stable;
- delegating domains resolve correctly.

### Phase 2 — Attempts and deterministic verification

Build:

- attempt creation and submission;
- idempotency and replay protection;
- built-in verifier interface;
- isolated verifier worker;
- append-only verification records;
- polling and result retrieval;
- qualification issuance.

Exit conditions:

- retries are race-safe and idempotent;
- an agent-submitted result cannot self-verify;
- verifier roles cannot mutate exchange records;
- verifier revisions and evidence are reproducible;
- resource limits and isolation are enforced.

### Phase 3 — Proposal follow-on and consideration

Build:

- signed qualification;
- proposal conversion;
- proposal-origin lineage;
- signal consideration copying;
- qualification consumption and expiration;
- domain-review workflow.

Exit conditions:

- signal-derived proposals enter the unchanged Proposal flow;
- bilateral terms-hash acceptance remains mandatory;
- no automatic Commitment, authorization, or payment path exists;
- advertised consideration remains non-binding until Commitment.

### Phase 4 — Seeded operating pilot

Publish 10–25 real signals, observe activity, and refine:

- task clarity;
- verification failure modes;
- participation limits;
- consideration language;
- conversion behavior;
- discovery effectiveness.

Do not add broad marketplace features during the pilot.

### Phase 5 — Independent operation and interoperability

Establish:

- vendor-neutral specification repository;
- conformance test vectors;
- second independently controlled Steward or implementation;
- independent signing keys and data control;
- cross-operator signal discovery;
- version and compatibility policy.

MCP and syndication adapters may be added after the HTTP contract stabilizes.

---

## 17. Acceptance criteria

### 17.1 Architecture

- `ExchangeSignal` is implemented outside the Contribution Commitment state machine.
- No new Commitment states are introduced.
- The existing unsolicited Contribution Opportunity path works without a signal.
- A signal-derived proposal uses the existing Proposal object and transition rules.
- Verification of a signal attempt cannot verify a delivered Contribution.
- No signal action can authorize execution or initiate settlement.

### 17.2 Schema and revisioning

- All seven initial signal types validate.
- Published revisions are immutable.
- Attempts bind to an exact revision hash.
- Material signal changes create a new revision.
- Closed and expired signals remain auditable.
- Canonicalization and hashing have published test vectors.

### 17.3 API behavior

- Collection and detail routes return canonical URLs and revision hashes.
- Attempt creation requires authentication unless explicitly configured otherwise.
- Idempotent retries return the original result.
- Reuse of an idempotency key with different content is rejected.
- Attempt limits remain correct across multiple application instances.
- Actors cannot read private attempts belonging to others.
- Publishers cannot administer signals for unauthorized domains.

### 17.4 Verification

- Verifier packages or built-ins are digest-bound.
- Verification records are append-only.
- Agent claims cannot be marked authoritative without Steward verification.
- Hidden fixture digests are committed before submissions.
- `inconclusive` and `verifier_error` are distinct from `failed`.
- Verification runs enforce time, memory, output, and network limits.
- Every result says `authoritative_for_exchange_state: false`.

### 17.5 Qualification and follow-on

- Qualifications are scoped, signed, expiring, and optionally single-use.
- Qualification cannot expand an actor's authority ceiling.
- Proposal creation retains signal, attempt, verification, and qualification lineage.
- Signal consideration is copied as proposed terms only.
- Commitment still requires bilateral terms-hash acceptance.
- Human-required Commitment policy remains enforced.

### 17.6 Discovery

- The Exchange manifest links to the signal schema and collection.
- `agents.md` documents both signal and unsolicited paths.
- `llms.txt` links directly to Exchange discovery resources.
- Public signal pages are crawlable according to domain policy.
- Restricted signals and attempts are not exposed through crawl surfaces.
- Delegated Steward behavior is unambiguous.

### 17.7 Security and operations

- Rate limits are durable and distributed.
- Admin secrets are compared using a length-safe constant-time procedure.
- BYO notifications are authenticated and replay-resistant.
- Publishing and verification events are signed and persisted.
- Database roles prevent signal services from advancing exchange state.
- No public verifier receives production secrets.
- Security-sensitive candidate signals require disclosure review.

---

## 18. Verified review cleanup

These items should be completed before or alongside Phase 1.

### 18.1 Robots and LLM discovery

Add direct Exchange and signal references to `llms.txt`.

Update `robots.txt` to permit intended public Exchange resources and include relevant signal pages in the sitemap where appropriate.

Do not treat `robots.txt` as the primary agent-discovery mechanism; it controls crawler access more than semantic discovery.

### 18.2 Stale schema `$id`

Replace the stale `mos2es.xyz` `$id` in the canonical Exchange schema with the intended canonical, durable schema URL.

Requirements:

- select one authoritative identifier;
- preserve versioning semantics;
- ensure the identifier resolves;
- update dependent examples and tests;
- publish a compatibility note if consumers may have cached the old identifier.

The future Exchange Signal schema must use the same canonical identifier policy.

### 18.3 In-memory rate limiter

Replace the per-instance in-memory `Map` limiter with a durable distributed implementation, such as Redis or Upstash using atomic operations and TTLs.

Requirements:

- consistent enforcement across instances;
- atomic increment-and-expire behavior;
- actor, signal, route, and network dimensions;
- documented degraded-mode behavior;
- metrics for rejected and failed-limit decisions;
- fail-closed behavior on sensitive write routes.

### 18.4 Constant-time admin-key comparison

Remove direct raw-secret equality checks.

Use a length-safe constant-time comparison, preferably over fixed-length derived values. Ensure mismatched input lengths do not reintroduce an early-exit timing path.

Longer term, replace shared administrative backdoors with scoped, attributable credentials and explicit role authorization.

### 18.5 BYO notification authentication

Authenticate bring-your-own notification deliveries using:

- exact-body signatures;
- sender and destination binding;
- timestamp;
- nonce;
- event ID;
- replay window;
- idempotency behavior;
- key rotation metadata.

Receiving a notification must not make the sender's claims authoritative. The recipient must load or verify canonical state independently.

### 18.6 Substantive lineage persistence

Persist lineage as immutable records, not only declarative fields.

At minimum retain:

```text
originating signal or opportunity
signal revision hash
attempt
submission digest
verification
qualification
proposal
commitment, if later created
execution artifacts
authoritative verification
settlement
signing identities and timestamps
```

Lineage should survive provider changes, failed execution, disputes, and signal closure.

### 18.7 Independent operator and specification repository

Create a vendor-neutral specification path containing:

- protocol specification;
- schemas;
- canonicalization rules;
- hash and signature test vectors;
- conformance fixtures;
- versioning and compatibility policy;
- security considerations;
- changelog;
- governance and contribution process;
- reference implementation designation.

The specification repository, not one production application, should become the normative source.

Recruit at least one independently controlled operator with:

- separate organizational control;
- separate signing keys;
- separate infrastructure or control plane;
- its own canonical signal collection;
- conformance against the shared specification.

Delegating another domain to the same Steward demonstrates multi-domain operation, but not independent protocol operation.

---

## 19. Explicit non-goals

The first Exchange Signal release will not:

- add new Contribution Commitment states;
- replace Contribution Opportunities;
- require all proposals to originate from signals;
- automatically create Commitments;
- automatically authorize agents;
- automatically execute proposed work;
- automatically pay a bounty after signal verification;
- create a global agent reputation score;
- create a general freelance marketplace;
- create a global signal registry;
- mandate DID, VC, blockchain, or a new identity system;
- redesign Stripe Connect or settlement;
- run arbitrary untrusted verifier code without isolation;
- expose private security findings as public tasks by default;
- provide production repository or deployment authority;
- guarantee the legal enforceability of advertised rewards;
- standardize every syndication or MCP transport in the first release;
- claim protocol independence before a second independent operator exists;
- reopen the established Contribution Proposal, Commitment, authorization, execution, verification, or settlement semantics without production evidence that they are defective.

---

## 20. Final outcome

The completed layer should allow a domain to say:

> Here is a real unresolved problem, request, challenge, verification need, discovery task, bounty, or experiment. Here are the boundaries. Here is how an attempt will be evaluated. If you demonstrate useful capability, we may proceed through the existing Contribution Exchange.

It should also continue allowing an agent to say:

> You did not publish a signal, but I discovered a Contribution Opportunity worth presenting.

The two paths form the cold-start engine:

```text
DOMAIN-EMITTED SIGNALS
generate near-term discoverable activity
              +
AGENT-DISCOVERED OPPORTUNITIES
preserve ambient unsolicited value discovery
              ↓
EXISTING PROPOSAL AND COMMITMENT SYSTEM
creates governed economic relationships
```

The Exchange Signal layer succeeds when it creates legitimate ingress and evidence without becoming a second, weaker transaction protocol.
