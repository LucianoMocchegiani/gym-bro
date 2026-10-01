import { MemberStatus } from '@prisma/client';
import { isEmail } from 'class-validator';

/** Fila tal cual la arma el Admin con el mapa de columnas (todo texto). */
export type RawImportRow = {
  rowNumber: number;
  email?: string;
  name?: string;
  document?: string;
  phone?: string;
  status?: string;
};

/** Fila lista para persistir. */
export type NormalizedImportRow = {
  rowNumber: number;
  email: string;
  name: string;
  document: string | null;
  phone: string | null;
  status: MemberStatus;
};

export type NormalizeResult =
  | { ok: true; row: NormalizedImportRow }
  | { ok: false; rowNumber: number; reason: string };

const STATUS_WORDS: Record<string, MemberStatus> = {
  activo: MemberStatus.ACTIVE,
  activa: MemberStatus.ACTIVE,
  active: MemberStatus.ACTIVE,
  alta: MemberStatus.ACTIVE,
  habilitado: MemberStatus.ACTIVE,
  vigente: MemberStatus.ACTIVE,
  si: MemberStatus.ACTIVE,
  sí: MemberStatus.ACTIVE,
  '1': MemberStatus.ACTIVE,
  true: MemberStatus.ACTIVE,
  suspendido: MemberStatus.SUSPENDED,
  suspendida: MemberStatus.SUSPENDED,
  suspended: MemberStatus.SUSPENDED,
  pausado: MemberStatus.SUSPENDED,
  pausada: MemberStatus.SUSPENDED,
  baja: MemberStatus.INACTIVE,
  inactivo: MemberStatus.INACTIVE,
  inactiva: MemberStatus.INACTIVE,
  inactive: MemberStatus.INACTIVE,
  deshabilitado: MemberStatus.INACTIVE,
  vencido: MemberStatus.INACTIVE,
  no: MemberStatus.INACTIVE,
  '0': MemberStatus.INACTIVE,
  false: MemberStatus.INACTIVE,
};

/**
 * Traduce el estado del sistema viejo. Vacío → ACTIVE.
 *
 * @returns `null` si la palabra no se reconoce.
 */
export function parseImportStatus(value?: string): MemberStatus | null {
  const key = value?.trim().toLowerCase() ?? '';
  if (!key) {
    return MemberStatus.ACTIVE;
  }
  if ((Object.values(MemberStatus) as string[]).includes(key.toUpperCase())) {
    return key.toUpperCase() as MemberStatus;
  }
  return STATUS_WORDS[key] ?? null;
}

/**
 * DNI sin puntos, espacios ni guiones, en mayúsculas (`12.345.678` → `12345678`).
 */
export function normalizeDocument(value?: string): string | null {
  const cleaned = (value ?? '').replace(/[.\s-]/g, '').toUpperCase();
  return cleaned.length ? cleaned : null;
}

/** Mail en minúsculas sin espacios. */
export function normalizeEmail(value?: string): string {
  return (value ?? '').trim().toLowerCase();
}

/**
 * Valida y normaliza una fila de la planilla.
 *
 * @remarks RN-MIG-002: sin mail válido la fila se omite (el mail es la llave
 * de la cuenta Faciliter). Nombre obligatorio (2–120).
 */
export function normalizeImportRow(raw: RawImportRow): NormalizeResult {
  const rowNumber = raw.rowNumber;
  const email = normalizeEmail(raw.email);
  if (!email) {
    return { ok: false, rowNumber, reason: 'Falta el mail' };
  }
  if (!isEmail(email)) {
    return { ok: false, rowNumber, reason: `Mail inválido: ${email}` };
  }
  const name = (raw.name ?? '').replace(/\s+/g, ' ').trim();
  if (name.length < 2) {
    return { ok: false, rowNumber, reason: 'Falta el nombre' };
  }
  if (name.length > 120) {
    return { ok: false, rowNumber, reason: 'Nombre de más de 120 caracteres' };
  }
  const document = normalizeDocument(raw.document);
  if (document && document.length > 40) {
    return { ok: false, rowNumber, reason: 'DNI de más de 40 caracteres' };
  }
  const phone = raw.phone?.trim() || null;
  if (phone && phone.length > 40) {
    return { ok: false, rowNumber, reason: 'Teléfono de más de 40 caracteres' };
  }
  const status = parseImportStatus(raw.status);
  if (!status) {
    return {
      ok: false,
      rowNumber,
      reason: `Estado no reconocido: ${raw.status?.trim()}`,
    };
  }
  return {
    ok: true,
    row: { rowNumber, email, name, document, phone, status },
  };
}
