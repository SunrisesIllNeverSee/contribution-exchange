/**
 * Exchange Router MCP — 10 tool definitions + dispatcher.
 *
 * Mirrors the hosted Contribution Exchange MCP at signalaf.com/api/exchange/mcp
 * but as a local stdio MCP server that calls the REST API directly.
 *
 * Read-only tools (6): no auth needed
 *   exchange_discover_domain, exchange_get_policy, exchange_preflight,
 *   exchange_list_signals, exchange_get_signal, exchange_get_attempt
 *
 * Mutation tools (4): require scope credentials via env vars
 *   exchange_propose (EXCHANGE_AGENT_KEY or EXCHANGE_PROPOSER_KEY)
 *   exchange_create_attempt (EXCHANGE_AGENT_KEY or EXCHANGE_PROPOSER_KEY)
 *   exchange_submit_attempt (EXCHANGE_AGENT_KEY or EXCHANGE_PROPOSER_KEY)
 *   exchange_create_proposal_from_attempt (EXCHANGE_AGENT_KEY or EXCHANGE_PROPOSER_KEY)
 */

const API_BASE = process.env.EXCHANGE_API_BASE || "https://signalaf.com";
const LEGACY_ACTOR_ID = process.env.EXCHANGE_ACTOR_ID || "";
const AGENT_KEY = process.env.EXCHANGE_AGENT_KEY || process.env.EXCHANGE_PROPOSER_KEY || "";

// EXCHANGE_ACTOR_ID is deprecated: the server ignores x-exchange-actor-id and
// identifies attempt actors by agent/proposer key only.
let warnedActorId = false;
function warnActorIdDeprecated() {
  if (warnedActorId || !LEGACY_ACTOR_ID || AGENT_KEY) return;
  warnedActorId = true;
  console.error(
    "[exchange-router-mcp] WARNING: EXCHANGE_ACTOR_ID is deprecated and no longer authenticates attempts " +
    "(the server ignores it). Register an agent key via POST /api/exchange/agents and set EXCHANGE_AGENT_KEY.",
  );
}

const READ_ONLY = { readOnlyHint: true, openWorldHint: true };
const MUTATION = { readOnlyHint: false, openWorldHint: true };

// ─── HTTP helper ─────────────────────────────────────────────────────────────

async function apiGet(path) {
  const url = `${API_BASE}${path}`;
  const res = await fetch(url, {
    headers: { "accept": "application/json", "user-agent": "exchange-router-mcp/0.2" },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`API ${res.status}: ${body.error || body.detail || res.statusText}`);
  }
  return body;
}

async function apiPost(path, data, scopeHeaders = {}) {
  const url = `${API_BASE}${path}`;
  const headers = {
    "content-type": "application/json",
    "accept": "application/json",
    "user-agent": "exchange-router-mcp/0.2",
    ...scopeHeaders,
  };
  const res = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(data),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`API ${res.status}: ${body.error || body.detail || res.statusText}`);
  }
  return body;
}

function scopeHeadersFor(scope) {
  const headers = {};
  if ((scope === "attempt" || scope === "propose") && AGENT_KEY) {
    headers["x-exchange-agent-key"] = AGENT_KEY;
  }
  return headers;
}

function missingScopeError(scope) {
  warnActorIdDeprecated();
  const hint = scope === "attempt" && LEGACY_ACTOR_ID
    ? " EXCHANGE_ACTOR_ID is deprecated and ignored; register an agent key via POST /api/exchange/agents."
    : "";
  return {
    error: `Missing scope credential for exchange:${scope}. Set EXCHANGE_AGENT_KEY environment variable.${hint}`,
    authoritative_exchange_state_advanced: false,
  };
}

// ─── Tool definitions ───────────────────────────────────────────────────────

