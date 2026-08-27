# Signomy.xyz as Exchange Seed — Growth Tracking Concept

**Status:** Concept document — earmarked for future build
**Date:** 2026-08-24
**Author:** DREP1

## The idea

signomy.xyz is thematically aligned with the Contribution Exchange — it's the "Agent Universe" property. Instead of just pointing at signalaf.com's Steward via a thin `exchange.json`, signomy.xyz should eventually **host its own exchange seed** that can grow into a full node.

This means:
1. signomy.xyz gets its own Supabase project (separate from SigRank's)
2. The exchange gateway code (currently living in sigrank-app) gets extracted as a portable package
3. signomy.xyz runs its own Steward, its own encounter tracking, its own company record
4. Cross-domain exchange becomes possible: an agent discovers signomy.xyz's exchange, proposes there, and the proposal can federate to other nodes

## Why signomy.xyz is the right seed

- **Thematic fit:** Agent Universe = agent-native property. The exchange IS an agent protocol.
- **FastAPI stack:** Python/FastAPI is well-suited for agent-facing APIs (async, streaming, SSE for event delivery)
- **No legacy exchange code to clean up:** Unlike AQUA (which had the v0.1/v0.2 exchange and needed cleanup), signomy.xyz is a clean slate
- **Existing agent surfaces:** signomy.xyz already has `.well-known/agent.json`, `mcp-server-card.json`, `governance.json` — it's already agent-discoverable
- **Growth narrative:** "The exchange started as a hosted service on signalaf.com. signomy.xyz was the first domain to grow its own node. Then others followed."

## What's needed to build it

### Phase 1: Supabase project for signomy.xyz
- Create a new Supabase project (separate from SigRank's `copqtaqzsdvpdbhpwjmt`)
- Apply the exchange migration (6 tables: `exchange_companies`, `exchange_agents`, `exchange_records`, `exchange_events`, `exchange_settlements`, `exchange_encounters`)
- Register signomy.xyz as its own reference company
- Configure RLS (service_role only, same as SigRank's setup)

### Phase 2: Portable exchange gateway package
- Extract the exchange gateway core from sigrank-app into a standalone Python package
- Package includes: state machine, schema, policy, commitment logic, steward behavior
- Framework-agnostic core with FastAPI adapter
- Published as `contribution-exchange` on PyPI (or kept private initially)

### Phase 3: signomy.xyz Steward
- Implement FastAPI routes in agent-universe:
  - `/.well-known/exchange.json` (already done — currently points at signalaf.com, would point locally)
  - `/api/exchange/steward/[domain]`
  - `/api/exchange/proposals`
  - `/api/exchange/requests`
  - `/api/exchange/manifest`
  - `/api/exchange/profiles/[domain]`
- Wire to signomy.xyz's own Supabase project
- Add encounter tracking
- Add PostHog events (signomy.xyz already has GA4: G-FD4VLSCHY8)

### Phase 4: Federation
- signomy.xyz's Steward can forward proposals to signalaf.com's Steward (and vice versa)
- Cross-domain encounter tracking: an agent that discovers signomy.xyz can be routed to signalaf.com if signomy.xyz's Steward declines
- Shared schema, independent data — each node owns its own records

### Phase 5: Growth tracking
- signomy.xyz tracks "seeds" — exchanges that started on its node and grew
- Dashboard showing: encounters, proposals, engagements, settlements, agent registrations
- The "seed" metaphor: each exchange is a seed that can grow into a recurring relationship, a contribution, a collaboration

## What this is NOT

- Not a replacement for signalaf.com's hosted Steward — signalaf.com remains the reference implementation
- Not an immediate build — this is earmarked for when the exchange protocol has proven traction on signalaf.com
- Not a fork — the portable package is shared code, not a divergent implementation

## Same approach for other sites

The same "seed → grow" path applies to the other domains:
- **sigeconomy.com** (Cloudflare/Next.js): Could get its own Supabase + exchange node once the portable package has a TypeScript/Next.js adapter
- **mos2es.com** (Netlify/Eleventy): Static site — would need a serverless function layer (Netlify Functions or external API) to host a Steward
- **mos2es.org** (Cloudflare Worker): Could run a minimal Steward as a Worker
- **mos2es.xyz** (Vercel/Next.js, AQUA): Already had exchange code (now removed). Could re-add as a node if AQUA needs its own exchange surface

## Decision needed from owner

1. **When to build:** After the exchange has real agent traction on signalaf.com (not just curl traffic)
2. **Supabase project:** Create a new project for signomy.xyz, or share SigRank's project with separate schemas?
3. **Package ownership:** Should the portable exchange gateway be a public open-source package, or kept private?
4. **Federation priority:** Is cross-domain federation a Day 1 requirement, or can it come later?

## Current state (2026-08-24)

- signomy.xyz has a thin `exchange.json` pointing at signalaf.com's Steward (live, 200)
- signomy.xyz is registered in SigRank's `exchange_companies` table (verified, hosted_steward)
- No Supabase project exists for signomy.xyz
- No exchange code exists in agent-universe
- The portable exchange gateway core lives in sigrank-app (TypeScript). A Python port doesn't exist yet.
