/**
 * Topes de carpeta (socio o staff). RN-FOL-006.
 *
 * @remarks 10 ítems = notas + files. Files en R2; notas en Postgres.
 * Ver `docs/costos/carpeta-documentos.md`.
 */
export const FOLDER_MAX_ITEMS = 10;

/** Peso máximo de un PDF o imagen de carpeta. */
export const FOLDER_MAX_FILE_BYTES = 5 * 1024 * 1024;

/** Título de nota. */
export const FOLDER_NOTE_TITLE_MAX = 200;

/** Cuerpo Markdown de nota. */
export const FOLDER_NOTE_BODY_MAX = 20_000;
