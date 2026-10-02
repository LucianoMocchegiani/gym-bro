/**
 * Migración de afiliados (`/member-imports`). RN-MIG-001..006.
 *
 * Lotes alineados con `api/src/member-import/member-import.constants.ts`.
 */

import { apiMultipart, apiRequest } from '@/lib/api/client';

export const IMPORT_ROWS_PER_BATCH = 200;
export const IMPORT_MATCH_KEYS_PER_BATCH = 1000;

export type ImportKind = 'ROWS' | 'FILES' | 'ACCESS_CODES';

/** Fila de números del aparato: socio por DNI o mail + número (RN-MIG-006). */
export type AccessCodeRowInput = {
  rowNumber: number;
  document?: string;
  email?: string;
  externalId?: string;
};

/** Fila ya mapeada (todo texto; la API valida por fila). */
export type ImportRowInput = {
  rowNumber: number;
  email?: string;
  name?: string;
  document?: string;
  phone?: string;
  status?: string;
};

export type ImportPreviewRow = {
  rowNumber: number;
  status: 'new' | 'exists' | 'error';
  reason?: string;
  linkedAccount?: boolean;
};

export type ImportItemResult = {
  rowNumber?: number;
  status: 'created' | 'skipped' | 'error';
  reason?: string;
  memberId?: string;
};

export type MemberImportDetail = {
  id: string;
  kind: ImportKind;
  status: 'RUNNING' | 'DONE';
  filename: string;
  totalRows: number;
  createdCount: number;
  skippedCount: number;
  failedCount: number;
  mapping: unknown;
  createdByName: string | null;
  createdAt: string;
  finishedAt: string | null;
};

export type ImportFileMatch = {
  key: string;
  memberId: string;
  name: string | null;
  hasPhoto: boolean;
  folderCount: number;
};

/** Últimas corridas del gym. */
export function listMemberImports(): Promise<MemberImportDetail[]> {
  return apiRequest<MemberImportDetail[]>('/member-imports');
}

/** Vista previa de un lote (no escribe). */
export function previewImportRows(
  rows: ImportRowInput[],
): Promise<ImportPreviewRow[]> {
  return apiRequest<ImportPreviewRow[]>('/member-imports/preview', {
    method: 'POST',
    body: { rows },
  });
}

/** Abre una corrida. */
export function startMemberImport(input: {
  kind: ImportKind;
  filename: string;
  totalRows: number;
  mapping?: Record<string, unknown>;
}): Promise<MemberImportDetail> {
  return apiRequest<MemberImportDetail>('/member-imports', {
    method: 'POST',
    body: input,
  });
}

/** Alta de un lote de fichas. */
export function importRowsBatch(
  importId: string,
  rows: ImportRowInput[],
): Promise<ImportItemResult[]> {
  return apiRequest<ImportItemResult[]>(`/member-imports/${importId}/rows`, {
    method: 'POST',
    body: { rows },
  });
}

/** Vista previa de números del aparato (no escribe; 409 si el gym no es ZKTeco). */
export function previewAccessCodes(
  rows: AccessCodeRowInput[],
): Promise<ImportPreviewRow[]> {
  return apiRequest<ImportPreviewRow[]>('/member-imports/access-codes/preview', {
    method: 'POST',
    body: { rows },
  });
}

/** Vincula un lote de números dentro de una corrida `ACCESS_CODES`. */
export function importAccessCodesBatch(
  importId: string,
  rows: AccessCodeRowInput[],
): Promise<ImportItemResult[]> {
  return apiRequest<ImportItemResult[]>(
    `/member-imports/${importId}/access-codes`,
    { method: 'POST', body: { rows } },
  );
}

/** Cruza DNI/mails del zip con socios del gym. */
export function matchImportFiles(keys: string[]): Promise<ImportFileMatch[]> {
  return apiRequest<ImportFileMatch[]>('/member-imports/match', {
    method: 'POST',
    body: { keys },
  });
}

/** Foto de perfil (no pisa si ya tiene). */
export function importMemberPhoto(
  importId: string,
  memberId: string,
  file: File,
): Promise<ImportItemResult> {
  const form = new FormData();
  form.append('file', file);
  return apiMultipart<ImportItemResult>(
    `/member-imports/${importId}/members/${memberId}/photo`,
    form,
  );
}

/** Documento de carpeta (topes RN-FOL-006). */
export function importMemberFolderFile(
  importId: string,
  memberId: string,
  file: File,
): Promise<ImportItemResult> {
  const form = new FormData();
  form.append('file', file);
  return apiMultipart<ImportItemResult>(
    `/member-imports/${importId}/members/${memberId}/folder`,
    form,
  );
}

/** Cierra la corrida (auditoría con totales). */
export function finishMemberImport(
  importId: string,
): Promise<MemberImportDetail> {
  return apiRequest<MemberImportDetail>(`/member-imports/${importId}/finish`, {
    method: 'POST',
  });
}
