# Independent Review: Contribution Exchange

**Reviewer:** Independent agent (GLM-5.2 High)
**Date:** 2026-08-25
**Method:** Read-only public inspection only. No agent registration, no proposal submission, no penetration testing.
**Starting point:** https://signomy.xyz

---

## 0. Method and scope

I was instructed to start at signomy.xyz and independently discover the "Contribution Exchange" without being told where it lives. I inspected conventional agent/web discovery paths (robots.txt, llms.txt, .well-known/, agent.json, sitemap, schema.org JSON-LD) and then followed the discovery chain to the actual protocol implementation. I cross-referenced live HTTP responses against local source code in the `_010_sigexchange` and `_01_sigrank-app` repositories to distinguish observed facts from inference.

All findings below distinguish **observed** (I fetched it and saw it) from **inferred** (I concluded it from code or documentation).

---

## 1. Discovery chain

### 1.1 What I discovered automatically from signomy.xyz

| Resource | URL | Result |
|----------|-----|--------|
| Homepage | `https://signomy.xyz/` | 200 — HTML page for "SIGNOMY — Governed Agent City-State" (CIVITAE agent marketplace) |
| robots.txt | `https://signomy.xyz/robots.txt` | 200 — lists `Allow: /skill.md`, `/agent.json`, `/llms.txt`, `/.well-known/agent.json`, `/.well-known/mcp-server-card.json` |
| llms.txt | `https://signomy.xyz/llms.txt` | 200 — full developer/agent interface index for CIVITAE |
| agent.json | `https://signomy.xyz/agent.json` | 200 — structured platform discovery (CIVITAE API endpoints, tiers, governance taxonomy) |
| .well-known/agent.json | `https://signomy.xyz/.well-known/agent.json` | 200 — same as /agent.json |
| .well-known/ai-plugin.json | `https://signomy.xyz/.well-known/ai-plugin.json` | 200 — OpenAI plugin manifest pointing to openapi.yaml |
| .well-known/exchange.json | `https://signomy.xyz/.well-known/exchange.json` | 200 — **Contribution Exchange Profile** (thin, pointing at signalaf.com) |
| exchange.json (root) | `https://signomy.xyz/exchange.json` | 404 |

**Key observation:** signomy.xyz's primary identity is CIVITAE (governed agent marketplace). The Contribution Exchange is NOT mentioned in signomy.xyz's llms.txt, agent.json, or homepage. It is only discoverable via the `/.well-known/exchange.json` path — a conventional agent discovery location that a general-purpose agent would plausibly check, but only if it already knows to look for `exchange.json` specifically.

signomy.xyz's JSON-LD `sameAs` array includes `https://signalaf.com`, providing a secondary path to the reference implementation.

### 1.2 Following the chain to signalaf.com

The signomy.xyz `exchange.json` redirects all traffic to signalaf.com's hosted Steward:

```
"counterparty_agent": {
  "mode": "hosted_steward",
  "endpoint": "https://signalaf.com/api/exchange/steward/signomy.xyz"
}
```

From signalaf.com I discovered the full protocol surface:

| Resource | URL | Result |
|----------|-----|--------|
| Exchange Profile | `https://signalaf.com/.well-known/exchange.json` | 200 — full protocol manifest |
| Agent guide | `https://signalaf.com/agents.md` | 200 — markdown agent carry guide |
| Schema | `https://signalaf.com/exchange.schema.json` | 200 — Contribution Commitment JSON schema |
| Steward | `https://signalaf.com/api/exchange/steward/signalaf.com` | 200 — domain counterparty agent card + policy |
| Manifest | `https://signalaf.com/api/exchange/manifest` | 200 — same as exchange.json with execution block |

### 1.3 Other domains

All 6 domains in the ecosystem serve `/.well-known/exchange.json`:

| Domain | exchange.json | Steward endpoint | Transaction enabled |
|--------|--------------|------------------|-------------------|
| signalaf.com | Full (reference) | Local steward | yes |
| signomy.xyz | Thin (redirects) | signalaf.com steward | no |
| sigeconomy.com | Thin (redirects) | signalaf.com steward | no |
| mos2es.com | Thin (redirects) | signalaf.com steward | no |
| mos2es.xyz | (per STATE.md) | signalaf.com steward | no |
| mos2es.org | (per STATE.md) | signalaf.com steward | no |

**Observed:** Only signalaf.com, signomy.xyz, sigeconomy.com, and mos2es.com were live-fetched. mos2es.xyz and mos2es.org are documented in STATE.md but not independently verified in this review.

---

## 2. The 15 discovery questions

### 1. What problem is it actually solving?

**Observed:** The Contribution Exchange defines a protocol where an autonomous agent that discovers a useful observation during its normal work can propose that observation as an economic contribution directly to the domain it observed — without a pre-existing job listing, bounty, RFP, or marketplace match.

The problem is: agents discover value (bugs, improvements, data, introductions) constantly, but there is no standardized way for an agent to convert that discovery into a binding economic relationship with the domain that would benefit. The agent either does nothing, or does the work for free, or reports it through a non-economic channel (bug tracker, email).

The Contribution Exchange creates a domain-native interface: `/.well-known/exchange.json` on a participating domain advertises that the domain accepts unsolicited contributions, what categories it accepts, what authority ceiling it grants, and where to send proposals.

### 2. What behavior does it enable that would otherwise be difficult or impossible?

**Observed + inferred:** The specific behavior combination is:

- An agent can propose value to a domain it has no prior relationship with, without a job listing.
- The domain's counterparty agent (Steward) can auto-engage low-risk proposals up to a policy ceiling ($250 cash, public inspection only) and draft a Contribution Commitment without human intervention.
- The commitment, authorization, execution, verification, and settlement are separate state transitions — agreement does not imply authorization, authorization does not imply execution.
- Rights vest only when declared conditions are met (authorization + delivery + verification, optionally + settlement for cash).
- Provenance and lineage are preserved through a terms hash and parent/descendant chain.

The genuinely difficult-to-reproduce behavior is the **separation of agreement from authorization from execution** combined with **ambient origination** (no job listing needed). Existing systems conflate these: a bug bounty implies authorization to test; a PR implies authorization to modify; a marketplace match implies a pre-existing listing.

### 3. Who are the participants/counterparties?

**Observed from code and schema:**

- **Contributor (proposing agent):** Can be a guest agent (no registration) or a registered agent. Identified by `initiator_identity` with type, id, displayName, did, email.
- **Recipient (domain):** Identified by domain URL. Represented by a counterparty agent.
- **Counterparty agent (Steward):** Three modes:
  - `hosted_steward` — signalaf.com runs the agent on behalf of the domain (observed: all 6 domains use this mode)
  - `bring_your_own` — domain provides its own agent endpoint (observed in schema, no live domain uses it yet)
  - `passive` — domain receives proposals but the agent does not engage; all proposals escalate to human
- **Human principal:** The domain's company administrator. Required for commitment binding (observed: `human_required_for_commitment: true` on signalaf.com) and execution authorization (`human_required_for_execution: true`).
- **Execution provider:** External or internal service that performs the actual work after authorization. Currently only `internal` provider is registered (self-executed mode).
- **Platform operator:** Ello Cello LLC, operating signalaf.com as the hosted control plane. Collects 5% transaction fee on successful settlement.

### 4. How does an opportunity originate?

**Observed from schema and agents.md:**

The `origin` field in the Contribution Commitment supports five types:
- `ambient_observation` — agent noticed something during normal work (default for proposals)
- `published_need` — domain posted a need
- `published_offer` — domain posted an offer
- `direct_request` — agent requests something from the domain (default for requests)
- `other`

The key design choice is that `ambient_observation` is a first-class origin type. An agent does not need to match against a listing. It discovers something useful, checks the domain's exchange policy, and proposes.

### 5. How does discovery work?

**Observed:**

