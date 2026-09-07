/**
 * Smoke C3: initialize + tools/list + search_members contra el MCP HTTP.
 *
 * Uso (host, stack Compose arriba):
 *   $env:ACCESS_TOKEN = "<JWT Staff>"
 *   npm run smoke
 *
 * Opcional: MCP_URL (default http://localhost:3011/mcp), SEARCH_Q (default socio).
 */
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

const mcpUrl = process.env.MCP_URL?.trim() || 'http://localhost:3011/mcp';
const token = process.env.ACCESS_TOKEN?.trim();
const searchQ = process.env.SEARCH_Q?.trim() || 'socio';

function textOf(result: { content?: Array<{ type: string; text?: string }> }): string {
  const block = result.content?.find((item) => item.type === 'text');
  return block?.text ?? JSON.stringify(result);
}

async function main(): Promise<void> {
  if (!token) {
    console.error('Falta ACCESS_TOKEN (JWT Staff). Login Admin / Postman GymBro API.');
    process.exit(1);
  }

  const client = new Client({ name: 'gymbro-mcp-smoke', version: '0.0.1' });
  const transport = new StreamableHTTPClientTransport(new URL(mcpUrl), {
    requestInit: {
      headers: { Authorization: `Bearer ${token}` },
    },
  });

  await client.connect(transport);
  const listed = await client.listTools();
  const names = listed.tools.map((tool) => tool.name).sort();
  console.log('tools:', names.join(', '));

  const expected = [
    'search_members',
    'get_member_account',
    'preview_member_access',
    'list_sessions',
    'get_session',
    'get_cash_day',
    'suggest_nav',
  ];
  const missing = expected.filter((name) => !names.includes(name));
  if (missing.length > 0) {
    throw new Error(`Faltan tools: ${missing.join(', ')}`);
  }

  const search = await client.callTool({
    name: 'search_members',
    arguments: { q: searchQ },
  });
  if (search.isError) {
    throw new Error(`search_members error: ${textOf(search)}`);
  }
  console.log('search_members:', textOf(search));

  const nav = await client.callTool({
    name: 'suggest_nav',
    arguments: { query: 'caja' },
  });
  if (nav.isError) {
    throw new Error(`suggest_nav error: ${textOf(nav)}`);
  }
  console.log('suggest_nav:', textOf(nav));

  await client.close();
  console.log('ok');
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