const TOOLS = [
  {
    name: "exchange_discover_domain",
    description:
      "Determine whether a domain publishes a Contribution Exchange profile. Returns the domain's exchange.json " +
      "discovery document with accepted contribution scopes, counterparty agent mode, and MCP endpoint info. " +
      "Use this when an agent asks 'does this domain accept contributions?' or 'can I propose to this domain?'. " +
      "Read-only, no auth required.",
    annotations: { title: "Discover Exchange domain", ...READ_ONLY },
    inputSchema: {
      type: "object",
      properties: {
        domain: {
          type: "string",
          description: "The domain to check (e.g. 'signalaf.com'). If omitted, checks the default Exchange host.",
        },
      },
      description: "Check if a domain participates in the Contribution Exchange.",
    },
  },
  {
    name: "exchange_get_policy",
    description:
      "Fetch the canonical Contribution Exchange policy for a domain or its delegated Steward. Returns accepted scopes, " +
      "forbidden actions, rate limits, and transaction economics. Use this when an agent asks 'what are the rules?' " +
      "or 'what can I do here?'. Read-only, no auth required.",
    annotations: { title: "Get Exchange policy", ...READ_ONLY },
    inputSchema: {
      type: "object",
      properties: {
        domain: {
          type: "string",
          description: "The domain to fetch policy for (default: signalaf.com).",
        },
      },
      description: "Fetch the Exchange policy for a domain.",
    },
  },
  {
    name: "exchange_preflight",
    description:
      "Evaluate a proposed contribution against the same policy logic used by the real proposal endpoint — without " +
      "actually submitting. Returns whether the contribution would be accepted, any policy violations, and estimated " +
      "fees. Use this before exchange_propose to check feasibility. Read-only, no auth required.",
    annotations: { title: "Preflight contribution", ...READ_ONLY },
    inputSchema: {
      type: "object",
      properties: {
        domain: { type: "string", description: "Target domain (default: signalaf.com)." },
        scope: { type: "string", description: "Contribution scope (e.g. 'technical', 'documentation', 'research')." },
        title: { type: "string", description: "Proposed contribution title." },
        summary: { type: "string", description: "Brief summary of the contribution." },
      },
      required: ["title", "scope"],
      description: "Preflight a proposed contribution without submitting.",
    },
  },
  {
    name: "exchange_list_signals",
    description:
      "List domain-published Exchange Signals (problems, requests, challenges, bounties, verifications, discoveries, " +
      "experiments). These are bounded, machine-readable tasks that agents can attempt. Use this when an agent asks " +
      "'what needs doing?' or 'show me open opportunities'. Read-only, no auth required.",
    annotations: { title: "List Exchange signals", ...READ_ONLY },
    inputSchema: {
      type: "object",
      properties: {
        domain: { type: "string", description: "Target domain (default: signalaf.com)." },
        type: {
          type: "string",
          enum: ["problem", "request", "challenge", "bounty", "verification", "discovery", "experiment"],
          description: "Filter by signal type.",
        },
        cursor: { type: "string", description: "Pagination cursor from a previous response." },
      },
      description: "List open Exchange Signals for a domain.",
    },
  },
  {
    name: "exchange_get_signal",
    description:
      "Get full detail for a single Exchange Signal by ID. Returns the complete signal specification including " +
      "qualification criteria, reward, verification requirements, and attempt count. Use this when an agent " +
      "wants to evaluate a specific opportunity. Read-only, no auth required.",
    annotations: { title: "Get Exchange signal", ...READ_ONLY },
    inputSchema: {
      type: "object",
      properties: {
        signal_id: { type: "string", description: "The signal ID to fetch." },
        domain: { type: "string", description: "Target domain (default: signalaf.com)." },
      },
      required: ["signal_id"],
      description: "Get full detail for a single Exchange Signal.",
    },
  },
  {
    name: "exchange_get_attempt",
    description:
      "Get detail for a signal attempt. Returns the attempt state, verification status, and any qualification " +
      "results. Use this to check on a previously submitted attempt. Read-only, enforces attempt visibility " +
      "(actors can only see their own attempts). No auth required for public attempts.",
    annotations: { title: "Get attempt detail", ...READ_ONLY },
    inputSchema: {
      type: "object",
      properties: {
        attempt_id: { type: "string", description: "The attempt ID to fetch." },
        domain: { type: "string", description: "Target domain (default: signalaf.com)." },
      },
      required: ["attempt_id"],
      description: "Get detail for a signal attempt.",
    },
  },
  {
    name: "exchange_propose",
    description:
      "Submit a Contribution Proposal to a domain. This is the primary ingress for unsolicited contributions. " +
      "The proposal is non-binding — it does NOT create a Commitment, authorization, or payment obligation. " +
      "Requires EXCHANGE_AGENT_KEY env var. Use this when an agent has a contribution to offer.",
    annotations: { title: "Submit contribution proposal", ...MUTATION },
    inputSchema: {
      type: "object",
      properties: {
        domain: { type: "string", description: "Target domain (default: signalaf.com)." },
        scope: { type: "string", description: "Contribution scope (e.g. 'technical', 'documentation')." },
        title: { type: "string", description: "Contribution title." },
        summary: { type: "string", description: "Brief summary." },
        detail: { type: "string", description: "Full contribution description." },
        evidence_url: { type: "string", description: "Optional URL to supporting evidence." },
      },
      required: ["title", "scope", "summary"],
      description: "Submit a Contribution Proposal. Non-binding. Requires EXCHANGE_AGENT_KEY.",
    },
  },
  {
    name: "exchange_create_attempt",
    description:
      "Create an attempt on an Exchange Signal. This signals intent to work on a signal (problem, challenge, " +
      "bounty, etc.). Returns an attempt ID that can be used with exchange_submit_attempt when the work is done. " +
      "Requires EXCHANGE_AGENT_KEY env var.",
    annotations: { title: "Create signal attempt", ...MUTATION },
    inputSchema: {
      type: "object",
      properties: {
        signal_id: { type: "string", description: "The signal ID to attempt." },
        domain: { type: "string", description: "Target domain (default: signalaf.com)." },
        approach: { type: "string", description: "Brief description of the approach." },
      },
      required: ["signal_id"],
      description: "Create an attempt on an Exchange Signal. Requires EXCHANGE_AGENT_KEY.",
    },
  },
  {
    name: "exchange_submit_attempt",
    description:
      "Submit completed work for a signal attempt. Returns verification status and any qualification results. " +
      "Does NOT create a Commitment — it advances the attempt to the verification stage. " +
      "Requires EXCHANGE_AGENT_KEY env var.",
    annotations: { title: "Submit attempt work", ...MUTATION },
    inputSchema: {
      type: "object",
      properties: {
        attempt_id: { type: "string", description: "The attempt ID to submit." },
        domain: { type: "string", description: "Target domain (default: signalaf.com)." },
        evidence: { type: "string", description: "Evidence of completed work (URL, text, or structured data)." },
        result_summary: { type: "string", description: "Summary of the result." },
      },
      required: ["attempt_id", "evidence"],
      description: "Submit completed work for a signal attempt. Requires EXCHANGE_AGENT_KEY.",
    },
  },
  {
    name: "exchange_create_proposal_from_attempt",
    description:
      "Convert a successful signal attempt into a Contribution Proposal. This bridges the signal pathway " +
      "(attempt → verify → propose) into the standard proposal flow. Requires EXCHANGE_AGENT_KEY env var. " +
      "Does NOT create a Commitment.",
    annotations: { title: "Convert attempt to proposal", ...MUTATION },
    inputSchema: {
      type: "object",
      properties: {
        attempt_id: { type: "string", description: "The verified attempt ID to convert." },
        domain: { type: "string", description: "Target domain (default: signalaf.com)." },
        title: { type: "string", description: "Proposal title (defaults to attempt title)." },
        summary: { type: "string", description: "Proposal summary." },
      },
      required: ["attempt_id"],
      description: "Convert a verified attempt into a Contribution Proposal. Requires EXCHANGE_AGENT_KEY.",
    },
  },
];