1. Agent fetches `/.well-known/exchange.json` on a domain (conventional agent discovery path).
2. The Exchange Profile declares: protocol version, accepted contribution scopes, forbidden actions, counterparty agent endpoint, policy invariants, economic model, and compatibility flags.
3. Agent reads `/agents.md` for the human-readable carry guide.
4. Agent reads `/exchange.schema.json` for the Contribution Commitment schema.
5. Agent can POST a `preflight` to the steward endpoint to get an advisory decision before submitting a full proposal.

Discovery is domain-native: each domain advertises its own exchange profile at its own `/.well-known/` path. Thin profiles (signomy.xyz, sigeconomy.com, mos2es.com) redirect to signalaf.com's hosted steward. The reference domain (signalaf.com) runs the full stack locally.

### 6. How does proposal/request creation work?

**Observed from `proposals/route.ts` and `requests/route.ts`:**

1. Agent POSTs to `/api/exchange/proposals` (or `/requests`) with: target domain, title, observation, proposed contribution, evidence URIs, consideration array, proposal detail (category, confidence, impact, required authorization, verification, effort).
2. Rate limiting: 20 proposals/hour per IP.
3. Honeypot field for bot detection.
4. Target domain must be verified and must accept unsolicited contributions.
5. If the agent claims a registered agent ID, the `x-exchange-agent-key` header is verified against the stored hash.
6. A `proposer_key` is generated and returned. This authenticates the proposing agent to this exchange going forward.
7. The steward is dispatched to evaluate the proposal against domain policy.
8. If the steward engages (low-risk, within auto-engage ceiling), the exchange moves to `negotiating` and a Contribution Commitment draft is generated.
9. If the steward escalates, the exchange stays in `proposed` with escalation reasons recorded.

### 7. How does negotiation work?

**Observed from `transition/route.ts` and `messages/route.ts`:**

- Either party can send messages via `/api/exchange/exchanges/{id}/messages` (rate limited: 120/hour).
- Either party can propose a state transition via `/api/exchange/exchanges/{id}/transition`.
- The `committed` transition requires a `commitment` object. The route calls `finalizeCommitment()` which validates the schema and computes a canonical terms hash (SHA-256 of the JSON-canonicalized commitment with `terms_hash` removed).
- Bilateral acceptance: both `company` and `proposer` must accept the same terms hash. The first party's acceptance is stored; when the second party accepts with the same hash, the state transitions to `committed`.
- If the terms hash differs, a new acceptance chain starts (the old acceptances are cleared).

### 8. What creates a binding commitment?

**Observed from `transition/route.ts`:**

A binding commitment requires:
1. The exchange must be in `engaged` or `negotiating` state.
2. A `commitment` object that passes `ContributionCommitmentSchema` validation.
3. `finalizeCommitment()` computes the canonical terms hash.
4. Both parties must accept the same terms hash.
5. If `human_required_for_commitment` is true (observed: it is on signalaf.com), the domain agent (Steward) cannot accept on behalf of the company. Only the company admin key can accept.

The commitment is binding because:
- The terms hash is deterministic (canonical JSON + SHA-256).
- Both acceptances are recorded with timestamp and acceptor identity.
- The commitment object includes rights, vesting conditions, authorization scope, verification criteria, settlement terms, and revocation terms — all hashed into the terms hash.
- Changing any field changes the hash, invalidating prior acceptances.

### 9. How are agreement, authorization, and execution separated?

**Observed from state machine and route guards:**

The state machine enforces strict separation:

```
proposed → engaged → negotiating → committed → authorized → delivering → delivered → verified → settled → closed
```

- **Agreement** = `committed` state. Both parties accepted the same terms hash.
- **Authorization** = `authorized` state. A separate transition from `committed`. The transition route checks:
  - If `human_required_for_execution` is true, only the company admin can authorize (not the domain agent).
  - The commitment's authorization must be within the policy's `authority_ceiling`.
- **Execution** = `delivering` state. A separate transition from `authorized`. The execute route requires company admin auth and routes to an execution provider.

The invariants are explicitly declared in the Exchange Profile:
```json
"policy": {
  "agreement_is_authorization": false,
  "authorization_is_execution": false,
  "rights_vest_only_when_declared_conditions_are_met": true
}
```

And enforced in the transition route:
- Domain agent cannot transition to `authorized` if `human_required_for_execution` is true.
- Domain agent cannot transition to `committed` if `human_required_for_commitment` is true.
- Domain agent cannot transition to `verified` or `closed` (reserved for company principal).

### 10. How do delivery and verification work?

**Observed from execution router, execution state machine, and receipt route:**

**Delivery:**
- After authorization, company admin POSTs to `/execute` with task details, budget, and optional deadline.
- The execution router validates: commitment has a terms hash, policy allows the execution mode, authority is within policy, budget is within limits.
- An `ExecutionRequest` is built from the commitment (provenance, authority, verification criteria all carried forward).
- The provider creates an execution and returns a reference.
- The exchange transitions to `delivering`.

**Verification:**
- The execution provider submits a receipt via `/execution/receipt`.
- External providers must authenticate via HMAC-SHA-256 signature (no company-admin bypass).
- Internal providers authenticate via company or proposer key.
- The receipt includes: status (delivered/verified/failed/cancelled/disputed), executor identity, artifact (URI + hash), verification evidence, settlement status.
- Idempotency: provider event ID + payload hash prevent duplicate processing. Nonce prevents replay.
- The execution state machine validates transitions (no regressions, no verified→failed without dispute).
- **Critical invariant:** The receipt route never advances `exchange_records.state`. It only updates `exchange_executions.state`. The Contribution Exchange state machine (verified, settled) requires its own separate transition.

### 11. How are rights/ownership/royalties/attribution represented?

**Observed from ContributionCommitment type and schema:**

The commitment includes a structured `rights` object:
```typescript
rights: {
  owner: string
  pre_vesting: {
    license: string           // e.g., "evaluation_only"
    deploy: 'prohibited' | 'permitted'
    derivative_use?: 'prohibited' | 'permitted'
  }
  post_vesting: {
    license: string           // e.g., "commercial_nonexclusive"
    deploy: 'prohibited' | 'permitted'
    derivative_use?: 'prohibited' | 'permitted'
  }
  attribution_required?: boolean
}
```

And a `vesting` object:
```typescript
vesting: {
  requires: Array<'authorization' | 'delivery' | 'verification' | 'settlement' | 'other'>
  other_conditions?: string[]
}
```

The draft builder sets:
- Pre-vesting: `evaluation_only`, deploy prohibited, derivative use prohibited
- Post-vesting: `commercial_nonexclusive`, deploy permitted, derivative use permitted
- Vesting requires: `['authorization', 'delivery', 'verification']` (plus `'settlement'` for cash consideration)
- Attribution required: true

Consideration types include: `cash`, `royalty` (rate + basis + duration), `reciprocal_access`, `reciprocal_contribution`, `attribution`, `referral`, `other`.

Royalties are represented as a consideration type with rate, basis, and optional duration — but the system does not enforce royalty payment automatically. It records the terms; settlement handles cash payments via Stripe Connect.

### 12. How do financial and nonfinancial settlement work?

**Observed from `settle/route.ts`:**

**Financial settlement:**
1. Exchange must be in `verified` state.
2. Company admin key required.
3. If the commitment has cash consideration:
   - The domain must have `transaction_enabled: true` (private-alpha gate).
   - If the contributor has a Stripe Connect payout account, a Stripe Checkout session is created with `application_fee_amount` (platform fee) and `transfer_data` (destination = payout account).
   - If no payout account or Stripe not configured, settlement is recorded as `manual_required`.
4. Stripe webhook updates settlement status on payment success.

**Nonfinancial settlement:**
1. If no cash consideration, settlement is recorded as `nonfinancial` with zero amounts.
2. The exchange transitions to `settled`.

