import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { gymbroGet } from '../gymbro-client.js';
import { createProposal, ownerOf, type ProposalInput, type ProposalLine } from '../proposals.js';
import { getBearer } from '../request-auth.js';
import { asArray, asRecord, pickString, toolFromGymbro } from '../slim.js';

const TZ = 'America/Argentina/Buenos_Aires';

/** Dato inválido o ambiguo: vuelve al modelo como `{ error }` para que lo explique. */
export class ProposalError extends Error {
  constructor(
    message: string,
    readonly extra: Record<string, unknown> = {},
  ) {
    super(message);
    this.name = 'ProposalError';
  }
}

async function permissionCodes(): Promise<Set<string>> {
  const raw = await gymbroGet('/api/me/permissions');
  const body = asRecord(raw) ?? {};
  return new Set(
    asArray(body.permissionCodes).filter((item): item is string => typeof item === 'string'),
  );
}

/**
 * Arma una propuesta (sin escribir): chequea permiso, valida/resuelve y la guarda.
 *
 * @remarks La ejecución real es `confirm_proposal`, que el modelo no ve.
 */
export async function proposeWrite(
  permission: string,
  build: () => Promise<ProposalInput>,
): Promise<CallToolResult> {
  return toolFromGymbro(async () => {
    const codes = await permissionCodes();
    if (!codes.has(permission)) {
      return {
        error:
          'No tenés permiso para hacer esto. Pedile a un admin que lo habilite en Roles y permisos.',
        links: [{ href: '/roles', label: 'Roles y permisos' }],
      };
    }
    try {
      const input = await build();
      return createProposal(ownerOf(getBearer()), input);
    } catch (error) {
      if (error instanceof ProposalError) {
        return { error: error.message, ...error.extra };
      }
      throw error;
    }
  });
}

export function money(amount: number): string {
  return `$${new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 }).format(amount)}`;
}

export function ymdHuman(ymd: string): string {
  const [y, m, d] = ymd.split('-');
  return `${d}/${m}/${y}`;
}

export function dateTimeHuman(iso: string): string {
  return new Intl.DateTimeFormat('es-AR', {
    timeZone: TZ,
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(iso));
}

/** Fecha + hora local BA (UTC−3, sin DST) → ISO UTC. */
export function baLocalToIso(ymd: string, hhmm: string): string {
  return new Date(`${ymd}T${hhmm}:00.000-03:00`).toISOString();
}

/** ISO → `{ ymd, hhmm }` en BA. */
export function isoToBaLocal(iso: string): { ymd: string; hhmm: string } {
  const date = new Date(iso);
  const ymd = new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(date);
  const hhmm = new Intl.DateTimeFormat('en-GB', {
    timeZone: TZ,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
  return { ymd, hhmm };
}

export function yesNo(value: boolean): string {
  return value ? 'Sí' : 'No';
}

/** Renglón "antes → después" (o solo el valor nuevo si no había). */
export function changeLine(label: string, before: string | null, after: string): ProposalLine {
  return { label, value: before && before !== after ? `${before} → ${after}` : after };
}

/** `''` → `null` (borrar el dato); `undefined` = no tocar. */
export function clearable(value: string | undefined): string | null | undefined {
  if (value === undefined) {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

export async function getRecord(path: string): Promise<Record<string, unknown>> {
  const raw = await gymbroGet(path);
  const record = asRecord(raw);
  if (!record) {
    throw new ProposalError('No encontrado.');
  }
  return record;
}

export function nameOf(record: Record<string, unknown>, fallback = 'Sin nombre'): string {
  return pickString(record, 'name')?.trim() || pickString(record, 'email') || fallback;
}

export function requireSomeChange(body: Record<string, unknown>): void {
  if (Object.values(body).every((value) => value === undefined)) {
    throw new ProposalError('No indicaste qué cambiar.');
  }
}

export function definedOnly(body: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(body).filter(([, value]) => value !== undefined));
}
