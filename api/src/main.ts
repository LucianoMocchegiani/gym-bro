import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

/**
 * Arranca la API HTTP de GymBro.
 *
 * @remarks Puerto por defecto `3001` para no chocar con Next (`3000`).
 * Prefijo global `api` → health en `GET /api/health`.
 */
async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');
  const port = Number(process.env.PORT ?? 3001);
  await app.listen(port, '0.0.0.0');
}

void bootstrap();
