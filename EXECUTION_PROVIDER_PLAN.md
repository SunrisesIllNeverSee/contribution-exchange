# Execution Provider Integration Plan

## Objective

Extend the Contribution Exchange with a generic execution-provider layer.

The purpose is to let an accepted and authorized Contribution Commitment route work into an external execution system when outside execution is useful.

External systems may provide capabilities such as:

- task execution
- worker discovery
- escrow
- collateral
- verification
- arbitration
- agent-to-agent messaging
- settlement

The Contribution Exchange must remain authoritative for:

- opportunity origin
- Contribution Proposal
- Contribution Commitment
- parties
- rights
- consideration
- vesting
- authorization
- revocation
- provenance
- lineage
- final exchange state

External execution infrastructure is downstream infrastructure, not the governing system.

---

## Core Architecture

```text
AMBIENT DISCOVERY / REQUEST
          ↓
Contribution Proposal
          ↓
Domain Agent
          ↓
Negotiation
          ↓
Contribution Commitment
          ↓
Authorization
          ↓
Execution Router
          ↓
┌─────────────────────────────────────┐
│ Execution Providers                 │
│                                     │
│ internal agent                      │
│ direct external agent               │
│ external task network               │
│ specialist execution network        │
│ future execution providers          │
└─────────────────────────────────────┘
          ↓
Execution Result / Verification
          ↓
Contribution Commitment
          ↓
Vesting
          ↓
Settlement
          ↓
Lineage
```

---

## Architectural Rule

External execution state must never become the authoritative Contribution Exchange state.

```text
External execution state
          ≠
Contribution Commitment state
```

An external provider reports execution facts back into the exchange.

It must not independently determine:

- ownership
- rights
- authorization
- vesting
- revocation
- originator economics
- contribution lineage

---

## 1. Add a Generic Execution Provider Interface

Create a provider abstraction in the portable Contribution Exchange core.

Conceptual interface:

```ts
interface ExecutionProvider {
  id: string

  capabilities(): ExecutionCapabilities

  canExecute(
    commitment: ContributionCommitment,
    request: ExecutionRequest
  ): Promise<ExecutionAssessment>

  createExecution(
    request: ExecutionRequest
  ): Promise<ExecutionReference>

  getExecution(
    reference: ExecutionReference
  ): Promise<ExecutionStatus>

  cancelExecution?(
    reference: ExecutionReference
  ): Promise<void>

  verifyExecution?(
    reference: ExecutionReference
  ): Promise<VerificationResult>
}
```

The core must not depend on any specific provider.

Provider-specific implementations sit behind this interface.

Example internal provider IDs:

```text
internal
direct_agent
external_provider_a
external_provider_b
```

Vendor names may exist inside provider-specific implementation folders but must not become canonical protocol terminology.

---

## 2. Create Execution Capabilities

Each provider should declare what it supports.

Example:

```ts
interface ExecutionCapabilities {
  task_execution: boolean
  worker_discovery: boolean
  escrow: boolean
  collateral: boolean
  verification: boolean
  arbitration: boolean
  agent_messaging: boolean
  programmable_splits: boolean
  fiat_settlement: boolean
  crypto_settlement: boolean
}
```

The Execution Router uses these capabilities to determine whether a provider can satisfy a given request.

---

## 3. Create an Execution Request

The Execution Request is the translation boundary between the Contribution Commitment and downstream execution.

Do not forward the complete Contribution Commitment unless absolutely necessary.

Use least disclosure.

Suggested structure:

```yaml
execution_id:
contribution_id:
source_commitment_hash:

task:
  title:
  description:
  deliverables:
  acceptance_criteria:

budget:
  amount:
  currency:
  maximum:

authority:
  inspect:
  test:
  modify:
  deploy:
  access_scope:

verification:
  criteria:
  evidence_required:

deadline:

provenance:
  originator:
  contribution_lineage:
```

The Execution Request should include only what the executor requires.

Do not automatically expose:

- private negotiation history
- unrelated rights clauses
- internal company policies
- private participant information
- unnecessary credentials
- unrelated consideration terms

---

## 4. Add Execution Routing

After a Contribution Commitment exists and the necessary authorization has been granted, determine the execution mode.

Supported execution modes should include:

```text
NO_EXECUTION_REQUIRED
SELF_EXECUTED
DIRECT_AGENT
EXTERNAL_PROVIDER
HUMAN
```

Example:

```yaml
execution:
  mode: external_provider
  provider: provider_id
```

Initial routing may be explicit.

Do not build complex automatic optimization yet.

Later, the Domain Agent may select a provider based on:

- capability
- policy
- cost
- availability
- trust
- reputation
- settlement method
- jurisdiction
- execution requirements

---

## 5. Normalize External Execution State

Create an internal normalized execution lifecycle.

Suggested lifecycle:

```text
CREATED
→ OFFERED
→ ACCEPTED
→ FUNDED
→ EXECUTING
→ DELIVERED
→ VERIFIED
→ SETTLED
```

