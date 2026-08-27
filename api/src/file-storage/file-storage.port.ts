/**
 * Puerto (interfaz) para almacenamiento de archivos.
 *
 * @remarks Cualquier adaptador (R2, S3, Cloudinary, local) implementa esta
 * interfaz. El módulo Upload usa solo el puerto, no conoce el backend.
 */
export interface FileStoragePort {
  /**
   * Sube un archivo y devuelve la URL pública de acceso.
   *
   * @param key - Clave (path) dentro del bucket, ej. `services/uuid.webp`
   * @param buffer - Contenido del archivo
   * @param contentType - MIME type, ej. `image/webp`
   */
  upload(key: string, buffer: Buffer, contentType: string): Promise<string>;

  /**
   * Elimina un archivo por su clave.
   */
  delete(key: string): Promise<void>;
}

/** Injection token para FileStoragePort. */
export const FILE_STORAGE_PORT = 'FILE_STORAGE_PORT';
