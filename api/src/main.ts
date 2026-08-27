import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { PrismaExceptionFilter } from './prisma/prisma-exception.filter';

/**
 * ¿El Origin del browser es un subdominio de localhost (tenant slug)?
 */
function isLocalTenantOrigin(origin: string): boolean {
  try {
    const url = new URL(origin);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return false;
    }
    // demo.localhost / fit-palermo.localhost
    return /^[a-z0-9-]+\.localhost$/i.test(url.hostname);
  } catch {
    return false;
  }
}

/**
 * Orígenes bajo `CORS_APP_DOMAIN` (ej. pruebasaproduccunon.uno + *.dominio).
 */
function isAppDomainOrigin(origin: string): boolean {
  const domain = process.env.CORS_APP_DOMAIN?.trim().toLowerCase();
  if (!domain) {
    return false;
  }
  try {
    const url = new URL(origin);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return false;
    }
    const host = url.hostname.toLowerCase();
    return host === domain || host.endsWith(`.${domain}`);
  } catch {
    return false;
  }
}

/**
 * Arranca la API HTTP de GymBro.
 *
 * @remarks Puerto por defecto `3001` para no chocar con Next (`3000`).
 * Prefijo global `api` → health en `GET /api/health`.
 * CORS: `CORS_ORIGIN` + `*.localhost` + opcional `CORS_APP_DOMAIN`.
 * Pruebas manuales: colección Postman en `postman/`.
 */
async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.setGlobalPrefix('api');
  const corsOrigin = process.env.CORS_ORIGIN?.split(',')
    .map((o) => o.trim())
    .filter(Boolean) ?? ['http://localhost:3000'];
  app.enableCors({
    origin: (
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void,
    ) => {
      if (!origin) {
        callback(null, true);
        return;
      }
      if (
        corsOrigin.includes(origin) ||
        isLocalTenantOrigin(origin) ||
        isAppDomainOrigin(origin)
      ) {
        callback(null, true);
        return;
      }
      callback(new Error(`CORS blocked for origin: ${origin}`), false);
    },
    credentials: true,
  });
  app.useGlobalFilters(new PrismaExceptionFilter());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  const port = Number(process.env.PORT ?? 3001);
  await app.listen(port, '0.0.0.0');
}

void bootstrap();
