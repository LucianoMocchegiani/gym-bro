import { TEMPORARY_PASSWORD } from '../common/temporary-password';

/** Password inicial de los socios migrados sin cuenta Faciliter previa (RN-MIG-003). */
export const IMPORT_DEFAULT_PASSWORD = TEMPORARY_PASSWORD;

/** Filas por request. El body JSON de Express corta en 100 kB. */
export const IMPORT_MAX_ROWS_PER_BATCH = 200;

/** DNI/email por request al cruzar archivos del zip con socios. */
export const IMPORT_MAX_MATCH_KEYS = 1000;

/** Últimas corridas que lista el Admin. */
export const IMPORT_HISTORY_LIMIT = 20;
