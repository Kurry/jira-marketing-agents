// MCP server entrypoint for Claude Cowork (and any MCP client).
//
// Exposes the AI Growth Ops growth-ops capabilities as MCP tools over stdio.
// Cowork launches this server as a command-based MCP connector; it can fetch
// Jira itself (when JIRA_* env vars are set) or operate on issue fields that
// Cowork's native Jira connector provides.
//
// Run:  npm run mcp        (tsx — recommended; handles ESM/CJS interop)
// Typecheck: npm run build:mcp  (tsc -p tsconfig.mcp.json, bundler resolution)

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

import { TOOLS, getTool } from "./tools";
import { createJiraClient } from "./jiraClient";

async function main(): Promise<void> {
  const jira = createJiraClient();

  const server = new Server(
    { name: "aigo-growth-ops", version: "0.1.0" },
    { capabilities: { tools: {} } }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: TOOLS.map((t) => ({
      name: t.name,
      description: t.description,
      inputSchema: t.inputSchema,
    })),
  }));

  server.setRequestHandler(CallToolRequestSchema, async (req) => {
    const tool = getTool(req.params.name);
    if (!tool) {
      return {
        isError: true,
        content: [{ type: "text", text: `Unknown tool: ${req.params.name}` }],
      };
    }
    try {
      const result = await tool.run(req.params.arguments ?? {}, jira);
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return { isError: true, content: [{ type: "text", text: message }] };
    }
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);
  // Log to stderr so we don't corrupt the stdio JSON-RPC channel.
  console.error(
    `aigo-growth-ops MCP server ready — ${TOOLS.length} tools, Jira ${jira ? "configured" : "not configured (field-input mode)"}.`
  );
}

main().catch((err) => {
  console.error("Fatal MCP server error:", err);
  process.exit(1);
});
