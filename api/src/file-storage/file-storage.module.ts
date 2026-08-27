import { Module } from '@nestjs/common';
import { FILE_STORAGE_PORT } from './file-storage.port';
import { R2Adapter } from './r2.adapter';

/**
 * Módulo de almacenamiento de archivos (puerto/adaptador).
 *
 * @remarks Provee `FILE_STORAGE_PORT` como inyectable. Para cambiar de backend,
 * solo se reemplaza la clase que implementa el puerto en este módulo.
 */
@Module({
  providers: [
    {
      provide: FILE_STORAGE_PORT,
      useClass: R2Adapter,
    },
  ],
  exports: [FILE_STORAGE_PORT],
})
export class FileStorageModule {}