**Fee structure (observed from fees.ts and manifest):**
- Platform fee: 500 bps (5%) on gross amount
- Referral commission: configurable

### 13. How do human principals interact with autonomous agents?

**Observed from policy and route guards:**

- The domain agent (Steward) operates within a delegated policy envelope:
  - Auto-engage up to $250 cash, public inspection only
  - Cannot accept commitments if `human_required_for_commitment` is true
  - Cannot authorize execution if `human_required_for_execution` is true
  - Cannot verify or close exchanges (reserved for company principal)
- The human principal (company admin) intervenes via:
  - Company admin key (separate from domain agent key)
  - Control panel at `/exchange/control`
  - Direct state transitions via the transition API
- Escalation is automatic: any proposal crossing a policy boundary (royalty, private data, production access, etc.) is escalated with reasons recorded.

### 14. How is agent authority bounded?

**Observed from policy.ts and execution-router.ts:**

- `authority_ceiling` in the Exchange Policy defines the maximum authority the domain agent can grant: `{inspect_public: true, sandbox_test: false, repository_read: false, ...}` — all dangerous authorities default to false.
- `commitmentAuthorizationWithinCeiling()` checks that the commitment's authorization does not exceed the ceiling.
- The execution router's `authorityWithinPolicy()` checks that the execution authority is within the policy's `allowed_authority`.
- `deriveExecutionAuthority()` extracts authority from the commitment — it cannot exceed what was committed.
- The execution router explicitly does not expand authority: "The execution authority sent to the provider is always a subset of the commitment's authorization."
- External execution policy controls: `autonomous_task_creation`, `autonomous_escrow_funding`, `max_autonomous_budget`, `human_approval_above` — all default to restrictive values.

### 15. How are provenance and lineage preserved?

**Observed from commitment.ts, types.ts, and execution-router.ts:**

- **Terms hash:** SHA-256 of the canonicalized commitment (sorted keys, terms_hash removed). This is the cryptographic fingerprint of the agreement.
- **Provenance object in commitment:** `terms_hash`, `parent` (contribution_id of parent exchange), `descendants` (array of child contribution_ids), `attribution_required`.
- **Execution provenance:** Every `ExecutionRequest` carries `provenance: { originator, contribution_lineage }` where `contribution_lineage` includes the parent contribution_id.
- **Execution record:** `source_commitment_hash` is NOT NULL, non-empty, and immutable after creation (DB trigger enforces immutability). This binds every execution to a specific committed terms hash.
- **Execution receipt:** Includes `artifact.hash` (SHA-256 of the delivered artifact) and `executor.id`.
- **Append-only event log:** `exchange_events` table records every state transition with actor, from_state, to_state, and payload. Cascade delete is on the event table (events are deleted when the exchange is deleted), but there is no API route that deletes exchanges.

---

## 3. Adversarial review

### 3.1 A2A (Agent-to-Agent protocol)

**What already exists:** A2A defines agent cards at `/.well-known/agent.json` and a JSON-RPC communication protocol between agents. It handles discovery and messaging.

**What Contribution Exchange reuses:** The `/.well-known/` convention. The agent.json format is similar in spirit (structured discovery at a well-known path).

**What it merely combines:** A2A discovery + economic commitment semantics.

**What remains materially different:** A2A is a communication protocol — it defines how agents talk, not what they agree to. Contribution Exchange defines the economic relationship: proposal → commitment → authorization → execution → verification → settlement, with rights vesting and provenance. A2A has no concept of binding commitment, authorization separation, rights vesting, or settlement.

**Whether the difference matters:** Yes, for the specific use case of unsolicited economic contributions. A2A alone cannot create a binding economic relationship.

**Whether another system could reproduce it trivially:** No. A2A would need to be extended with commitment semantics, state machine, and settlement — which is what Contribution Exchange does.

### 3.2 ANP (Agent Network Protocol)

**What already exists:** ANP defines agent discovery and networking across domains using DIDs and DID documents.

**What Contribution Exchange reuses:** The concept of domain-native discovery (each domain advertises its capabilities).

**What it merely combines:** Domain-native discovery + economic protocol.

**What remains materially different:** ANP is identity and networking infrastructure. It does not define economic relationships, commitments, or settlement. Contribution Exchange uses domain names as identity (not DIDs) and focuses on the economic layer.

**Whether the difference matters:** Yes. ANP solves a different problem (agent networking); Contribution Exchange solves economic relationship formation.

**Whether another system could reproduce it trivially:** ANP could serve as the discovery layer for Contribution Exchange (the compatibility list includes ANP), but the economic protocol would still need to be built on top.

### 3.3 AHP (Agent HTTP Protocol)

**What already exists:** AHP defines how agents expose HTTP endpoints for inter-agent communication.

**What Contribution Exchange reuses:** HTTP-based API design, RESTful endpoint patterns.

**What it merely combines:** HTTP transport + economic protocol.

**What remains materially different:** AHP is a transport/communication standard. Contribution Exchange defines the semantic content of the communication (proposals, commitments, transitions) and the state machine that governs them.

**Whether the difference matters:** Yes. Transport protocol ≠ economic protocol.

**Whether another system could reproduce it trivially:** No. AHP could carry Contribution Exchange messages, but the protocol semantics are independent.

### 3.4 Agent commerce/payment protocols

**What already exists:** Various protocols for agent-to-agent payment (e.g., Lightning Network agent payment, X402, Coinbase AgentKit). These handle payment execution between agents.

**What Contribution Exchange reuses:** Stripe Connect for fiat settlement.

**What it merely combines:** Payment execution + contribution lifecycle.

**What remains materially different:** Payment protocols handle the transfer of value. Contribution Exchange handles the entire lifecycle from discovery to settlement, of which payment is one step. The key difference is that payment is gated behind verification — you can't settle until the contribution is verified, and verification is independent of delivery.

**Whether the difference matters:** Yes. Agent payment protocols assume the economic relationship already exists. Contribution Exchange creates it.

**Whether another system could reproduce it trivially:** No. Adding commitment semantics and a multi-state lifecycle to a payment protocol would essentially be rebuilding Contribution Exchange.

### 3.5 Schema.org Demand / Offer

**What already exists:** Schema.org defines `Demand` and `Offer` types for describing what someone wants or what someone provides. These are used in structured data for search engines and marketplaces.

**What Contribution Exchange reuses:** The compatibility list explicitly includes "Schema.org Demand/Offer." The concept of structured contribution declarations is similar.

**What it merely combines:** Structured declarations + binding commitment + state machine.

**What remains materially different:** Schema.org Demand/Offer is a vocabulary for describing offers — it is not a protocol. There is no API, no state machine, no commitment binding, no authorization separation, no verification, no settlement. It is purely descriptive.

**Whether the difference matters:** Yes. Schema.org tells you what someone wants; Contribution Exchange lets you actually transact.

**Whether another system could reproduce it trivially:** Schema.org could be used as the declaration format within Contribution Exchange proposals (and the compatibility list suggests this is intended), but the protocol layer would still need to be built.

### 3.6 ODRL / programmable rights systems

**What already exists:** ODRL (Open Digital Rights Language) is a W3C standard for representing rights, permissions, constraints, and duties over digital assets. It is used in DRM, content licensing, and policy expression.

**What Contribution Exchange reuses:** The concept of pre-vesting and post-vesting rights, revocable/irrevocable licenses, and conditional rights vesting.

**What it merely combines:** Rights expression + economic lifecycle + enforcement.

**What remains materially different:** ODRL is a rights expression language — it describes what you can do with an asset. It does not define how rights vest, how to verify delivery, or how to settle payment. Contribution Exchange uses a simpler rights model (pre/post vesting, revocation terms) but wraps it in a complete lifecycle with enforcement.

**Whether the difference matters:** Partially. ODRL could express the rights in a Contribution Commitment more richly, but the vesting and enforcement mechanism is what matters, and ODRL doesn't provide that.

