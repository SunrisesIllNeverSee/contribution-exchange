#!/usr/bin/env node
/**
 * Exchange Router MCP — the marketable intent layer for the Contribution Exchange.
 *
 * 10 tools for agent discovery, signals, proposals, and attempts.
 * Calls signalaf.com's public Exchange API. No auth required for read-only tools.
 * Mutation tools pass scope headers if provided via env vars.
 *
 * Usage for AI clients: runs as an MCP stdio server in non-TTY context.
 *   npx exchange-router-mcp
 *
 * Env overrides:
 *   EXCHANGE_API_BASE — alternate API base (default: https://signalaf.com)
 *   EXCHANGE_AGENT_KEY — agent key for exchange:propose and exchange:attempt scope
 *   EXCHANGE_ACTOR_ID — DEPRECATED, ignored by the server (warns once on stderr)
 */
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  McpError,
  ErrorCode,
} from "@modelcontextprotocol/sdk/types.js";
import { TOOLS, callTool } from "./tools.mjs";
import { readFileSync } from "node:fs";

function serverVersion() {
  try {
    const pkg = JSON.parse(
      readFileSync(new URL("./package.json", import.meta.url), "utf-8"),
    );
    return pkg.version || "0.0.0";
  } catch {
    return "0.0.0";
  }
}

process.on("uncaughtException", (err) => {
  process.stderr.write(`[exchange-router-mcp] uncaughtException: ${err?.stack || err}\n`);
  process.exit(1);
});
process.on("unhandledRejection", (reason) => {
  process.stderr.write(`[exchange-router-mcp] unhandledRejection: ${reason?.stack || reason}\n`);
  process.exit(1);
});

async function main() {
  const server = new Server(
    { name: "exchange-router-mcp", version: serverVersion() },
    {
      capabilities: { tools: { listChanged: false } },
      instructions:
        "Exchange Router MCP — the marketable intent layer for the Contribution Exchange. " +
        "Discover participating domains, browse open signals (problems, requests, challenges, bounties), " +
        "preflight contributions, submit proposals, and attempt signals. " +
        "Read-only tools (6) need no auth. Mutation tools (4) require scope credentials via env vars. " +
        "All tools call signalaf.com's public Exchange API. " +
        "Use exchange_discover_domain to check if a domain participates, exchange_list_signals to browse " +
        "open opportunities, exchange_get_signal for full detail, exchange_preflight to evaluate a contribution, " +
        "exchange_propose to submit a proposal, exchange_create_attempt + exchange_submit_attempt to work on signals, " +
        "and exchange_create_proposal_from_attempt to convert a successful attempt into a proposal.",
    },
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: TOOLS,
  }));

  server.setRequestHandler(CallToolRequestSchema, async (req) => {
    if (!TOOLS.some((t) => t.name === req.params.name)) {
      throw new McpError(ErrorCode.InvalidParams, `Unknown tool: ${req.params.name}`);
    }
    try {
      const out = await callTool(req.params.name, req.params.arguments);
      return {
        content: [{ type: "text", text: JSON.stringify(out, null, 2) }],
      };
    } catch (e) {
      return {
        content: [{ type: "text", text: `Error: ${e.message}` }],
        isError: true,
      };
    }
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);
  process.stderr.write(`[exchange-router-mcp] v${serverVersion()} ready (10 Exchange tools)\n`);
}

main();
