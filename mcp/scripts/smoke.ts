/**
 * Smoke C6: initialize + tools/list + tools A–D contra el MCP HTTP.
 *
 * Uso (host, stack Compose arriba):
 *   $env:ACCESS_TOKEN = "<JWT Staff>"
 *   npm run smoke
 *
 * Opcional: MCP_URL (default http://localhost:3011/mcp), SEARCH_Q (default socio).
 * Esperá un Staff con reportes (Admin seed). Staff sin caja puede fallar list_debit_mandates.
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
    'get_cash_day',
    'get_help',
    'get_member_account',
    'get_pack',
    'get_reports_summary',
    'get_role',
    'get_session',
    'list_debit_mandates',
    'list_packs',
    'list_refund_requests',
    'list_roles',
    'list_services',
    'list_sessions',
    'preview_member_access',
    'search_audit_events',
    'search_members',
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

  const reports = await client.callTool({
    name: 'get_reports_summary',
    arguments: {},
  });
  if (reports.isError) {
    throw new Error(`get_reports_summary error: ${textOf(reports)}`);
  }
  const reportsText = textOf(reports);
  const reportsJson = JSON.parse(reportsText) as {
    period?: string;
    from?: string;
    to?: string;
  };
  if (reportsJson.period !== 'this_month' || !reportsJson.from || !reportsJson.to) {
    throw new Error(`get_reports_summary sin args no resolvió mes actual: ${reportsText}`);
  }
  console.log('get_reports_summary:', reportsText);

  const help = await client.callTool({
    name: 'get_help',
    arguments: { topic: 'packs' },
  });
  if (help.isError) {
    throw new Error(`get_help error: ${textOf(help)}`);
  }
  const helpText = textOf(help);
  if (!helpText.includes('Packs') && !helpText.includes('/packs')) {
    throw new Error(`get_help packs no parece un artículo: ${helpText}`);
  }
  console.log('get_help:', helpText.slice(0, 240));

  await client.close();
  console.log('ok');
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
