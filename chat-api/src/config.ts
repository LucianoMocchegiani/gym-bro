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
  contextTokenBudget: number;
  maxToolSteps: number;
};

export const config: ChatConfig = {
  port: parsePort(process.env.PORT),
  databaseUrl: required('DATABASE_URL'),
  chatMcpUrl: required('CHAT_MCP_URL'),
  authIntrospectUrl: required('AUTH_INTROSPECT_URL'),
  authRequiredProfile: required('AUTH_REQUIRED_PROFILE'),
  openrouterApiKey: requiredOpenRouterKey(),
  openrouterModel:
    process.env.OPENROUTER_MODEL?.trim() || 'openai/gpt-4.1-mini',
  corsOrigins: parseOrigins(required('CORS_ORIGIN')),
  corsAppDomain: process.env.CORS_APP_DOMAIN?.trim().toLowerCase() || null,
  chatSystemPrompt:
    process.env.CHAT_SYSTEM_PROMPT?.trim() ||
    'Hablá en español. Usá las tools. No inventes ids.',
  contextTokenBudget: parsePositiveInt(process.env.CHAT_CONTEXT_TOKENS, 10_000),
  maxToolSteps: parsePositiveInt(process.env.CHAT_MAX_TOOL_STEPS, 8),
};