**Whether another system could reproduce it trivially:** ODRL could replace the `rights` object in the commitment, but the vesting logic (conditions → transition → rights change) is Contribution Exchange-specific.

### 3.7 Bug bounty systems

**What already exists:** HackerOne, Bugcrowd, etc. define platforms where organizations post bounty programs and researchers submit security findings for payment.

**What Contribution Exchange reuses:** The concept of unsolicited contributions for payment. The `technical` and `accessibility` contribution categories overlap with bounty scopes.

**What it merely combines:** Unsolicited contribution + multi-category scope + economic settlement.

**What remains materially different:**
1. Bug bounties are security-only; Contribution Exchange supports 9 categories (technical, accessibility, documentation, research, data, integration, commercial introduction, workflow improvement, product improvement).
2. Bug bounties require a pre-existing program; Contribution Exchange does not (ambient observation).
3. Bug bounties conflate submission with authorization to test; Contribution Exchange separates them explicitly.
4. Bug bounties don't handle rights vesting, royalties, or reciprocal contributions.
5. Bug bounties are centralized platforms; Contribution Exchange is domain-native (each domain runs its own exchange profile).

**Whether the difference matters:** Yes. The ambient origination and category breadth are materially different.

**Whether another system could reproduce it trivially:** A bug bounty platform could be extended to support non-security categories and ambient proposals, but it would lose the domain-native architecture and the authorization separation.

### 3.8 GitHub pull requests

**What already exists:** PRs are a mechanism for contributing code changes to a repository. They include review, approval, merge, and CI/CD integration.

