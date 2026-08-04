/**
 * Contrato genérico de paginado (módulos `list`).
 */

/** Respuesta paginada estándar de los endpoints de listado. */
export type ListResult<T> = {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  hasMore: boolean;
};

/** Parámetros comunes de paginado / orden / búsqueda. */
export type ListParams = {
  page?: number;
  pageSize?: number;
  q?: string;
  orderBy?: string;
  order?: 'asc' | 'desc';
};

/**
 * Serializa params de listado a querystring, omitiendo `undefined`/`null`/`''`.
 */
export function toSearchParams(
  params?: ListParams & Record<string, string | number | boolean | undefined | null>,
): string {
  if (!params) {
    return '';
  }
  const sp = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') {
      continue;
    }
    sp.set(key, String(value));
  }
  return sp.toString();
}
