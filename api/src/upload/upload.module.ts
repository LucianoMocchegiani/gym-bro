import { Module } from '@nestjs/common';
import { FileStorageModule } from '../file-storage/file-storage.module';
import { UploadController } from './upload.controller';
import { UploadService } from './upload.service';

/**
 * Módulo de upload de archivos.
 *
 * @remarks Depende de {@link FileStorageModule} para la infraestructura de
 * almacenamiento. El controller expone `POST /upload`.
 */
@Module({
  imports: [FileStorageModule],
  controllers: [UploadController],
  providers: [UploadService],
  exports: [UploadService],
})
export class UploadModule {}
