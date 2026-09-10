/**
 * Env del servicio chat (portable). Si falta un required, el proceso no arranca.
 *
 * @remarks Cero `GYMBRO_*`. El huésped inyecta URLs (introspect, MCP, CORS).
 */

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required env ${name}`);
  }
  return value;
}

/** OpenRouter trata `replace-me` como “sin Authorization”; fallá al boot. */
function requiredOpenRouterKey(): string {
  const value = required('OPENROUTER_API_KEY');
  if (value === 'replace-me') {
    throw new Error(
      'OPENROUTER_API_KEY is still replace-me. Recreate the container after editing chat-api/.env (restart does not reload env_file).',
    );
  }
  return value;
}

function parsePort(raw: string | undefined): number {
  if (!raw?.trim()) {
    return 3010;
  }
  const port = Number(raw);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`Invalid PORT: ${raw}`);
  }
  return port;
}

function parsePositiveInt(raw: string | undefined, fallback: number): number {
  if (!raw?.trim()) {
    return fallback;
  }
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 1) {
    throw new Error(`Invalid integer env: ${raw}`);
  }
  return value;
}

function parseOrigins(raw: string): string[] {
  const origins = raw
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
  if (origins.length === 0) {
    throw new Error('CORS_ORIGIN must list at least one origin');
  }
  return origins;
}

function parseBool(raw: string | undefined, fallback: boolean): boolean {
  if (!raw?.trim()) {
    return fallback;
  }
  const value = raw.trim().toLowerCase();
  if (value === 'true' || value === '1') {
    return true;
  }
  if (value === 'false' || value === '0') {
    return false;
  }
  throw new Error(`Invalid boolean env: ${raw}`);
}

function publicSessionSecret(databaseUrl: string, openrouterKey: string): string {
  const explicit = process.env.CHAT_PUBLIC_SESSION_SECRET?.trim();
  if (explicit) {
    return explicit;
  }
  return `${databaseUrl}::${openrouterKey}::public-landing`;
}

const DEFAULT_STAFF_PROMPT =
  'Hablá en español. Usá las tools. No inventes ids. Si preguntan cómo funciona Faciliter (pack, caja, staff, app, puerta, cobros), llamá get_help con topic producto u otro tema. Si piden abrir o el link de una pantalla, llamá suggest_nav en vez de escribir solo la ruta.';

const DEFAULT_PUBLIC_PROMPT = `Sos el asistente de Faciliter Brain en la landing pública. Hablá en español, de usted o de vos según el visitante, claro, sin jerga sin explicar.

Faciliter Brain es un sistema de afiliaciones para gyms, clubes, estudios y cualquier negocio que trabaje con afiliados. El negocio crea los servicios que ofrece: mensuales o de una sola vez. Un pack es la oferta que el afiliado contrata (mensualidad, créditos de clase, o combo).

Brain cobra y puede debitar afiliados en línea (Mercado Pago de la cuenta del negocio) y registra pagos en efectivo en caja. El dinero no se queda en Faciliter.

La app del afiliado: cuenta, packs, pagos, tienda de servicios (productos físicos y noticias del local: todavía no). La app es la credencial de acceso.

En puerta el personal (staff: dueño, recepción, profesor) ve y registra ingresos. Ejemplo: clase de pilates o funcional. Solo entra con servicio activo o con permiso del personal.

Usá get_help (topic producto, packs, caja, puerta, debito, sesiones, afiliados, chat) antes de inventar. No tenés datos de un gym real: no busques socios ni caja. No cobres ni cambies nada. Si quieren el producto, invitá a agendar una reunión. Si no sabés, decilo.`;

export type ChatConfig = {
  port: number;
  databaseUrl: string;
  chatMcpUrl: string;
  authIntrospectUrl: string;
  authRequiredProfile: string;
  openrouterApiKey: string;
  openrouterModel: string;
  corsOrigins: string[];
  corsAppDomain: string | null;
  chatSystemPrompt: string;
  chatPublicSystemPrompt: string;
  chatPublicEnabled: boolean;
  chatPublicSessionSecret: string;
  chatPublicMaxTurnsPerHour: number;
  contextTokenBudget: number;
  maxToolSteps: number;
};

const openrouterApiKey = requiredOpenRouterKey();
const databaseUrl = required('DATABASE_URL');

export const config: ChatConfig = {
  port: parsePort(process.env.PORT),
  databaseUrl,
  chatMcpUrl: required('CHAT_MCP_URL'),
  authIntrospectUrl: required('AUTH_INTROSPECT_URL'),
  authRequiredProfile: required('AUTH_REQUIRED_PROFILE'),
  openrouterApiKey,
  openrouterModel:
    process.env.OPENROUTER_MODEL?.trim() || 'openai/gpt-4.1-mini',
  corsOrigins: parseOrigins(required('CORS_ORIGIN')),
  corsAppDomain: process.env.CORS_APP_DOMAIN?.trim().toLowerCase() || null,
  chatSystemPrompt: process.env.CHAT_SYSTEM_PROMPT?.trim() || DEFAULT_STAFF_PROMPT,
  chatPublicSystemPrompt:
    process.env.CHAT_PUBLIC_SYSTEM_PROMPT?.trim() || DEFAULT_PUBLIC_PROMPT,
  chatPublicEnabled: parseBool(process.env.CHAT_PUBLIC_ENABLED, true),
  chatPublicSessionSecret: publicSessionSecret(databaseUrl, openrouterApiKey),
  chatPublicMaxTurnsPerHour: parsePositiveInt(
    process.env.CHAT_PUBLIC_MAX_TURNS_PER_HOUR,
    24,
  ),
  contextTokenBudget: parsePositiveInt(process.env.CHAT_CONTEXT_TOKENS, 10_000),
  maxToolSteps: parsePositiveInt(process.env.CHAT_MAX_TOOL_STEPS, 8),
};
