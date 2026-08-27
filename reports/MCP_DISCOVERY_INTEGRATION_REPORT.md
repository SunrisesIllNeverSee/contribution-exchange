# Contribution Exchange MCP + Multi-Surface Discovery — Build Report

**Date:** 2026-08-26
**Author:** Drep2 (implementation + review)
**Repository:** `_01_sigrank-app` (sigrank-app)
**Branch:** `main`
**Commit:** `b78a763b`

---

## Summary

Implemented the Contribution Exchange MCP tools and multi-surface discovery layer. The MCP server at `/api/mcp` now exposes 10 new Exchange tools alongside the existing 15 SigRank benchmark tools. All Exchange tools delegate to canonical Exchange services (proposal route, Steward policy, signal-server) and never duplicate business logic. No MCP tool creates a Commitment, authorization, or settlement. Every mutation response includes `authoritative_exchange_state_advanced: false`.

Discovery surfaces updated: Agent Card (A2A), MCP server card, llms.txt, agents.md, robots.txt, homepage JSON-LD, sitemap.

**Final verification:** tsc 0 errors, lint 0 errors, 363/363 tests pass (including 80 MCP exchange contract tests). Canonical 11/11 pass (MO§ES Υ 18436.98).

---

## Tools added and side-effect classifications

| Tool | readOnly | destructive | idempotent | openWorld | Scope |
|------|----------|-------------|------------|-----------|-------|
| exchange_discover_domain | true | false | true | true | exchange:read |
| exchange_get_policy | true | false | true | true | exchange:read |
| exchange_preflight | true | false | true | false | exchange:read |
| exchange_propose | false | false | true | true | exchange:propose |
| exchange_list_signals | true | false | true | true | exchange:read |
| exchange_get_signal | true | false | true | true | exchange:read |
| exchange_get_attempt | true | false | true | false | exchange:read |
| exchange_create_attempt | false | false | true | false | exchange:attempt |
| exchange_submit_attempt | false | false | true | false | exchange:attempt |
| exchange_create_proposal_from_attempt | false | false | true | false | exchange:propose |

All tools registered in deterministic order with strict JSON Schemas (`additionalProperties: false`).

---

## Files changed

**New files:**
- `lib/exchange/mcp-tools.ts` — MCP tool handlers for the Contribution Exchange (10 handlers + scope resolution + SSRF protection + rate limiting)
- `__tests__/contract/mcp-exchange.test.mjs` — 80 contract tests for MCP tools and discovery surfaces

**Modified files:**
- `app/api/mcp/route.ts` — added 10 Exchange tool definitions, handlers, scope-based tool filtering, scope enforcement at tools/call, updated initialize instructions
- `app/.well-known/agent-card.json/route.ts` — added contribution-exchange skill + extension with domain-specific URLs
- `app/.well-known/mcp.json/route.ts` — added Exchange tools to card, authorization scopes, user control expectations
- `app/.well-known/agent.json/route.ts` — updated tool count (15 → 25)
- `app/llms.txt/route.ts` — expanded Contribution Exchange section with both ingress paths, canonical links, MCP server
- `app/agents.md/route.ts` — added MCP tools section, authorization scopes, HTTP alternatives, what MCP tools do NOT do
- `app/sitemap.ts` — added /exchange, /exchange/propose, /exchange/signals, /agents.md, /exchange.schema.json
- `lib/jsonld.ts` — added `contributionExchangeService()` function (Schema.org Service type)
- `app/layout.tsx` — renders `contributionExchangeService()` JSON-LD alongside existing org/website/product

---

## Discovery surfaces updated

