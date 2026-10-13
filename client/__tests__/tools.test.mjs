import { test } from "node:test";
import assert from "node:assert/strict";
import { TOOLS, callTool } from "../tools.mjs";

// ─── Tool registry tests ────────────────────────────────────────────────────

test("exposes exactly 10 tools", () => {
  assert.equal(TOOLS.length, 10);
});

test("all tool names are unique", () => {
  const names = TOOLS.map((t) => t.name);
  assert.equal(new Set(names).size, names.length);
});

test("all tools have name, description, inputSchema, annotations", () => {
  for (const t of TOOLS) {
    assert.ok(t.name, `${t.name || "unnamed"} must have a name`);
    assert.ok(t.description, `${t.name} must have a description`);
    assert.ok(t.inputSchema, `${t.name} must have an inputSchema`);
    assert.ok(t.annotations, `${t.name} must have annotations`);
  }
});

test("6 read-only tools have readOnlyHint: true", () => {
  const readOnly = TOOLS.filter((t) => t.annotations?.readOnlyHint === true);
  assert.equal(readOnly.length, 6);
});

test("4 mutation tools have readOnlyHint: false", () => {
  const mutation = TOOLS.filter((t) => t.annotations?.readOnlyHint === false);
  assert.equal(mutation.length, 4);
});

test("all tools have openWorldHint: true", () => {
  for (const t of TOOLS) {
    assert.equal(t.annotations.openWorldHint, true, `${t.name} should have openWorldHint`);
  }
});

test("expected tool names are present", () => {
  const expected = [
    "exchange_discover_domain",
    "exchange_get_policy",
    "exchange_preflight",
    "exchange_list_signals",
    "exchange_get_signal",
    "exchange_get_attempt",
    "exchange_propose",
    "exchange_create_attempt",
    "exchange_submit_attempt",
    "exchange_create_proposal_from_attempt",
  ];
  const names = TOOLS.map((t) => t.name);
  for (const name of expected) {
    assert.ok(names.includes(name), `missing tool: ${name}`);
  }
});

// ─── Dispatcher tests ───────────────────────────────────────────────────────

test("unknown tool throws", async () => {
  await assert.rejects(() => callTool("nonexistent_tool", {}));
});

test("exchange_propose without EXCHANGE_AGENT_KEY returns missing scope error", async () => {
  const oldKey = process.env.EXCHANGE_AGENT_KEY;
  delete process.env.EXCHANGE_AGENT_KEY;
  try {
    const result = await callTool("exchange_propose", {
      title: "test",
      scope: "technical",
      summary: "test",
    });
    assert.ok(result.error.includes("EXCHANGE_AGENT_KEY"));
    assert.equal(result.authoritative_exchange_state_advanced, false);
  } finally {
    if (oldKey) process.env.EXCHANGE_AGENT_KEY = oldKey;
  }
});

test("exchange_create_attempt without EXCHANGE_AGENT_KEY returns missing scope error", async () => {
  const oldKey = process.env.EXCHANGE_AGENT_KEY;
  delete process.env.EXCHANGE_AGENT_KEY;
  try {
    const result = await callTool("exchange_create_attempt", {
      signal_id: "test-signal",
    });
    assert.ok(result.error.includes("EXCHANGE_AGENT_KEY"));
    assert.equal(result.authoritative_exchange_state_advanced, false);
  } finally {
    if (oldKey) process.env.EXCHANGE_AGENT_KEY = oldKey;
  }
});

test("exchange_submit_attempt without EXCHANGE_AGENT_KEY returns missing scope error", async () => {
  const oldKey = process.env.EXCHANGE_AGENT_KEY;
  delete process.env.EXCHANGE_AGENT_KEY;
  try {
    const result = await callTool("exchange_submit_attempt", {
      attempt_id: "test-attempt",
      evidence: "test evidence",
    });
    assert.ok(result.error.includes("EXCHANGE_AGENT_KEY"));
    assert.equal(result.authoritative_exchange_state_advanced, false);
  } finally {
    if (oldKey) process.env.EXCHANGE_AGENT_KEY = oldKey;
  }
});

test("exchange_create_proposal_from_attempt without EXCHANGE_AGENT_KEY returns missing scope error", async () => {
  const oldKey = process.env.EXCHANGE_AGENT_KEY;
  delete process.env.EXCHANGE_AGENT_KEY;
  try {
    const result = await callTool("exchange_create_proposal_from_attempt", {
      attempt_id: "test-attempt",
    });
    assert.ok(result.error.includes("EXCHANGE_AGENT_KEY"));
    assert.equal(result.authoritative_exchange_state_advanced, false);
  } finally {
    if (oldKey) process.env.EXCHANGE_AGENT_KEY = oldKey;
  }
});

// ─── Live API tests (read-only, no auth) ────────────────────────────────────

test("exchange_discover_domain returns live exchange.json from signalaf.com", async () => {
  const result = await callTool("exchange_discover_domain", {});
  assert.ok(result.protocol || result.domain || result.mcp,
    "should return exchange discovery document");
});

test("exchange_list_signals returns signals array from live API", async () => {
  const result = await callTool("exchange_list_signals", {});
  assert.ok("signals" in result, "should return signals array (even if empty)");
});