Branches:

```text
FAILED
CANCELLED
DISPUTED
EXPIRED
```

Each external provider maps its native state machine into this normalized lifecycle.

Do not add provider-specific state names to the canonical Contribution Exchange state machine.

---

## 6. Preserve Separate State Machines

The Contribution Exchange lifecycle and external execution lifecycle must remain separate.

### Contribution Exchange

```text
proposed
→ engaged
→ negotiating
→ committed
→ authorized
→ delivering
→ delivered
→ verified
→ settled
→ closed
```

### External Execution

```text
created
→ offered
→ accepted
→ funded
→ executing
→ delivered
→ verified
→ settled
```

An external provider reporting `verified` does not automatically move the Contribution Commitment to `verified`.

An external provider reporting `settled` does not automatically mean Contribution rights have vested.

The Contribution Exchange evaluates its own declared conditions.

---

## 7. Create an Execution Receipt

Every provider must normalize its result into an Execution Receipt.

Suggested structure:

```yaml
execution_reference:
provider:
provider_reference:

status:

executor:
  id:
  identity:
  role:

artifact:
  uri:
  hash:

verification:
  status:
  evidence:

settlement:
  status:
  amount:
  currency:
  receipt:

timestamps:
  created:
  started:
  delivered:
  verified:
  settled:

provider_metadata:
  reference:
```

The Execution Receipt becomes evidence attached to the Contribution Commitment and its lineage.

---

## 8. Preserve Economic Roles

Execution may be performed by a different actor from the one that discovered the opportunity.

The economic graph must preserve distinct roles such as:

```text
originator
discoverer
contributor
executor
collaborator
verifier
referrer
recipient
```

Example:

```text
Agent A discovers opportunity
        ↓
Agent A originates Contribution Proposal
        ↓
Company accepts Contribution Commitment
        ↓
Agent B executes the work
        ↓
Agent A retains whatever agreed originator economics apply
        ↓
Agent B receives executor economics
```

Do not allow execution outsourcing to erase contribution origin.

---

## 9. Separate Contribution Economics From Execution Economics

These are not necessarily the same transaction.

### Contribution Economics

May include:

- originator compensation
- royalties
- attribution
- referral share
- reciprocal access
- future economic participation
- licensing consideration

### Execution Economics

May include:

- task budget
- worker payment
- escrow
- collateral
- verification fee
- arbitration fee

Model these separately.

Example:

```yaml
contribution_economics:
  originator_royalty: 1.5%

execution_economics:
  task_budget: 500 USD
  executor_payment: 450 USD
  verification_fee: 25 USD
```

---

## 10. Avoid Duplicate Escrow

If an external provider already supplies execution escrow, do not create a second escrow mechanism for the same execution obligation.

Instead, record the provider as the execution settlement mechanism.

Example:

```yaml
execution_settlement:
  mechanism: external_provider
  provider: provider_id
  provider_reference: task_12345
  receipt: ...
```

The Contribution Exchange can still independently track:

- platform fees
- royalties
- referral economics
- originator economics
- post-settlement rights

---

## 11. Provider-Specific Integration

The first external provider implementation should investigate and map whatever provider infrastructure already exists.

Research the provider's available:

- API
- SDK
- agent tools
- MCP tools
- task creation
- worker claiming
- messaging
- escrow
- collateral
- verification
- arbitration
- settlement
- identity
- webhooks
- event streams
- transaction receipts
- artifact references

Do not rebuild capabilities the provider already supplies.

The provider adapter should primarily perform two translations:

```text
ExecutionRequest
       ↓
Provider-native task/request
```

and:

```text
Provider-native result
       ↓
ExecutionReceipt
```

---

## 12. Provider Discovery

Prepare the Exchange Profile to eventually advertise supported execution rails.

Example:

```yaml
execution:
  modes:
    - internal
    - direct_agent
    - external_provider

  providers:
    - id: provider_a
      capabilities:
        task_execution: true
        escrow: true
        verification: true

settlement:
  supported:
    - stripe
    - x402
    - external_execution_provider
```

This allows an external agent to understand how the domain can execute accepted Contribution Commitments.

---

## 13. Domain Agent Policy Controls

Add execution-provider controls to the domain's delegation policy.

Suggested controls:

```yaml
external_execution:
  enabled: true

  allowed_providers:
    - provider_a

  autonomous_task_creation: true

  autonomous_escrow_funding: false

  max_autonomous_budget: 250

  human_approval_above: 250

  allowed_authority:
    inspect: true
    test: true
    modify: false
    deploy: false
```

The human role remains governance and escalation.

Do not turn this into another operational marketplace dashboard.

---

## 14. Authorization Rules

External execution may never expand authority.

If the Contribution Commitment authorizes:

```yaml
authorization:
  inspect: true
  test: true
  modify: false
  deploy: false
```

the external execution provider must receive no more authority than:

```yaml
inspect: true
test: true
modify: false
deploy: false
```

Provider capabilities do not create authorization.

