import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { PrismaExceptionFilter } from './prisma/prisma-exception.filter';

/**
 * Arranca la API HTTP de GymBro.
 *
 * @remarks Puerto por defecto `3001` para no chocar con Next (`3000`).
 * Prefijo global `api` → health en `GET /api/health`.
 * Pruebas manuales: colección Postman en `postman/`.
 */
async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');
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