- **Agent Card** (`/.well-known/agent-card.json`): added `contribution-exchange` skill with tags + extension with `profile`, `agentGuide`, `steward`, `signals` params using `SITE_ORIGIN` (not hardcoded)
- **MCP server card** (`/.well-known/mcp.json`): added 10 Exchange tools, `authorization.scopes` array, `userControl` expectations
- **agent.json** (`/.well-known/agent.json`): updated tool count to 25
- **llms.txt**: expanded Contribution Exchange section with both ingress paths, 9 canonical links (profile, signals, API, agent guide, policy, proposal interface, schema, MCP server, MCP discovery)
- **agents.md**: added MCP tools section (read-only tools, mutation tools, authorization scopes, what MCP does NOT do, canonical HTTP alternatives)
- **robots.txt**: `/api/exchange/signals` Allow + `/internal/` Disallow; `allow: ["/"]` permits all public paths
- **JSON-LD**: added `contributionExchangeService()` Service type with provider, channels, offer catalog; reuses existing ORG_ID and SITE_ID nodes
- **Sitemap**: added /exchange, /exchange/propose, /exchange/signals, /agents.md, /exchange.schema.json; no private/admin/attempt routes

---

## Authorization and output contracts

3 scopes (`exchange:read`/`exchange:attempt`/`exchange:propose`) resolved from request headers:
- `exchange:read` — always granted (public discovery)
- `exchange:attempt` — granted when `x-exchange-actor-id` header is present
- `exchange:propose` — granted when `x-exchange-agent-key` or `x-exchange-proposer-key` header is present

Scope filtering at `tools/list` AND enforcement at `tools/call` via `enforceScopeForCall` — a caller who knows a tool name cannot bypass the scope filter.

Every mutation response includes: `authoritative_exchange_state_advanced: false`, `commitment_created: false`, `authorization_granted: false`, `idempotent_replay: boolean`, `human_review_required: boolean`.

---

## Security

- **SSRF protection:** `isProhibitedHost` blocks loopback, link-local, RFC 1918, CGN, IPv6 ULA, cloud metadata. `redirect: "manual"` with per-hop prohibited-host checking. HTTPS enforcement on redirect targets. 3-redirect limit. 256KB response-size limit. 8s timeout.
- **Rate limiting:** All 4 mutation handlers enforce rate limits mirroring HTTP routes exactly:
  - `exchange_propose`: `rateLimitAllowAsync(ip, "exchange_proposal")` — 20/hr
  - `exchange_create_attempt`: `checkDistributedRateLimit(["signal-attempt", ip], {max: 30/hr}, true)` — fail-closed
  - `exchange_submit_attempt`: `checkDistributedRateLimit(["signal-submit", ip], {max: 30/hr}, true)` — fail-closed
  - `exchange_create_proposal_from_attempt`: `checkDistributedRateLimit(["signal-proposal", ip], {max: 10/hr}, true)` — fail-closed
- **Agent auth:** Uses `safeEqual` (SHA-256 + `timingSafeEqual`) for constant-time comparison.

---

## Review rounds

### Round 1 — REJECT (5 findings)

1. **Bug 1 (Security — Critical):** No rate limiting on MCP mutation handlers. **Fixed:** 4 rate-limit helpers mirroring HTTP routes.
2. **Bug 2 (Audit gap):** Missing `appendExchangeEvent` in `handlePropose`. **Fixed:** Added after insert, matching HTTP route.
3. **Bug 3 (Monitoring gap):** Missing `logEncounter` in all MCP handlers. **Fixed:** Added to all 4 mutation handlers.
4. **Bug 4 (Validation gap):** Missing `required_fields` validation in `handleSubmitAttempt`. **Fixed:** JSON body validation matching HTTP submit route.
5. **Bug 5 (Minor Security):** No scope enforcement at `tools/call` time. **Fixed:** `enforceScopeForCall` before dispatch.

### Round 2 — ACCEPT

All 5 round-1 fixes verified correct. No new findings. 15 new R2-fix-verification tests added.

---

## Core invariants confirmed

- No MCP tool creates a Commitment, authorization, or settlement
- `exchange_preflight` performs no persistent state mutation (calls `evaluateProposal` pure function)
- Signal tools cannot advance authoritative exchange state
- Every mutation response includes `authoritative_exchange_state_advanced: false`
- Bilateral terms-hash acceptance still required for Commitment
- Existing authority ceilings and human-required escalation remain enforced
- Unsolicited Contribution Opportunity path remains visible and functional
- No discovery surface advertises a route that does not exist (all verified)
- No fake success for unavailable routes/services
- Every response distinguishes signal-local outcomes from authoritative exchange-state changes