The rule remains:

```text
Provider can perform X
        ≠
Provider is authorized to perform X
```

---

## 15. Failure Handling

### Provider unavailable

Keep the Contribution Commitment valid.

Execution becomes pending.

Allow rerouting if policy permits.

### Provider rejects the task

Do not invalidate the Contribution Commitment.

Return execution to pending or select another provider.

### Worker fails

Record the failed execution attempt.

Preserve:

- executor identity
- execution reference
- failure evidence
- artifacts
- timestamps
- lineage

Allow rerouting if authorized.

### External dispute

Import external dispute evidence.

Do not automatically overwrite the Contribution Exchange dispute state.

The Contribution Exchange decides whether the external dispute affects the governing relationship.

### Provider disappears

The Contribution Commitment must remain independently understandable.

No critical rights, ownership, authorization, vesting, or lineage information should exist only inside the external provider.

---

## 16. Security Rules

The provider integration must use:

- least disclosure
- least privilege
- scoped credentials
- short-lived credentials where possible
- explicit authorization
- auditable provider calls
- replay protection where supported
- artifact hashing
- execution receipt verification

Never infer permission from the existence of a Contribution Proposal.

Never infer production access from task acceptance.

Never transmit credentials unless explicitly authorized.

---

## 17. Provenance

Execution should extend Contribution Lineage rather than replace it.

Example:

```text
Contribution Observation
        ↓
Contribution Proposal
        ↓
Contribution Commitment
        ↓
Execution Request
        ↓
External Execution Reference
        ↓
Artifact
        ↓
Verification
        ↓
Execution Receipt
        ↓
Settlement
```

Every execution artifact should preserve references to:

```text
contribution_id
commitment_hash
execution_id
provider_reference
artifact_hash
originator
executor
verifier
```

---

## 18. First End-to-End Test

Use a harmless, easily verifiable task.

Example:

```text
Agent discovers documentation defect
        ↓
Agent submits Contribution Proposal
        ↓
Domain Agent evaluates it
        ↓
Negotiation
        ↓
Contribution Commitment accepted
        ↓
Principal grants limited authorization
        ↓
Execution Router selects external provider
        ↓
Provider creates task
        ↓
External worker completes patch
        ↓
Provider verification completes
        ↓
Artifact hash returned
        ↓
Contribution Exchange verifies result
        ↓
Execution economics settle
        ↓
Contribution economics settle
        ↓
Rights vest
        ↓
Lineage preserved
```

Verify:

- originator remains recorded
- executor is separately recorded
- authorization does not expand
- provider state maps correctly
- artifact hash returns
- verification evidence returns
- execution settlement is captured
- Contribution settlement remains independent
- rights vest only under Contribution Commitment rules
- lineage remains intact

---

## Acceptance Criteria

The implementation is complete when:

- [ ] Contribution Exchange has a generic Execution Provider interface.
- [ ] External providers do not appear in canonical Contribution Commitment terminology.
- [ ] Execution Request exists as a least-disclosure outbound object.
- [ ] Execution Receipt exists as a normalized inbound result.
- [ ] Contribution and execution state machines remain separate.
- [ ] Provider capability discovery exists.
- [ ] Execution routing supports multiple provider types.
- [ ] External execution cannot expand authorization.
- [ ] Originator and executor can be separate actors.
- [ ] Contribution economics and execution economics remain separately represented.
- [ ] Existing provider escrow can be reused without duplicating escrow.
- [ ] External verification does not automatically determine Contribution verification.
- [ ] External settlement does not automatically determine rights vesting.
- [ ] Provider failure does not destroy the Contribution Commitment.
- [ ] Provenance links external execution back to the originating Contribution.
- [ ] Domain policy controls which external execution actions may happen autonomously.
- [ ] A complete test exchange succeeds end to end.

---

## Non-Goals

Do not:

- build another task marketplace
- rebuild external escrow infrastructure
- rebuild worker discovery
- rebuild arbitration if a provider already supplies it
- redesign the Contribution Commitment around a provider
- introduce vendor terminology into the canonical protocol
- hard-code a single external execution rail
- duplicate execution state inside the Contribution state machine
- let provider settlement determine ownership or rights
- expose complete private Commitments unnecessarily
- turn the human interface back into routine exchange operation

---

## Strategic Boundary

The Contribution Exchange owns:

```text
DISCOVERY
→ ECONOMIC RELATIONSHIP
→ COMMITMENT
→ RIGHTS
→ AUTHORITY
→ VESTING
→ LINEAGE
```

Execution providers own:

```text
EXECUTION
→ WORKER COORDINATION
→ EXECUTION ESCROW
→ EXECUTION VERIFICATION
→ EXECUTION SETTLEMENT
```

The integration point is:

```text
Contribution Commitment
        ↓
Execution Request
        ↓
External Execution Provider
        ↓
Execution Receipt
        ↓
Contribution Commitment
```

That boundary must remain intact regardless of which external execution provider is integrated first.
