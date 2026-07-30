/**
 * Etiquetas de catálogo (servicios / packs / sesiones).
 */

export function formatServiceType(
  type: 'ACCESO_LIBRE' | 'POR_SESIONES',
): string {
  return type === 'ACCESO_LIBRE' ? 'Acceso libre' : 'Por sesiones';
}

export function formatPackKind(kind: string): string {
  switch (kind) {
    case 'ACCESS':
      return 'Acceso';
    case 'CREDITS':
      return 'Créditos';
    case 'MIXED':
      return 'Mixto';
    default:
      return kind;
  }
}

export function formatBillingPeriod(period: 'MONTHLY' | 'ONE_TIME'): string {
  return period === 'MONTHLY' ? 'Mensual' : 'Único';
}

/**
 * Convierte ISO → valor de input datetime-local (hora local del browser).
 */
export function toDatetimeLocalValue(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    return '';
  }
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/**
 * Convierte datetime-local → ISO UTC.
 */
export function fromDatetimeLocalValue(value: string): string {
  return new Date(value).toISOString();
}
