import { MemberImportKind, MemberImportStatus } from '@prisma/client';

/** Resultado de una fila en la vista previa. */
export type ImportPreviewRow = {
  rowNumber: number;
  status: 'new' | 'exists' | 'error';
  reason?: string;
  /** La persona ya tiene cuenta Faciliter (otro gym): conserva su contraseña. */
  linkedAccount?: boolean;
};

/** Resultado de una fila o archivo al importar. */
export type ImportItemResult = {
  rowNumber?: number;
  status: 'created' | 'skipped' | 'error';
  reason?: string;
  memberId?: string;
};

/** Corrida expuesta por la API. */
export type MemberImportDetail = {
  id: string;
  kind: MemberImportKind;
  status: MemberImportStatus;
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

/** Socio encontrado para un DNI o mail del zip. */
export type ImportFileMatch = {
  key: string;
  memberId: string;
  name: string | null;
  hasPhoto: boolean;
  folderCount: number;
};