---

## Signal integration dependencies

All Signal services were available (concurrent ExchangeSignal implementation is present in the working tree). The MCP tools use `listSignals`, `getSignal`, `getAttempt`, `getVerification`, `isAcceptingAttempts`, `countActorAttempts`, `countConcurrentAttempts`, `createAttempt`, `submitAttempt`, `getQualification`, `consumeQualification`, and `recordProposalOrigin` from `lib/exchange/signal-server.ts`. No missing dependencies.

---

## Confirmation: no Commitment states or authoritative transition rules changed

- `mcp-tools.ts` does NOT import `finalizeCommitment` or `buildCommitmentDraft`
- `exchange_propose` creates only `exchange_records` with `state: "proposed"` — same as the HTTP proposal route
- `exchange_create_proposal_from_attempt` creates only `exchange_records` with `state: "proposed"` — same as the HTTP proposal-from-attempt route
- `exchange_preflight` performs NO database write — it calls `evaluateProposal()` (pure function) and returns an advisory result
- Every mutation response includes `authoritative_exchange_state_advanced: false`, `commitment_created: false`, `authorization_granted: false`
- Signal verification results include `authoritative_for_exchange_state: false`
- The Steward `dispatchToDomainAgent` is called for proposals (same as HTTP route) — it may auto-engage and draft a Commitment, but that is the EXISTING behavior of the canonical proposal flow, not new MCP behavior

---

## Confirmation: concurrent edits preserved

- The ExchangeSignal implementation (migration 0041, signal-server.ts, signal routes, signal tests) was not modified
- The existing 15 SigRank MCP tools were not modified
- The existing Agent Card skills (leaderboard, operator, metrics, hall-of-signal, compare, discover-peers) were preserved
- The existing AP2 extension was preserved
- The existing llms.txt sections (When to use, Developer resources, Core pages, etc.) were preserved
- The existing agents.md sections (normal loop, how to engage, preflight, proposal schema, invariants, signals) were preserved
- The existing sitemap routes were preserved
- The existing JSON-LD nodes (organization, website, product) were preserved

---

## Remaining follow-up work ranked by severity

1. **(Low)** The `handlePropose` idempotency check uses a `proposal_detail.idempotency_hash` field. The existing `exchange_records` table does not have an `idempotency_key` column — the hash is stored in the JSONB `proposal_detail` field. This works but is less efficient than a dedicated indexed column. Consider adding an `idempotency_key` column to `exchange_records` in a future migration for faster lookups.

2. **(Low)** The `handleCreateProposalFromAttempt` does not dispatch to the domain agent (unlike `handlePropose`). The HTTP proposal-from-attempt route also does not dispatch. This is consistent but means signal-originated proposals do not get auto-engaged by the Steward. This may be intentional (signal proposals require human review) but should be confirmed.

3. **(Info)** The `resolveScopes` function derives scopes from header presence, not from a formal OAuth scope system. This is a best-effort mapping consistent with the current Exchange auth model. If a formal OAuth scope system is added later, `resolveScopes` should be updated to parse real scopes.

4. **(Info)** The `exchange_discover_domain` tool fetches the manifest via HTTPS with a hard-coded 8-second timeout and 256KB response-size limit. These are reasonable defaults but may need tuning for slow networks or large manifests.

---

## Verification

- `npx tsc --noEmit`: 0 errors
- `npm run lint`: exit code 0 (pre-existing warnings only)
- `node --test __tests__/contract/mcp-exchange.test.mjs`: 80/80 pass
- `npm test`: 363/363 pass
- `node --test __tests__/ingest/canonical.test.mjs`: 11/11 pass (MO§ES Υ 18436.98)

— Drep2
