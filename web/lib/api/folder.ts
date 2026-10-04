/**
 * Carpeta de notas y files (socio o staff).
 *
 * Topes alineados con `api/src/folder/folder.constants.ts` (RN-FOL-006).
 */

import { apiBlob, apiMultipart, apiRequest } from '@/lib/api/client';

export const FOLDER_MAX_ITEMS = 10;
export const FOLDER_MAX_FILE_BYTES = 5 * 1024 * 1024;
export const FOLDER_NOTE_TITLE_MAX = 200;
export const FOLDER_NOTE_BODY_MAX = 20_000;

export type FolderOwnerKind = 'member' | 'staff';

export type FolderLabelDetail = {
  id: string;
  name: string;
};

export type FolderItemDetail = {
  id: string;
  kind: 'NOTE' | 'FILE';
  title: string | null;
  body: string | null;
  originalFilename: string | null;
  mime: string | null;
  sizeBytes: number | null;
  label: FolderLabelDetail | null;
  createdAt: string;
  createdByName: string | null;
};

function ownerPath(kind: FolderOwnerKind, id: string): string {
  return kind === 'member' ? `/members/${id}/folder` : `/staff/${id}/folder`;
}

/** Nombre visible: título de la nota o nombre original del archivo. */
export function folderItemName(item: FolderItemDetail): string {
  return item.kind === 'NOTE'
    ? item.title?.trim() || 'Nota'
    : (item.originalFilename ?? 'Archivo');
}

/**
 * Lista etiquetas del gym.
 */
export function listFolderLabels(): Promise<FolderLabelDetail[]> {
  return apiRequest<FolderLabelDetail[]>('/folder-labels');
}

/**
 * Crea una etiqueta.
 */
export function createFolderLabel(name: string): Promise<FolderLabelDetail> {
  return apiRequest<FolderLabelDetail>('/folder-labels', {
    method: 'POST',
    body: { name },
  });
}

/**
 * Lista ítems de la carpeta.
 */
export function listFolderItems(
  kind: FolderOwnerKind,
  id: string,
): Promise<FolderItemDetail[]> {
  return apiRequest<FolderItemDetail[]>(ownerPath(kind, id));
}

/**
 * Alta de nota.
 */
export function createFolderNote(
  kind: FolderOwnerKind,
  id: string,
  input: { title?: string; body: string; labelId?: string },
): Promise<FolderItemDetail> {
  return apiRequest<FolderItemDetail>(`${ownerPath(kind, id)}/notes`, {
    method: 'POST',
    body: input,
  });
}

/**
 * Alta de PDF o imagen (multipart).
 */
export function createFolderFile(
  kind: FolderOwnerKind,
  id: string,
  file: File,
  input: { title?: string; labelId?: string },
): Promise<FolderItemDetail> {
  const formData = new FormData();
  formData.append('file', file);
  if (input.title) {
    formData.append('title', input.title);
  }
  if (input.labelId) {
    formData.append('labelId', input.labelId);
  }
  return apiMultipart<FolderItemDetail>(`${ownerPath(kind, id)}/files`, formData);
}

/**
 * Baja de ítem.
 */
export function deleteFolderItem(
  kind: FolderOwnerKind,
  ownerId: string,
  itemId: string,
): Promise<void> {
  return apiRequest<void>(`${ownerPath(kind, ownerId)}/${itemId}`, {
    method: 'DELETE',
  });
}

/**
 * Descarga autenticada (blob) desde el panel.
 */
export function downloadFolderFile(
  kind: FolderOwnerKind,
  ownerId: string,
  itemId: string,
): Promise<Blob> {
  return apiBlob(`${ownerPath(kind, ownerId)}/${itemId}/file`);
}
