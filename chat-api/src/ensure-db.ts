import { Client } from 'pg';

/**
 * Crea la database de `DATABASE_URL` si el volumen de Postgres ya existía
 * (el init de `/docker-entrypoint-initdb.d` solo corre en el primer boot).
 *
 * @remarks Conecta a `postgres` del mismo cluster; no usa el schema Prisma.
 */
function adminConnectionString(databaseUrl: string): {
  adminUrl: string;
  databaseName: string;
} {
  const url = new URL(databaseUrl);
  const databaseName = decodeURIComponent(url.pathname.replace(/^\//, '')).split(
    '/',
  )[0];
  if (!databaseName || !/^[A-Za-z_][A-Za-z0-9_]*$/.test(databaseName)) {
    throw new Error('DATABASE_URL must include a simple database name');
  }
  url.pathname = '/postgres';
  return { adminUrl: url.toString(), databaseName };
}

async function ensureDatabase(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (!databaseUrl) {
    throw new Error('Missing required env DATABASE_URL');
  }

  const { adminUrl, databaseName } = adminConnectionString(databaseUrl);
  const client = new Client({ connectionString: adminUrl });
  await client.connect();
  try {
    await client.query(`CREATE DATABASE ${databaseName}`);
    console.log(`Created database ${databaseName}`);
  } catch (error) {
    const code =
      typeof error === 'object' && error !== null && 'code' in error
        ? String((error as { code: unknown }).code)
        : '';
    if (code !== '42P04') {
      throw error;
    }
  } finally {
    await client.end();
  }
}

ensureDatabase().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
