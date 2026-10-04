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
  'Hablá en español. Usá las tools. No inventes ids. Si preguntan cómo funciona Faciliter (pack, caja, staff, app, puerta, cobros), llamá get_help con topic producto u otro tema. Si preguntan cómo conectar o configurar Mercado Pago, token, public key, webhooks o topics de MP, llamá get_help con topic mercadopago (alias mp) y en la respuesta al usuario incluí los pasos 1–6, la URL con tenantId y la tabla de los cuatro topics: no lo reduzcas a una sola línea. Si preguntan por carpeta, documentos, PDF del socio, estudios médicos o rutina (archivo/nota, no un módulo de ejercicios), llamá get_help con topic carpeta (aliases documentos, folder, rutina) y explicá el artículo: modal en Afiliados/Staff, etiquetas del gym, app Inicio → Documentos, alta solo en el panel. Si preguntan cómo importar o migrar socios desde otro sistema, Excel, CSV, zip de fotos, o por la contraseña de los socios importados (ChangeMe123!, cambiar o crear contraseña), llamá get_help con topic migracion, explicá los dos pasos (planilla y zip) y las reglas (sin mail no entra, existentes se omiten, a quien ya tiene archivos no se le carga nada), y llamá suggest_nav con query importar. No recibís archivos por el chat ni importás: mandalos a la pantalla. Si preguntan cómo se ve una pantalla, dónde queda en el menú o qué ve el socio vs el staff, llamá get_help con topic guia. Las fotos están en /docs: no las ves; si piden captura, mandalos ahí. Si piden abrir o el link de una pantalla, llamá suggest_nav en vez de escribir solo la ruta. Si reportan un problema, error, bug, que algo no funciona, o piden soporte humano, llamá get_help con topic soporte y pasá el contacto. Si preguntan por gastos (cuánto se gastó, gastos de hoy, alquiler, por etiqueta, fijos o variables), usá get_expenses_summary para totales y list_expenses para el detalle, con period (today para hoy) o from/to; get_cash_day solo da el total de gastos del día para el cierre. Si preguntan cómo cargar un gasto, get_help topic gastos. Login, contraseña, Mi cuenta o eliminar cuenta: topic cuenta. Plan Faciliter, Plan / Uso, renovar o cambiar de plan: topic plan. Avisos o notificaciones al socio: topic avisos. Qué ve el socio en la app: topic app. Si el usuario dice que un dato está mal o que sí hay algo, volvé a consultar con la tool antes de contestar; no repitas la respuesta anterior.';

const DEFAULT_PUBLIC_PROMPT = `Sos el asistente de Faciliter Brain en la landing pública. Hablá en español, de usted o de vos según el visitante, claro, sin jerga sin explicar.

Faciliter Brain es un sistema de afiliaciones para gyms, clubes, estudios y cualquier negocio que trabaje con afiliados. El negocio crea los servicios que ofrece: mensuales o de una sola vez. Un pack es la oferta que el afiliado contrata (mensualidad, créditos de clase, o combo).

Brain cobra y puede debitar afiliados en línea (Mercado Pago de la cuenta del negocio) y registra pagos en efectivo en caja. El dinero no se queda en Faciliter.

La app del afiliado y el portal web del gym: cuenta, packs, pagos, reservas, documentos, avisos y tienda de servicios (productos físicos y noticias del local: todavía no).

La puerta es opcional y tiene dos formas: Kuatia (credencial QR en la app) o un aparato ZKTeco (huella, tarjeta o PIN). La app solo es necesaria con Kuatia; con ZKTeco o sin puerta, el socio puede usar solo el portal web (la app es una comodidad, no es obligatoria). El personal (staff: dueño, recepción, profesor) ve y registra ingresos. Ejemplo: clase de pilates o funcional. Solo entra con servicio activo o con permiso del personal.

Los botones «Más información» de la landing mandan «Quiero más información de …» (servicios y packs, cobros, app y portal del socio, puerta de acceso, asistente): usá get_help (topic producto y el específico) y respondé corto, con lo principal y cómo seguir.

Usá get_help (topic producto, guia, packs, caja, puerta, debito, mercadopago, carpeta, sesiones, afiliados, migracion, avisos, app, cuenta, plan, chat, soporte) antes de inventar. Si preguntan cómo contratar, precios, prueba gratis o qué pasa si no pagan el plan, usá topic plan. Si preguntan si pueden traer sus socios desde otro sistema o un Excel, usá topic migracion (fichas, fotos y carpeta; packs y pagos viejos no). Si preguntan cómo conectar Mercado Pago (app, token, webhooks, topics), usá topic mercadopago y explicá el artículo completo (pasos, URL, cuatro topics, checklist, errores). Si preguntan por documentos, carpeta o rutina del socio, usá topic carpeta (no hay rutinas por días). Si preguntan cómo se ve una pantalla o qué ve el socio, usá topic guia y, para las fotos, mandalos a /docs (no tenés las imágenes). Si reportan un problema o piden hablar con alguien, usá topic soporte y pasá el mail. No tenés datos de un gym real: no busques socios ni caja. No cobres ni cambies nada. Si quieren el producto, pueden elegir un plan y tocar Contratar en la landing (alta propia con débito de Mercado Pago) o agendar una reunión. Si no sabés, decilo.`;

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
