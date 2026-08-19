/**
 * Link a la grilla de afiliados con la ficha abierta y la búsqueda aplicada,
 * para no cargar todos los demás afiliados.
 */
export function memberFichaHref(memberId: string, search: string): string {
  const q = search.trim();
  return `/afiliados?ficha=${encodeURIComponent(memberId)}${
    q ? `&q=${encodeURIComponent(q)}` : ''
  }`;
}
