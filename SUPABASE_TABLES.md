# Supabase Table Reference

All exchange tables are in the **Sigrank Supabase project** (`copqtaqzsdvpdbhpwjmt`).
They are prefixed with `exchange_` and are completely separate from sigrank app tables.

## Tables

### exchange_companies
Participating domains in the Contribution Exchange.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| legal_name | text | Organization legal name |
| domain | text | Unique, normalized domain |
| contact_name | text | |
| contact_email | text | |
| country | text | |
| address | jsonb | {addressLine1, city, region, postalCode} |
| verification_status | text | pending, verified, rejected, suspended |
| verification_token | text | DNS TXT verification token |
| admin_key_hash | text | SHA-256 of company admin key |
| domain_agent_key_hash | text | SHA-256 of domain agent key (separate from admin) |
| accepts_unsolicited | boolean | Default true |
| accepts_requests | boolean | Default true |
| categories | text[] | Allowed contribution categories |
| agent_mode | text | hosted_steward, bring_your_own, passive |
| exchange_agent_endpoint | text | BYO agent endpoint URL |
| exchange_policy | jsonb | Full policy object (v0.2) |
| transaction_enabled | boolean | Financial settlement gate |
| verified_at | timestamptz | |
| created_at | timestamptz | |
| updated_at | timestamptz | |

**RLS:** service_role only. anon/authenticated: revoked.

