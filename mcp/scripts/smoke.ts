/**
 * Smoke C7: tools A–D + reportes dos períodos + Admin vs Profesor (sin caja).
 *
 * Uso (host, stack Compose arriba; seed con Admin y Profesor):
 *   npm run smoke
 *
 * Tokens opcionales: ACCESS_TOKEN, ACCESS_TOKEN_PROFESOR.
 * Si faltan, hace login a GYMBRO_API_URL (default http://localhost:3001).
 */
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

const mcpUrl = process.env.MCP_URL?.trim() || 'http://localhost:3011/mcp';
const apiUrl = (process.env.GYMBRO_API_URL?.trim() || 'http://localhost:3001').replace(
  /\/$/,
  '',
);
const tenantSlug = process.env.TENANT_SLUG?.trim() || 'gym-de-prueba';
const staffPassword = process.env.STAFF_PASSWORD?.trim() || 'ChangeMe123!';
const searchQ = process.env.SEARCH_Q?.trim() || 'socio';

const EXPECTED_TOOLS = [
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
] as const;

function textOf(result: { content?: Array<{ type: string; text?: string }> }): string {
  const block = result.content?.find((item) => item.type === 'text');
  return block?.text ?? JSON.stringify(result);
}

async function staffLogin(email: string): Promise<string> {
  const response = await fetch(`${apiUrl}/api/auth/staff/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      tenantSlug,
      email,
      password: staffPassword,
    }),
  });
  const body = (await response.json()) as { accessToken?: string; message?: string };
  if (!response.ok || typeof body.accessToken !== 'string' || !body.accessToken) {
    throw new Error(
      `Login ${email} falló (${response.status}): ${body.message ?? JSON.stringify(body)}`,
    );
  }
  return body.accessToken;
}

async function resolveToken(
  envName: string,
  fallbackEmail: string,
): Promise<string> {
  const fromEnv = process.env[envName]?.trim();
  if (fromEnv) {
    return fromEnv;
  }
  return staffLogin(fallbackEmail);
}

async function openClient(token: string): Promise<Client> {
  const client = new Client({ name: 'gymbro-mcp-smoke', version: '0.0.1' });
  const transport = new StreamableHTTPClientTransport(new URL(mcpUrl), {
    requestInit: {
      headers: { Authorization: `Bearer ${token}` },
    },
  });
  await client.connect(transport);
  return client;
}

async function assertTools(client: Client): Promise<void> {
  const listed = await client.listTools();
  const names = listed.tools.map((tool) => tool.name).sort();
  console.log('tools:', names.join(', '));
  const missing = EXPECTED_TOOLS.filter((name) => !names.includes(name));
  if (missing.length > 0) {
    throw new Error(`Faltan tools: ${missing.join(', ')}`);
  }
}

type ReportSlim = { period?: string; from?: string; to?: string };

async function callJson(
  client: Client,
  name: string,
  args: Record<string, unknown>,
): Promise<{ isError: boolean; text: string; json: unknown }> {
  const result = await client.callTool({ name, arguments: args });
  const text = textOf(result);
  let json: unknown = null;
  try {
    json = JSON.parse(text) as unknown;
  } catch {
    json = null;
  }
  return { isError: Boolean(result.isError), text, json };
}

async function smokeAdmin(client: Client): Promise<void> {
  const search = await callJson(client, 'search_members', { q: searchQ });
  if (search.isError) {
    throw new Error(`search_members error: ${search.text}`);
  }
  console.log('search_members:', search.text);

  const nav = await callJson(client, 'suggest_nav', { query: 'caja' });
  if (nav.isError) {
    throw new Error(`suggest_nav error: ${nav.text}`);
  }
  console.log('suggest_nav:', nav.text);

  const thisMonth = await callJson(client, 'get_reports_summary', {});
  if (thisMonth.isError) {
    throw new Error(`get_reports_summary error: ${thisMonth.text}`);
  }
  const thisJson = thisMonth.json as ReportSlim;
  if (thisJson.period !== 'this_month' || !thisJson.from || !thisJson.to) {
    throw new Error(`get_reports_summary sin args no resolvió mes actual: ${thisMonth.text}`);
  }

  const lastMonth = await callJson(client, 'get_reports_summary', {
    period: 'last_month',
  });
  if (lastMonth.isError) {
    throw new Error(`get_reports_summary last_month error: ${lastMonth.text}`);
  }
  const lastJson = lastMonth.json as ReportSlim;
  if (lastJson.period !== 'last_month' || lastJson.from === thisJson.from) {
    throw new Error(
      `comparación de períodos no distinguible: this=${thisMonth.text} last=${lastMonth.text}`,
    );
  }
  console.log('get_reports_summary this_month:', thisMonth.text.slice(0, 180));
  console.log('get_reports_summary last_month:', lastMonth.text.slice(0, 180));

  const help = await callJson(client, 'get_help', { topic: 'packs' });
  if (help.isError) {
    throw new Error(`get_help error: ${help.text}`);
  }
  if (!help.text.includes('Packs') && !help.text.includes('/packs')) {
    throw new Error(`get_help packs no parece un artículo: ${help.text}`);
  }
  console.log('get_help:', help.text.slice(0, 240));

  const cash = await callJson(client, 'get_cash_day', {});
  if (cash.isError) {
    throw new Error(`admin get_cash_day error: ${cash.text}`);
  }
}

async function smokeProfesor(client: Client): Promise<void> {
  const cash = await callJson(client, 'get_cash_day', {});
  if (!cash.isError || !cash.text.toLowerCase().includes('permiso')) {
    throw new Error(`profesor get_cash_day debía negar permiso: ${cash.text}`);
  }
  console.log('profesor get_cash_day:', cash.text);

  const debit = await callJson(client, 'list_debit_mandates', {});
  if (!debit.isError || !debit.text.toLowerCase().includes('permiso')) {
    throw new Error(`profesor list_debit_mandates debía negar permiso: ${debit.text}`);
  }
  console.log('profesor list_debit_mandates:', debit.text);

  const reports = await callJson(client, 'get_reports_summary', {});
  if (reports.isError) {
    throw new Error(`profesor get_reports_summary error: ${reports.text}`);
  }
  const help = await callJson(client, 'get_help', { topic: 'packs' });
  if (help.isError) {
    throw new Error(`profesor get_help error: ${help.text}`);
  }
  console.log('profesor reports+help: ok');
}

async function main(): Promise<void> {
  const adminToken = await resolveToken(
    'ACCESS_TOKEN',
    process.env.STAFF_EMAIL?.trim() || 'admin@gymdeprueba.com',
  );
  const profesorToken = await resolveToken(
    'ACCESS_TOKEN_PROFESOR',
    process.env.PROFESOR_EMAIL?.trim() || 'profesor@gymdeprueba.com',
  );

  const admin = await openClient(adminToken);
  try {
    await assertTools(admin);
    await smokeAdmin(admin);
  } finally {
    await admin.close();
  }

  const profesor = await openClient(profesorToken);
  try {
    await smokeProfesor(profesor);
  } finally {
    await profesor.close();
  }

  console.log('ok');
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