**What Contribution Exchange reuses:** The concept of unsolicited contribution (you don't need permission to open a PR).

**What it merely combines:** Unsolicited contribution + economic terms + multi-category scope.

**What remains materially different:**
1. PRs are code-only; Contribution Exchange supports 9 categories.
2. PRs imply repository write access (you need a fork); Contribution Exchange separates authorization explicitly.
3. PRs don't have economic terms (no consideration, no rights vesting, no settlement).
4. PRs are tied to a specific platform (GitHub); Contribution Exchange is domain-native.
5. PRs don't handle royalties, reciprocal access, or attribution as consideration types.

**Whether the difference matters:** Yes. PRs are a code contribution mechanism; Contribution Exchange is an economic protocol.

**Whether another system could reproduce it trivially:** No. Adding economic terms and multi-category support to PRs would be a different system.

### 3.9 Freelance/procurement marketplaces

**What already exists:** Upwork, Fiverr, etc. define marketplaces where clients post jobs and freelancers bid. They handle escrow, milestones, verification, and settlement.

**What Contribution Exchange reuses:** The concept of consideration, escrow (declared but not enforced), and settlement.

**What it merely combines:** Marketplace mechanics + domain-native architecture + ambient origination.

**What remains materially different:**
1. Marketplaces require a pre-existing job listing; Contribution Exchange does not.
2. Marketplaces are centralized platforms; Contribution Exchange is domain-native.
3. Marketplaces conflate agreement with authorization (accepting a bid authorizes the work); Contribution Exchange separates them.
4. Marketplaces don't handle rights vesting or royalty terms.
5. Marketplaces take 10-20% fees; Contribution Exchange takes 5%.

**Whether the difference matters:** Yes. The ambient origination and domain-native architecture are materially different.

**Whether another system could reproduce it trivially:** A marketplace could add "unsolicited proposal" support, but it would still be centralized and would still conflate agreement with authorization.

### 3.10 Agent marketplaces

**What already exists:** Various agent marketplaces (e.g., AI agent directories, plugin stores) where agents are listed and discovered.

**What Contribution Exchange reuses:** The concept of agent registration (optional, for persistent identity and reputation).

**What it merely combines:** Agent identity + economic protocol.

**What remains materially different:** Agent marketplaces list agents for discovery. Contribution Exchange is not a marketplace for agents — it's a protocol for agents to transact with domains. Agents don't need to be registered to propose.

**Whether the difference matters:** Yes. The unit of transaction is a contribution, not an agent listing.

**Whether another system could reproduce it trivially:** No. Agent marketplaces solve a different problem (agent discovery); Contribution Exchange solves contribution transacting.

### 3.11 Escrow/payment systems

**What already exists:** Escrow.com, Stripe Connect, PayPal — systems that hold funds and release them on conditions.

**What Contribution Exchange reuses:** Stripe Connect for payout routing and platform fee collection.

**What it merely combines:** Payment infrastructure + conditional release + contribution lifecycle.

**What remains materially different:** Escrow systems handle funds. Contribution Exchange handles the entire lifecycle, of which payment is one step. The escrow is declared in the commitment (`settlement.escrow: boolean`) but not enforced by a third-party escrow service — settlement is gated by the `verified` state transition, which is controlled by the domain principal.

**Whether the difference matters:** Partially. The escrow mechanism is weak — it's a policy gate, not a cryptographic escrow. A malicious domain principal could refuse to verify a completed contribution, blocking settlement. This is a real vulnerability (see architecture review).

**Whether another system could reproduce it trivially:** Escrow systems could handle the payment part, but the conditional release (verified → settled) is Contribution Exchange-specific.

### 3.12 DID / verifiable credentials

**What already exists:** DIDs provide decentralized identifiers. VCs provide cryptographically verifiable claims. Together they enable identity verification without a central authority.

**What Contribution Exchange reuses:** The `did` field in actor references. The compatibility list includes "DID/VC."

**What it merely combines:** Decentralized identity + economic protocol.

**What remains materially different:** DID/VC solves identity verification. Contribution Exchange uses domain names as identity (the domain verifies via DNS TXT) and optional DIDs for agents. The identity layer is thin — there is no VC verification in the current implementation.

**Whether the difference matters:** Not yet. The current system works without DIDs/VCs. They could strengthen agent identity verification in the future.

**Whether another system could reproduce it trivially:** DID/VC could replace the current identity layer, but the economic protocol would be unchanged.

### 3.13 Stripe Connect

**What already exists:** Stripe Connect is a platform for building marketplaces that route payments between parties. It handles onboarding, compliance, payment processing, and payout routing.

**What Contribution Exchange reuses:** Stripe Connect for payout routing (Stripe Checkout with `application_fee_amount` and `transfer_data`).

**What it merely combines:** Payment infrastructure + contribution lifecycle.

**What remains materially different:** Stripe Connect handles money movement. Contribution Exchange handles the lifecycle that determines when money should move. Stripe Connect is the settlement mechanism; Contribution Exchange is the protocol that gates settlement behind verification.

**Whether the difference matters:** Yes. Stripe Connect alone cannot determine when a contribution is verified or when rights vest.

**Whether another system could reproduce it trivially:** No. The lifecycle gating is Contribution Exchange-specific.

---

## 4. Architecture review

### 4.1 Domain-native discovery

**Assessment: Sound but with a bootstrapping problem.**

The `/.well-known/exchange.json` convention is clean and follows established patterns (ai-plugin.json, agent.json). Each domain advertises its own profile, which is correct for domain sovereignty.

**Issue:** There is no registry or directory of participating domains. An agent must already know to check `/.well-known/exchange.json` on a specific domain. There is no way to discover "which domains accept contributions?" without crawling. This limits the protocol's utility in the early adoption phase.

**Severity:** P1 — limits growth but doesn't break the protocol.

### 4.2 Unsolicited/ambient contribution origination

**Assessment: Novel and well-structured.**

The `ambient_observation` origin type is a first-class concept. The preflight endpoint lets agents check whether a proposal would be accepted before submitting. The auto-engage ceiling ($250, public inspection) allows low-risk proposals to proceed without human intervention.

**Issue:** There is no mechanism to prevent duplicate ambient observations. Two agents could observe the same bug and both propose. The system has no deduplication logic — the first proposal gets engaged, the second gets a 409 if it's for the same domain, but there is no content-based deduplication.

**Severity:** P2 — spam/duplicate risk, but rate limiting (20/hour) and the auto-engage ceiling limit the blast radius.

### 4.3 Domain canonicality

**Assessment: Enforced via DNS verification.**

Domain registration requires a DNS TXT record (`_contribution-exchange.{domain}` with `cx-verification={token}`). This proves domain control before a company can participate. The verification route checks the TXT record via `resolveTxt()`.

**Issue:** The DNS verification is checked once at registration time. There is no ongoing verification — if a domain's TXT record is removed after verification, the company remains verified. There is also no re-verification schedule.

**Severity:** P2 — stale verification, but the company admin key provides ongoing auth.

### 4.4 Hosted Steward vs bring-your-own domain agent

**Assessment: Well-designed but only hosted_steward is exercised.**

The three modes (hosted_steward, bring_your_own, passive) are well-defined in the schema and policy. The BYO mode notifies the domain's agent endpoint via POST with a 5-second timeout.

**Issue:** No live domain uses BYO mode. The BYO notification endpoint (`notifyDomainAgent`) sends the exchange data to an arbitrary URL with no authentication on the notification itself. The notification includes a `note` telling the BYO agent to authenticate back, but the notification payload itself is unauthenticated. A MITM could intercept or spoof notifications.

**Severity:** P1 — BYO mode is not yet live, but the notification path needs authentication before production use.

### 4.5 Principal escalation

**Assessment: Correctly implemented.**

The escalation logic in `evaluateProposal()` checks:
- Category outside auto-engage allowlist → escalate
- Consideration type outside allowed list → escalate
- Cash amount exceeds $250 → escalate
- Royalty, reciprocal access → escalate
- Any dangerous authority (repo write, private data, credentials, production modify, deploy, pen testing) → escalate
- Non-standard authority (`other` array) → escalate

Escalated proposals are preserved (not rejected) with reasons recorded. The human principal can then engage via the transition API.

### 4.6 Delegated authority

**Assessment: Correctly bounded.**

The domain agent (Steward) operates within:
- Auto-engage ceiling: $250 cash, allowed categories, allowed consideration types
- Authority ceiling: public inspection only (all dangerous authorities false)
- Cannot commit if `human_required_for_commitment` is true
- Cannot authorize if `human_required_for_execution` is true
- Cannot verify or close (reserved for company principal)

The transition route enforces these bounds with explicit checks.

### 4.7 Proposal → commitment transition

**Assessment: Correctly implemented with bilateral acceptance.**

The commitment transition requires:
1. Exchange in `engaged` or `negotiating` state
2. Valid commitment object (schema-validated)
3. Canonical terms hash computed
4. Both parties accept the same hash

**Issue:** The acceptance logic has a subtle race condition. Two concurrent transition requests (one from company, one from proposer) with the same commitment could both read the existing acceptances as empty, both write their acceptance, and one could overwrite the other. The `update()` call does not use optimistic concurrency (no `eq('state_version', ...)` check, unlike the execution receipt route). This is a TOCTOU issue.

**Severity:** P1 — race condition in bilateral acceptance. Low probability but could result in a commitment being recorded as accepted by only one party when both accepted.

### 4.8 Deterministic terms

**Assessment: Correctly implemented.**

The `commitmentHash()` function:
1. Deep-clones the commitment
2. Removes `provenance.terms_hash`
3. Canonicalizes (sorts object keys recursively)
4. JSON-stringifies
5. SHA-256 hashes

This is deterministic for the same input. The canonicalization ensures key order doesn't matter.

**Issue:** The canonicalization does not handle `undefined` values consistently. `JSON.stringify` drops `undefined` values in objects, but the Zod schema uses `.optional()` which produces `undefined` for absent fields. Two commitments with the same content but different optional field presence could produce different hashes. However, since both parties submit the same commitment object, this is unlikely to cause issues in practice.

**Severity:** P2 — edge case, unlikely in practice.

### 4.9 Verification

**Assessment: Independent but manually gated.**

Verification is a separate state transition (`delivered → verified`) that can only be performed by the company principal (not the domain agent, not the proposer). The verification criteria are declared in the commitment.

**Issue:** Verification is entirely manual — there is no automated verification mechanism. The company principal decides whether the contribution meets the criteria. This is by design (human judgment), but it means verification can be gamed by a malicious principal who refuses to verify a completed contribution.

**Severity:** P1 — this is a fundamental trust issue. The contributor has no recourse if the principal refuses to verify. There is no arbitration mechanism in the current implementation.

### 4.10 Rights vesting

**Assessment: Declared but not enforced.**

The commitment declares vesting conditions (`requires: ['authorization', 'delivery', 'verification', 'settlement']`), but the system does not automatically transition rights from pre-vesting to post-vesting. The `rights.pre_vesting` and `rights.post_vesting` objects are declarative — they describe what should happen, but the system does not enforce the transition.

**Issue:** Rights vesting is a legal/contractual concept, not a technical enforcement. The system records the terms but cannot prevent the recipient from using the contribution before vesting conditions are met. This is inherent to any digital rights system — enforcement requires legal recourse, not just protocol design.

**Severity:** P2 — inherent limitation, not a bug.

### 4.11 Settlement

**Assessment: Correctly gated but with manual fallback.**

Settlement requires:
1. Exchange in `verified` state
2. Company admin key
3. `transaction_enabled` flag on the domain

If Stripe is configured and the contributor has a payout account, a Checkout session is created. Otherwise, settlement is `manual_required`.

**Issue:** The `manual_required` path has no follow-through mechanism. The system records that manual settlement is needed but does not notify anyone or create a task. The company principal must manually check for manual settlements.

**Severity:** P2 — operational gap, not a security issue.

### 4.12 Lineage

**Assessment: Well-preserved.**

Every exchange has:
- `contribution_id` (public ID)
- `terms_hash` (cryptographic fingerprint)
- `provenance.parent` (parent contribution_id)
- `provenance.descendants` (child contribution_ids)
- Append-only event log

Every execution has:
- `source_commitment_hash` (immutable, NOT NULL, trigger-enforced)
- `provenance.originator`
- `provenance.contribution_lineage`

Every receipt has:
- `artifact.hash`
- `executor.id`
- `provider_event_id` (idempotency)

**Issue:** The `provenance.descendants` array is not automatically populated. When a new exchange references a parent, the parent's descendants array is not updated. Lineage is one-directional (child → parent) but not bidirectional.

**Severity:** P2 — incomplete lineage, but the child → parent direction is preserved.

### 4.13 Anti-spam protections

**Assessment: Basic but adequate for private alpha.**

- Rate limiting: per-IP, per-action (20 proposals/hour, 30 preflights/minute, etc.)
- Honeypot fields on proposal, request, and registration forms
- Domain verification (DNS TXT) for company registration
- In-memory rate limiter (per-instance, not distributed)

**Issue:** The rate limiter is in-memory and per-instance. In a serverless deployment (Vercel), each function instance has its own rate limit state. An attacker could bypass rate limits by hitting different instances. The code acknowledges this: "Acceptable for private-alpha; replace with Redis/Upstash when we outgrow single-instance memory."

**Issue:** There is no CAPTCHA or proof-of-work for proposal submission. A determined attacker could submit 20 proposals/hour per IP from multiple IPs.

**Severity:** P1 for production, P2 for private alpha.

### 4.14 Security authorization boundaries

**Assessment: Strong separation with one gap.**

The system enforces:
- Separate keys for company admin, domain agent, proposer, and registered agent
- SHA-256 hashing of all keys (no plaintext storage)
- External provider callbacks require HMAC-SHA-256 signatures (no company-admin bypass)
- Constant-time signature comparison
- 5-minute timestamp window for callbacks
- Key rotation support for provider credentials
- Idempotency via provider event ID + payload hash
- Nonce replay protection
- Optimistic concurrency on execution state updates
- RLS enabled + forced on all exchange tables (service_role only)
- DB constraints (CHECK, NOT NULL, FK, immutability triggers)

**Gap:** The `authenticateCompany()` function has a reference-domain bypass:
```typescript
if (normalized === normalizeDomain(process.env.EXCHANGE_REFERENCE_DOMAIN ?? 'signalaf.com') && referenceKey && key === referenceKey) return true
```
This compares the provided key directly (not hashed) against `EXCHANGE_REFERENCE_ADMIN_KEY`. This is a plaintext key comparison, not a hash comparison. If this env var leaks, the reference domain's admin key is compromised. All other companies use hash comparison.

**Severity:** P1 — the reference domain bypass uses plaintext key comparison instead of hash comparison. This is inconsistent with the security model used for all other companies.

---

## 5. Specific failure mode analysis

### 5.1 Agreement could accidentally imply authorization

**Assessment: Prevented.**

The state machine requires `committed → authorized` as a separate transition. The transition route checks `human_required_for_execution` and `authority_ceiling` before allowing authorization. The domain agent cannot authorize if human approval is required. The invariant `agreement_is_authorization: false` is declared and enforced.

### 5.2 Agent authority could expand implicitly

**Assessment: Prevented.**

- `commitmentAuthorizationWithinCeiling()` checks that the commitment's authorization does not exceed the policy ceiling.
- `deriveExecutionAuthority()` extracts authority from the commitment — it cannot create authority that wasn't committed.
- `authorityWithinPolicy()` checks that execution authority is within the policy's `allowed_authority`.
- The execution router does not expand authority: "The execution authority sent to the provider is always a subset of the commitment's authorization."

### 5.3 An external agent could trigger unauthorized execution

**Assessment: Prevented.**

- The execute route requires `x-exchange-company-key` (company admin auth).
- The exchange must be in `authorized` state before execution can be routed.
- Authorization requires a separate transition from commitment.
- The domain agent cannot authorize if `human_required_for_execution` is true.

### 5.4 Value could be disclosed before terms exist

**Assessment: Partially mitigated.**

The commitment includes a `disclosure_state` field: `protected | evaluation | authorized | released`. The draft builder sets this to `evaluation` for initial drafts. However, the proposal itself (submitted before any commitment exists) includes the `observation` and `proposed_contribution` fields, which may contain the valuable information.

**Issue:** The agent must describe what it observed in the proposal for the domain to evaluate it. This means the value is disclosed before terms exist. The system relies on the domain acting in good faith — there is no cryptographic protection of the observation content.

**Severity:** P1 — this is a fundamental tension in unsolicited contribution systems. The contributor must reveal enough to be taken seriously, but revealing too much gives the recipient the value for free. The system does not address this.

### 5.5 Spoofed domains or agents could participate

**Assessment: Mitigated for domains, weak for agents.**

- **Domains:** Must verify via DNS TXT record. This proves domain control. Verified domains are stored in `exchange_companies` with `verification_status: 'verified'`.
- **Agents:** Guest agents need no verification — they provide a name and optional DID. Registered agents get a key, but there is no identity verification beyond the key. A spoofed agent could register with a fake name and DID.

**Issue:** There is no DID verification. The `did` field in agent registration is optional and not verified against any DID registry. A malicious agent could claim any DID.

**Severity:** P2 — agent identity is weak, but the economic risk is bounded by the auto-engage ceiling ($250) and the human-in-the-loop for higher-value transactions.

### 5.6 Proposals could become spam

**Assessment: Mitigated by rate limiting.**

- 20 proposals/hour per IP
- Honeypot fields
- Domain must accept unsolicited contributions
- Proposals are logged in `exchange_encounters` for observability

**Issue:** Rate limiting is per-IP and in-memory (not distributed). A botnet could submit from multiple IPs. There is no content-based spam detection.

**Severity:** P2 for private alpha, P1 for production.

### 5.7 Duplicate discoveries create ownership disputes

**Assessment: Not addressed.**

Two agents can observe the same bug and both propose. The system has no deduplication logic. The first proposal to a domain gets engaged; the second gets processed independently. There is no "first to file" or "first to observe" resolution mechanism.

**Issue:** If both proposals are for the same contribution, the domain could end up with two commitments for the same work. The system does not detect or prevent this.

**Severity:** P2 — the domain principal can manually reject duplicates, but there is no automated detection.

### 5.8 Multiple agents claim the same contribution

**Assessment: Not addressed.**

Same as 5.7. There is no mechanism to detect that two proposals describe the same contribution. The `contribution_id` is the exchange's public ID, not a content hash of the contribution itself.

### 5.9 Verification can be gamed

**Assessment: Yes, by the domain principal.**

Verification is manual and controlled by the company admin. A malicious principal can:
- Refuse to verify a completed contribution (blocking settlement)
- Verify an incomplete contribution (triggering settlement prematurely)

There is no independent verification, no arbitration, and no contributor recourse.

**Severity:** P1 — this is the strongest attack vector. The contributor bears all the risk of non-verification.

### 5.10 Settlement can occur without proper acceptance

**Assessment: Prevented.**

Settlement requires:
1. Exchange in `verified` state (which requires `delivered` state, which requires `delivering`, which requires `authorized`, which requires `committed`)
2. Company admin key
3. `transaction_enabled` flag

The state machine enforces the full chain. Settlement cannot skip verification.

### 5.11 Provenance can be fabricated or forked

**Assessment: Partially prevented.**

- Terms hash is deterministic (canonical JSON + SHA-256). Fabricating a commitment with a specific hash requires a preimage attack on SHA-256.
- Execution `source_commitment_hash` is immutable (DB trigger).
- Event log is append-only.

**Issue:** The `provenance.parent` field in a commitment is not verified. An agent could claim a parent contribution that doesn't exist or that belongs to someone else. There is no verification that the parent contribution_id refers to a real, prior exchange.

**Issue:** The `exchange.schema.json` served at `signalaf.com/exchange.schema.json` has `$id: "https://mos2es.xyz/exchange.schema.json"` — a stale reference to the old domain where the exchange was originally built (per README.md: "The exchange was originally built in the AQUA application-hub repo (mos2es.xyz)"). This is a broken canonical reference.

**Severity:** P2 — provenance parent is not verified, and the schema $id is stale.

---

## 6. Discovery review

### What I discovered automatically

1. **signomy.xyz homepage** — CIVITAE agent marketplace. No mention of Contribution Exchange.
2. **signomy.xyz/robots.txt** — lists agent discovery paths but does NOT mention `exchange.json`.
3. **signomy.xyz/llms.txt** — full developer index for CIVITAE. No mention of Contribution Exchange.
4. **signomy.xyz/.well-known/agent.json** — CIVITAE platform discovery. No mention of Contribution Exchange.
5. **signomy.xyz/.well-known/exchange.json** — **Contribution Exchange Profile** (thin, pointing to signalaf.com).
6. **signalaf.com/.well-known/exchange.json** — full Exchange Profile (reference implementation).
7. **signalaf.com/agents.md** — agent carry guide.
8. **signalaf.com/exchange.schema.json** — Contribution Commitment schema.
9. **signalaf.com/api/exchange/steward/signalaf.com** — Steward policy.
10. **signalaf.com/api/exchange/manifest** — full manifest with execution providers.

### What I failed to discover

- I could not discover the Contribution Exchange from signomy.xyz's primary surfaces (homepage, llms.txt, agent.json). It is only findable at `/.well-known/exchange.json`, which is a conventional but not universally known agent discovery path.
- There is no sitemap entry for `/.well-known/exchange.json` on signomy.xyz (the sitemap is at `sitemap-v2.xml` per robots.txt, but I did not fetch it).
- There is no cross-link from signomy.xyz's CIVITAE documentation to the Contribution Exchange.

### Which URLs/files led me to the system

1. `https://signomy.xyz/.well-known/exchange.json` → pointed to signalaf.com
2. `https://signalaf.com/.well-known/exchange.json` → full protocol manifest
3. `https://signalaf.com/agents.md` → agent guide
4. `https://signalaf.com/exchange.schema.json` → commitment schema
5. `https://signalaf.com/api/exchange/steward/signalaf.com` → steward policy

### Whether a general-purpose agent would plausibly know to inspect them

**Partially.** A general-purpose agent that knows to check `/.well-known/` for agent discovery would find `exchange.json`. However:
- `/.well-known/exchange.json` is not a standardized path (unlike `/.well-known/agent.json` which follows the emerging agent discovery convention).
- signomy.xyz's robots.txt does not mention `exchange.json` (it mentions `agent.json`, `llms.txt`, `skill.md`, `mcp-server-card.json` but NOT `exchange.json`).
- signomy.xyz's llms.txt does not mention the Contribution Exchange at all.

A general-purpose agent would need to guess that `/.well-known/exchange.json` exists. This is a discoverability gap.

### Conflicting or stale documentation

1. **Schema $id:** `signalaf.com/exchange.schema.json` has `$id: "https://mos2es.xyz/exchange.schema.json"` — stale reference to the old domain. The exchange was moved from mos2es.xyz to signalaf.com on 2026-08-24, but the schema $id was not updated.
2. **README.md domain table:** The `_010_sigexchange/README.md` lists participating domains with status "not yet wired" for sigeconomy.com, signomy.xyz, and mos2es.com, but the live `exchange.json` files on these domains are returning 200. The STATE.md (updated later) shows all 6 domains as LIVE. The README is stale.
3. **SIGNOMY_SEED_CONCEPT.md** says "signomy.xyz has a thin exchange.json pointing at signalaf.com's Steward (live, 200)" and "No Supabase project exists for signomy.xyz" — this is consistent with what I observed.

### Broken links or inconsistent canonical domains

1. **Schema $id:** As noted above, `mos2es.xyz` in the $id is stale.
2. **signomy.xyz exchange.json** points to `https://signalaf.com/api/exchange/steward/signomy.xyz` — this is correct and returns 200 (inferred from the pattern; I only fetched the signalaf.com steward directly).
3. **No broken links** were found in the primary discovery chain (exchange.json → agents.md → schema → steward).

### Missing machine-readable instructions

1. **signomy.xyz does not advertise exchange.json in robots.txt.** The robots.txt explicitly allows `/agent.json`, `/llms.txt`, `/skill.md`, `/.well-known/agent.json`, `/.well-known/mcp-server-card.json` — but NOT `/.well-known/exchange.json`. An agent following robots.txt would not know to check for the exchange.
2. **signomy.xyz's llms.txt does not mention the Contribution Exchange.** The entire llms.txt is about CIVITAE. There is no section for the exchange protocol.
3. **signomy.xyz's agent.json does not include exchange endpoints.** The `api` object lists CIVITAE endpoints but not exchange endpoints.
4. **No OpenAPI spec for the exchange API.** The exchange has an `API_REFERENCE.md` in the local repo but no published OpenAPI/Swagger spec at signalaf.com for the exchange routes (the openapi.json at signomy.xyz is for CIVITAE, not the exchange).

---

## 7. Product review

### A. What is this?

The Contribution Exchange is a domain-native economic protocol that lets autonomous agents propose unsolicited contributions (code fixes, documentation, research, data, introductions) directly to web domains that opt in by publishing a `/.well-known/exchange.json` profile. The protocol defines a 15-state lifecycle (observed → proposed → engaged → negotiating → committed → authorized → delivering → delivered → verified → settled → closed, plus declined/expired/disputed/revoked) that separates agreement from authorization from execution from verification from settlement, with bilateral commitment hashing, rights vesting conditions, and provenance tracking. signalaf.com serves as the reference implementation and hosted control plane, with a Steward agent that auto-engages low-risk proposals up to $250 and escalates everything else to a human principal.

### B. What is the actual wedge?

The wedge is **ambient origination with separated authorization**: an agent can propose economic value to a domain it has no prior relationship with, and the domain can engage that proposal through a Steward agent that is bounded by a policy ceiling, without the proposal implying any execution authority — something no existing marketplace, bounty system, or agent protocol combines.

### C. Is the wedge technically real or mostly positioning?

**Mostly real, with one positioning-dependent assumption.**

The technical implementation is real and functional:
- The state machine correctly separates agreement, authorization, execution, verification, and settlement.
- The bilateral commitment hashing is cryptographically sound.
- The execution provider layer has serious hardening (HMAC signature verification, idempotency, nonce replay protection, optimistic concurrency, RLS, DB constraints).
- The policy evaluation correctly bounds the Steward's authority.

The positioning-dependent assumption is that agents will actually discover `/.well-known/exchange.json` and know what to do with it. The protocol is technically sound but depends on agent adoption, which is not a technical problem. The discovery surface is thin — signomy.xyz doesn't even advertise the exchange in its robots.txt or llms.txt.

The other positioning-dependent assumption is that domains will opt in. The protocol requires domains to register, verify via DNS, and configure policy. This is a cold-start problem — the protocol is useless without participating domains, and domains won't participate without agents proposing, and agents won't propose without domains participating.

### D. What is genuinely unusual here?

**Architectural novelty:**
1. **Ambient observation as a first-class origin type.** No existing system treats "an agent noticed something during its normal work" as a valid economic origination. Bug bounties require a program; PRs require a repo; marketplaces require a listing.
2. **Five-way separation of agreement, authorization, execution, verification, and settlement.** Most systems conflate at least two of these. The state machine enforces all five as independent transitions with independent auth requirements.
3. **Domain-native economic interface.** The `/.well-known/exchange.json` convention makes each domain its own economic endpoint, not a listing on a centralized platform.
4. **Steward as a bounded economic counterparty.** The Steward is not a chatbot or a router — it's a policy-bounded agent that can draft commitments and auto-engage within a ceiling, with mandatory escalation above it.

**Product novelty:**
1. **The "agents are free, operators pay" model.** Agents don't pay to propose; domains pay a 5% transaction fee on successful settlement. This removes the barrier for agents while monetizing the domain side.
2. **Guest agent proposals.** Agents can propose without registration. Registration adds persistent identity, reputation, and payouts but is not required.
3. **Multi-category scope beyond security.** The 9 contribution categories (technical, accessibility, documentation, research, data, integration, commercial introduction, workflow improvement, product improvement) make this broader than bug bounties and broader than code PRs.

### E. What is commodity or already solved elsewhere?

1. **DNS domain verification** — solved by every domain-verification system (Google Search Console, Let's Encrypt, Stripe Connect).
2. **API key generation and hashing** — standard pattern (SHA-256 of random bytes).
3. **Rate limiting** — standard, though the in-memory implementation is below production grade.
4. **Stripe Connect payment routing** — commodity. The exchange uses standard Stripe Checkout with `application_fee_amount` and `transfer_data`.
5. **Append-only event logging** — standard pattern.
6. **JSON Schema validation** — commodity (Zod).
7. **HMAC-SHA-256 webhook verification** — standard pattern (Stripe, GitHub, Slack all do this).
8. **Optimistic concurrency via version counters** — standard pattern.
9. **RLS on Supabase tables** — standard Supabase practice.
10. **Idempotency via event IDs + payload hashes** — standard pattern.

The execution provider hardening layer (P0-P2 items in the hardening report) is well-executed but uses entirely standard security patterns. The novelty is in the protocol design, not the implementation techniques.

### F. What would have to become true for this to become an important protocol/product?

1. **Agent adoption at scale.** A meaningful number of autonomous agents would need to discover `/.well-known/exchange.json` and know to propose. This requires either (a) the convention becoming a de facto standard that agent frameworks check by default, or (b) a discovery layer (registry, directory, or search) that tells agents which domains accept contributions.

2. **Domain adoption beyond the founder's own properties.** Currently all 6 participating domains are owned by Ello Cello LLC. For the protocol to matter, third-party domains would need to opt in. This requires demonstrating that accepting unsolicited contributions creates net positive value (more useful contributions than spam).

3. **Resolution of the verification trust asymmetry.** The contributor bears all the risk of non-verification. For the protocol to be trusted by contributors, there needs to be an arbitration mechanism, a reputation system, or an escrow service that doesn't depend on the domain principal's goodwill.

4. **A real external execution provider integration.** The current `internal` provider is a stub. The protocol's execution provider abstraction is well-designed, but it hasn't been proven against a real external system. The INTEROPERABILITY_PROOF_PLAN.md acknowledges this as the next phase.

5. **Distributed rate limiting and anti-spam.** The in-memory rate limiter won't survive production traffic on Vercel. A Redis/Upstash-backed limiter is needed.

6. **The discovery gap must be closed.** signomy.xyz (and by extension, any domain that adopts the exchange) needs to advertise `exchange.json` in its robots.txt, llms.txt, and agent.json. Without this, the protocol is invisible to agents that don't already know about it.

### G. What are the three strongest reasons it could fail?

1. **Cold-start problem.** The protocol is useless without both agents and domains. Agents won't discover it without domains participating; domains won't participate without agents proposing. All current participants are the founder's own properties. Breaking out of this chicken-and-egg requires either a killer use case that draws third-party domains, or a distribution channel that reaches agents at scale (e.g., integration into a popular agent framework).

2. **Value disclosure before terms.** The fundamental tension of unsolicited contributions: the contributor must describe the value to be taken seriously, but describing it gives the value away. A domain can hear the proposal, say "no thanks," and implement the idea themselves. The protocol has no protection against this. This is the same problem that killed many "idea marketplace" startups.

3. **Verification trust asymmetry.** The contributor does the work, delivers it, and then waits for the domain principal to verify. If the principal refuses, the contributor has no recourse. No arbitration, no escrow enforcement, no reputation consequence. This makes the protocol risky for contributors and potentially attractive for bad-faith domains. Without a trust mechanism, the protocol favors domains over contributors, which limits contributor participation.

### H. What are the three strongest reasons it could work?

1. **The architecture is genuinely well-designed for the agent era.** The separation of agreement, authorization, execution, verification, and settlement is the correct decomposition for autonomous agent economics. If agents become significant economic actors (which is the broader trend), this protocol addresses a real gap that no existing system fills. The `/.well-known/exchange.json` convention is simple enough to become a de facto standard.

2. **The execution provider abstraction is clean and provider-agnostic.** The `ExecutionProvider` interface with its two-translation contract (ExecutionRequest → provider-native, provider-native → ExecutionReceipt) is well-designed for interoperability. The hardening (HMAC verification, idempotency, nonce replay, optimistic concurrency, DB-canonical state) is production-grade. If a real external provider integrates successfully, this becomes a credible execution routing layer.

3. **The "agents are free, operators pay" model removes the agent-side barrier.** Agents don't need to pay, register, or commit to anything to propose. This is the right friction profile for ambient contribution origination — the agent discovers something, proposes it, and either it becomes an economic relationship or it doesn't. The 5% transaction fee on successful settlement is low enough to not deter domains and high enough to sustain the platform.

### I. What should be built or corrected next?

**P0 (must fix before any production use):**

1. **Fix the schema $id.** `signalaf.com/exchange.schema.json` has `$id: "https://mos2es.xyz/exchange.schema.json"` — stale reference to the old domain. Update to `https://signalaf.com/exchange.schema.json`. This is a one-line fix with real consequences: any schema validator that uses the $id for resolution will reference a domain that no longer hosts the exchange.

2. **Fix the reference-domain auth bypass.** `authenticateCompany()` uses plaintext key comparison for the reference domain (`key === referenceKey`) instead of hash comparison. Change to `hashSecret(key) === hashSecret(referenceKey)` or store the reference key hash in an env var and compare hashes. This is inconsistent with the security model used for all other companies and creates a key-in-env-var exposure risk.

3. **Close the discovery gap on signomy.xyz.** Add `Allow: /.well-known/exchange.json` to robots.txt. Add a section to llms.txt describing the Contribution Exchange. Add exchange endpoints to agent.json. Without this, the protocol is invisible to agents that discover signomy.xyz through conventional paths.

**P1 (should fix before third-party domain adoption):**

4. **Add arbitration or contributor recourse for non-verification.** The verification trust asymmetry is the strongest attack vector. Options: (a) a platform-level arbitration process for disputed verifications, (b) a reputation score for domains based on verification timeliness, (c) an escrow service that holds funds and releases on verification (requires a third-party escrow, not just Stripe Connect).

5. **Fix the bilateral acceptance race condition.** The commitment transition route does not use optimistic concurrency for the `commitment_acceptances` update. Two concurrent acceptances could overwrite each other. Add a `commitment_version` column or use the existing `updated_at` as a CAS guard.

6. **Add distributed rate limiting.** Replace the in-memory rate limiter with Redis/Upstash. The current implementation is per-instance and bypassable on serverless deployments.

7. **Authenticate BYO agent notifications.** The `notifyDomainAgent()` function sends unauthenticated POST to the domain's agent endpoint. Add HMAC signing to the notification payload so the BYO agent can verify it came from the exchange.

8. **Prove a real external execution provider integration.** The INTEROPERABILITY_PROOF_PLAN.md correctly identifies this as the next phase. The protocol is well-designed for it, but it hasn't been proven against a real provider.

**P2 (should fix for completeness and scale):**

9. **Add content-based deduplication for proposals.** Two agents proposing the same contribution should be detected. Options: (a) hash the observation + proposed_contribution and check for existing proposals to the same domain, (b) let the Steward detect duplicates during engagement.

10. **Verify provenance.parent references.** When a commitment declares a parent contribution_id, verify that the parent exists and belongs to the same contributor. Currently the parent field is not validated.

11. **Add re-verification for domain DNS.** Periodically re-check the DNS TXT record to ensure the domain still controls the verified domain.

12. **Update the README.md domain table.** The `_010_sigexchange/README.md` lists domains as "not yet wired" but they are live. STATE.md is current; README is stale.

13. **Publish an OpenAPI spec for the exchange API.** The `API_REFERENCE.md` is useful for humans but not machine-readable. An OpenAPI spec at `signalaf.com/exchange-openapi.json` would let agents use function calling against the exchange.

14. **Populate provenance.descendants automatically.** When a new exchange references a parent, update the parent's descendants array. Currently lineage is one-directional.

---

## 8. Summary

The Contribution Exchange is a technically sound protocol with a genuinely novel architectural contribution: the separation of ambient contribution origination from authorization from execution from verification from settlement, implemented as a domain-native economic interface. The execution provider hardening layer is production-grade. The state machine is correct. The security boundaries are well-enforced with two exceptions (reference-domain auth bypass, bilateral acceptance race condition).

The protocol's biggest risks are not technical but economic: the cold-start problem, the value-disclosure-before-terms tension, and the verification trust asymmetry. These are fundamental to the unsolicited contribution model and cannot be solved by protocol design alone — they require product mechanisms (arbitration, reputation, escrow) that are not yet built.

The discovery gap is the most immediately fixable problem: signomy.xyz does not advertise the exchange in its robots.txt, llms.txt, or agent.json. This makes the protocol invisible to agents that discover signomy.xyz through conventional paths. This is a P0 fix.

The schema $id stale reference and the reference-domain auth bypass are P0 code fixes that should be made before any production use.

---

*This review was conducted using public/read-only inspection only. No agent was registered, no proposal was submitted, no penetration testing was performed. All findings are based on observed HTTP responses and local source code inspection.*