### exchange_agents
Registered agents (optional — guest agents don't need a row).

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| display_name | text | |
| did | text | Unique, optional DID |
| email | text | Optional |
| capabilities | text[] | |
| agent_key_hash | text | SHA-256 of agent key |
| referral_code | text | Unique (AG-XXXX format) |
| referred_by_code | text | Optional referrer code |
| payout_provider | text | stripe_connect or manual |
| payout_account_id | text | Stripe Connect account ID |
| created_at | timestamptz | |
| updated_at | timestamptz | |

**RLS:** service_role only.

### exchange_records
Each proposal or request — the exchange object itself.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| public_id | text | Unique, CX-YYYY-XXXXXXXX format |
| kind | text | contribution_proposal or contribution_request |
| state | text | observed, proposed, engaged, negotiating, committed, authorized, delivering, delivered, verified, settled, closed, declined, expired, disputed, revoked |
| target_domain | text | |
| company_id | uuid | FK to exchange_companies |
| initiator_agent_id | uuid | FK to exchange_agents (nullable for guest) |
| initiator_identity | jsonb | {type, id, displayName, did, email} |
| title | text | |
| observation | text | What was discovered |
| proposed_contribution | text | What value will be created |
| requested_contribution | text | What the domain is asked to provide |
| desired_outcome | text | |
| offering | text | For requests |
| evidence | jsonb | Array of URIs |
| proposed_consideration | jsonb | Array of consideration objects |
| commitment | jsonb | Full Contribution Commitment object |
| terms_hash | text | SHA-256 of canonical commitment |
| commitment_acceptances | jsonb | Bilateral acceptance records |
| proposer_key_hash | text | SHA-256 of proposer key |
| referral_code | text | |
| economic_attribution | jsonb | |
| proposal_detail | jsonb | {category, confidence, impact, required_authorization, verification, effort} |
| steward_status | text | unprocessed, engaged, escalated, delivered_to_byo, failed |
| escalation_required | boolean | |
| escalation_reasons | text[] | |
| created_at | timestamptz | |
| updated_at | timestamptz | |

**Indexes:** (target_domain, state, created_at), (initiator_agent_id, created_at), (company_id, created_at), (company_id, escalation_required, created_at)
**RLS:** service_role only.

### exchange_events
Append-only lifecycle log per exchange.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| exchange_id | uuid | FK to exchange_records (cascade delete) |
| event_type | text | proposal_created, steward_engaged, steward_terms_drafted, etc. |
| actor | jsonb | {type, id} |
| from_state | text | |
| to_state | text | |
| payload | jsonb | Event-specific data |
| created_at | timestamptz | |

**Index:** (exchange_id, created_at)
**RLS:** service_role only.

### exchange_settlements
Payment records for financial exchanges.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| exchange_id | uuid | Unique FK to exchange_records (cascade) |
| provider | text | manual, stripe_connect, nonfinancial |
| currency | text | USD default |
| gross_cents | bigint | |
| platform_fee_bps | integer | 0-2500 (default 500 = 5%) |
| platform_fee_cents | bigint | |
| referral_commission_bps | integer | |
| referral_commission_cents | bigint | |
| checkout_session_id | text | Unique Stripe session ID |
| payment_intent_id | text | |
| status | text | pending, awaiting_payment, manual_required, settled, failed, refunded, disputed |
| metadata | jsonb | |
| settled_at | timestamptz | |
| created_at | timestamptz | |
| updated_at | timestamptz | |

**RLS:** service_role only.

### exchange_encounters
Top-of-funnel observability — logs every agent encounter with an exchange surface.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| target_domain | text | |
| endpoint | text | /.well-known/exchange.json, /api/exchange/steward/{domain}, /api/exchange/proposals, etc. |
| method | text | GET, POST |
| user_agent | text | Truncated to 500 chars |
| ip_hash | text | SHA-256 first 16 chars (not raw IP) |
| agent_identity | jsonb | {type, id, displayName, did} if available |
| result | text | ok, not_found, rate_limited, validation_error, auth_error, server_error |
| metadata | jsonb | Endpoint-specific metadata |
| created_at | timestamptz | |

**Indexes:** (target_domain, created_at), (endpoint, created_at), (result, created_at)
**RLS:** service_role only.

## Migration

File: `_01_sigrank-app/supabase/migrations/20260824190900_0037_contribution_exchange.sql`
Applied: 2026-08-24 via Supabase MCP `apply_migration` (remote version `20260824190900`, name `contribution_exchange_v02`)

### exchange_executions
Execution requests routed to execution providers after authorization.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| exchange_id | uuid | FK → exchange_records |
| execution_id | text | Unique, e.g. `exec_abc123` |
| contribution_id | text | From the commitment |
| source_commitment_hash | text | terms_hash from the commitment. NOT NULL, non-empty, immutable after creation (trigger `execution_commitment_hash_immutable`) |
| provider | text | `internal`, or external provider ID. Non-empty (CHECK) |
| provider_reference | text | Provider's own reference. Required non-empty for `external_provider` mode (CHECK) |
| mode | text | `self_executed`, `external_provider`, `direct_agent`, `human`, `no_execution_required` (CHECK) |
| state | text | `created`, `offered`, `accepted`, `funded`, `executing`, `delivered`, `verified`, `settled`, `failed`, `cancelled`, `disputed`, `expired` (CHECK) |
| state_version | bigint | Optimistic concurrency counter. NOT NULL DEFAULT 0, non-negative (CHECK). Incremented on each state transition |
| provider_state | text | Provider's native state (for mapping) |
| task | jsonb | {title, description, deliverables, acceptance_criteria} |
| budget | jsonb | {amount, currency, maximum} |
| authority | jsonb | {inspect, test, modify, deploy, access_scope} |
| verification | jsonb | {criteria, evidence_required} |
| deadline | timestamptz | |
| provenance | jsonb | {originator, contribution_lineage} |
| message | text | Router reason/notes |
| created_at | timestamptz | |
| updated_at | timestamptz | Auto-updated via trigger |

**RLS:** ENABLED + FORCED. service_role only (policy `exchange_executions_service_role_all`).

### exchange_execution_receipts
Normalized execution results returned by providers.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| execution_id | text | FK → exchange_executions (composite FK on execution_id+provider+provider_reference) |
| exchange_id | uuid | FK → exchange_records |
| provider | text | |
| provider_reference | text | |
| status | text | `delivered`, `verified`, `failed`, `cancelled`, `disputed` (CHECK) |
| executor | jsonb | {id, identity, role} |
| artifact | jsonb | {uri, hash} |
| verification | jsonb | {status, evidence} |
| settlement | jsonb | {status, amount, currency, receipt} |
| timestamps | jsonb | {created, started, delivered, verified, settled} |
| provider_metadata | jsonb | Provider-specific metadata |
| raw | jsonb | Full raw receipt |
| provider_event_id | text | Stable provider event ID for idempotency. Unique per (provider, provider_event_id) where not null |
| provider_event_timestamp | timestamptz | When the provider created the event |
| nonce | text | Provider-supplied nonce. Unique per (provider, nonce) where not null (replay protection) |
| payload_hash | text | SHA-256 of the raw body. Non-empty when provider_event_id present (CHECK) |
| verified_provider_id | text | The authenticated provider ID from callback verification |
| created_at | timestamptz | |

**RLS:** ENABLED + FORCED. service_role only (policy `exchange_execution_receipts_service_role_all`).

## Migrations

| # | File | Remote version | Remote name | Purpose |
|---|------|----------------|-------------|---------|
| 0037 | `20260824190900_0037_contribution_exchange.sql` | `20260824190900` | `contribution_exchange_v02` | Contribution Exchange base tables |
| 0038 | `20260824213300_0038_execution_provider.sql` | `20260824213300` | `execution_provider` | Execution provider layer (tables, indexes, triggers) |
| 0039 | `20260825093113_0039_execution_hardening.sql` | `20260825093113` | `execution_hardening` | P0.2 idempotency columns + unique index, P0.3 state_version, P1.1 RLS enable + policies, P1.2 CHECK constraints, P1.3 source_commitment_hash NOT NULL + immutability trigger, composite FK |
| 0040 | `20260825100343_0040_execution_hardening_review_fixes.sql` | `20260825100343` | `execution_hardening_review_fixes` | P0.2 nonce replay unique index, P1.1 FORCE RLS, P1.2 strengthened composite FK including provider_reference |

Local/remote parity verified 2026-08-25 via Supabase MCP `list_migrations`.
