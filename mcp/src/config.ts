/**
 * Env del sidecar MCP GymBro. Cero secretos JWT: reenvía el Bearer a Nest.
 *
 * @remarks `GYMBRO_API_URL` es obligatorio; si falta, el proceso no arranca.
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
    return 3011;
  }
  const port = Number(raw);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`Invalid PORT: ${raw}`);
  }
  return port;
}

export const config = {
  port: parsePort(process.env.PORT),
  gymbroApiUrl: required('GYMBRO_API_URL').replace(/\/$/, ''),
};
