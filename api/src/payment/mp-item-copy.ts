const TZ = 'America/Argentina/Buenos_Aires';
/** Límite Checkout Pro (`title` / `description`). */
const MP_TEXT_MAX = 256;

/**
 * Copy de un ítem de Preference MP, alineado al comprobante GymBro.
 *
 * @remarks El modal «Descripción de la compra» de MP lista sobre todo `title`.
 * Pack: nombre + servicios/créditos (la vigencia del contrato aún no existe).
 * Drop-in: servicio + sede + horario.
 */
export type MpItemCopy = {
  title: string;
  description: string;
};

function clip(text: string, max: number): string {
  const normalized = text.trim().replace(/\s+/g, ' ');
  if (normalized.length <= max) {
    return normalized;
  }
  if (max < 2) {
    return normalized.slice(0, max);
  }
  return `${normalized.slice(0, max - 1).trimEnd()}…`;
}

function formatServiceLine(name: string, credits: number | null): string {
  if (credits == null) {
    return `${name} · acceso libre`;
  }
  return `${name} · ${credits} ${credits === 1 ? 'crédito' : 'créditos'}`;
}

function formatSessionRange(startsAt: Date, endsAt: Date): string {
  const day = new Intl.DateTimeFormat('es-AR', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    timeZone: TZ,
  }).format(startsAt);
  const t1 = new Intl.DateTimeFormat('es-AR', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: TZ,
  }).format(startsAt);
  const t2 = new Intl.DateTimeFormat('es-AR', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: TZ,
  }).format(endsAt);
  return `${day} ${t1}–${t2}`;
}

function formatPackServices(
  services: Array<{ name: string; credits: number | null }>,
): string {
  return [...services]
    .sort((a, b) => a.name.localeCompare(b.name, 'es'))
    .map((s) => formatServiceLine(s.name, s.credits))
    .join(' · ');
}

/**
 * Título/descripción MP de un pack (mismo criterio que líneas de comprobante).
 */
export function mpCopyForPack(
  packName: string,
  services: Array<{ name: string; credits: number | null }>,
): MpItemCopy {
  const servicesText = formatPackServices(services);
  const title = servicesText ? `${packName} · ${servicesText}` : packName;
  return {
    title: clip(title, MP_TEXT_MAX),
    description: clip(servicesText || 'Pack', MP_TEXT_MAX),
  };
}

/**
 * Título/descripción MP de un drop-in (servicio · sede · horario).
 */
export function mpCopyForDropIn(input: {
  serviceName: string;
  branchName: string;
  startsAt: Date;
  endsAt: Date;
}): MpItemCopy {
  const range = formatSessionRange(input.startsAt, input.endsAt);
  const title = [input.serviceName, input.branchName, range]
    .filter((part) => part.trim().length > 0)
    .join(' · ');
  return {
    title: clip(title, MP_TEXT_MAX),
    description: clip('Drop-in', MP_TEXT_MAX),
  };
}
