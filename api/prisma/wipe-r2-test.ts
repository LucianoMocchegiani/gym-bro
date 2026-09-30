import {
  DeleteObjectsCommand,
  ListObjectsV2Command,
  S3Client,
} from '@aws-sdk/client-s3';
import { FolderItemKind, PrismaClient } from '@prisma/client';

/**
 * Vacía objetos R2 del prefijo de proyecto y limpia URLs/files de prueba.
 *
 * Uso (VPS / Compose, env ya inyectado):
 *   docker compose exec api npm run r2:wipe-test -- --confirm=BORRAR
 *
 * Host con `api/.env`: Node 24
 *   node --experimental-strip-types --env-file=.env --no-warnings prisma/wipe-r2-test.ts --confirm=BORRAR
 *
 * Con `R2_KEY_PREFIX` solo borra ese prefijo. Sin prefijo: todo el bucket.
 * DB: `image_url` a null; borra ítems FILE de carpeta (notas se quedan).
 */

const prisma = new PrismaClient();

function env(name: string): string {
  const v = process.env[name]?.trim();
  if (!v) {
    throw new Error(`Falta ${name} en el entorno`);
  }
  return v;
}

async function listAllKeys(
  client: S3Client,
  bucket: string,
  prefix: string,
): Promise<string[]> {
  const keys: string[] = [];
  let token: string | undefined;
  do {
    const page = await client.send(
      new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: prefix || undefined,
        ContinuationToken: token,
      }),
    );
    for (const obj of page.Contents ?? []) {
      if (obj.Key) {
        keys.push(obj.Key);
      }
    }
    token = page.IsTruncated ? page.NextContinuationToken : undefined;
  } while (token);
  return keys;
}

async function deleteKeys(
  client: S3Client,
  bucket: string,
  keys: string[],
): Promise<void> {
  const chunkSize = 1000;
  for (let i = 0; i < keys.length; i += chunkSize) {
    const slice = keys.slice(i, i + chunkSize);
    await client.send(
      new DeleteObjectsCommand({
        Bucket: bucket,
        Delete: {
          Objects: slice.map((Key) => ({ Key })),
          Quiet: true,
        },
      }),
    );
  }
}

async function main(): Promise<void> {
  if (!process.argv.includes('--confirm=BORRAR')) {
    throw new Error(
      'Abortado. Pasá --confirm=BORRAR (npm run r2:wipe-test -- --confirm=BORRAR)',
    );
  }

  const accountId = env('R2_ACCOUNT_ID');
  const bucket = env('R2_BUCKET');
  const prefix = process.env.R2_KEY_PREFIX?.trim() ?? '';
  const client = new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: env('R2_ACCESS_KEY_ID'),
      secretAccessKey: env('R2_SECRET_ACCESS_KEY'),
    },
  });

  const keys = await listAllKeys(client, bucket, prefix);
  console.log(
    `R2 bucket=${bucket} prefix=${prefix || '(todo el bucket)'} objects=${keys.length}`,
  );
  if (keys.length > 0) {
    await deleteKeys(client, bucket, keys);
    console.log(`R2: borrados ${keys.length} objeto(s)`);
  }

  const [members, staff, services, packs, files] = await prisma.$transaction([
    prisma.member.updateMany({ data: { imageUrl: null } }),
    prisma.staffUser.updateMany({ data: { imageUrl: null } }),
    prisma.service.updateMany({ data: { imageUrl: null } }),
    prisma.pack.updateMany({ data: { imageUrl: null } }),
    prisma.folderItem.deleteMany({ where: { kind: FolderItemKind.FILE } }),
  ]);

  console.log(
    `DB: members.imageUrl ${members.count}, staff ${staff.count}, services ${services.count}, packs ${packs.count}; folder FILE ${files.count}`,
  );
}

main()
  .catch((err: unknown) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
