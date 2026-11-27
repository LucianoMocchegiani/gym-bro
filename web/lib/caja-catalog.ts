export type CajaCatalogType = 'SERVICIOS' | 'PACKS' | 'PRODUCTOS';

export function cajaCatalogTypes(
  modules: string[] | null,
  isPlatform: boolean,
): CajaCatalogType[] {
  const catalogs: CajaCatalogType[] = [];
  if (isPlatform || modules?.includes('club')) {
    if (!isPlatform) catalogs.push('SERVICIOS');
    catalogs.push('PACKS');
  }
  if (!isPlatform && modules?.includes('ecommerce')) catalogs.push('PRODUCTOS');
  return catalogs;
}
