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

export type ChatConfig = {
  port: number;
  databaseUrl: string;
  chatMcpUrl: string;
  authIntrospectUrl: string;
  authRequiredProfile: string;
  openrouterApiKey: string;
  openrouterModel: string;
  corsOrigins: string[];
  chatSystemPrompt: string;
};

export const config: ChatConfig = {
  port: parsePort(process.env.PORT),
  databaseUrl: required('DATABASE_URL'),
  chatMcpUrl: required('CHAT_MCP_URL'),
  authIntrospectUrl: required('AUTH_INTROSPECT_URL'),
  authRequiredProfile: required('AUTH_REQUIRED_PROFILE'),
  openrouterApiKey: required('OPENROUTER_API_KEY'),
  openrouterModel:
    process.env.OPENROUTER_MODEL?.trim() || 'openai/gpt-4.1-mini',
  corsOrigins: parseOrigins(required('CORS_ORIGIN')),
  chatSystemPrompt:
    process.env.CHAT_SYSTEM_PROMPT?.trim() ||
    'Hablá en español. Usá las tools. No inventes ids.',
};