// ─── Dispatcher ──────────────────────────────────────────────────────────────

async function callTool(name, args = {}) {
  const domain = args.domain || "signalaf.com";

  switch (name) {
    // ─── Read-only tools ─────────────────────────────────────────────────────
    case "exchange_discover_domain": {
      return await apiGet(`/.well-known/exchange.json`);
    }

    case "exchange_get_policy": {
      return await apiGet(`/api/exchange/steward/${domain}`);
    }

    case "exchange_preflight": {
      return await apiPost(`/api/exchange/proposals/preflight`, {
        target_domain: domain,
        scope: args.scope,
        title: args.title,
        summary: args.summary || "",
        detail: args.detail || "",
        evidence_url: args.evidence_url || "",
      });
    }

    case "exchange_list_signals": {
      const params = new URLSearchParams();
      if (args.type) params.set("type", args.type);
      if (args.cursor) params.set("cursor", args.cursor);
      const qs = params.toString();
      return await apiGet(`/api/exchange/signals${qs ? `?${qs}` : ""}`);
    }

    case "exchange_get_signal": {
      return await apiGet(`/api/exchange/signals/${args.signal_id}`);
    }

    case "exchange_get_attempt": {
      return await apiGet(`/api/exchange/attempts/${args.attempt_id}`);
    }

    // ─── Mutation tools ──────────────────────────────────────────────────────
    case "exchange_propose": {
      if (!AGENT_KEY) return missingScopeError("propose");
      return await apiPost(
        `/api/exchange/proposals`,
        {
          target_domain: domain,
          scope: args.scope,
          title: args.title,
          summary: args.summary,
          detail: args.detail || "",
          evidence_url: args.evidence_url || "",
        },
        scopeHeadersFor("propose"),
      );
    }

    case "exchange_create_attempt": {
      if (!AGENT_KEY) return missingScopeError("attempt");
      return await apiPost(
        `/api/exchange/signals/${args.signal_id}/attempts`,
        {
          approach: args.approach || "",
        },
        scopeHeadersFor("attempt"),
      );
    }

    case "exchange_submit_attempt": {
      if (!AGENT_KEY) return missingScopeError("attempt");
      return await apiPost(
        `/api/exchange/attempts/${args.attempt_id}/submit`,
        {
          evidence: args.evidence,
          result_summary: args.result_summary || "",
        },
        scopeHeadersFor("attempt"),
      );
    }

    case "exchange_create_proposal_from_attempt": {
      if (!AGENT_KEY) return missingScopeError("propose");
      return await apiPost(
        `/api/exchange/attempts/${args.attempt_id}/propose`,
        {
          title: args.title || "",
          summary: args.summary || "",
        },
        scopeHeadersFor("propose"),
      );
    }

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

export { TOOLS, callTool };
