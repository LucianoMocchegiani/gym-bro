/**
 * Carpeta de notas y files (socio o staff).
 */

import { apiRequest } from '@/lib/api/client';
import { readStaffSession } from '@/lib/auth/session';

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

function apiBase(): string {
  const base = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') ?? '';
  if (!base) {
    throw new Error('NEXT_PUBLIC_API_URL no está configurada');
  }
  return `${base}/api`;
}

function staffToken(): string | null {
  try {
    const raw = localStorage.getItem('gymbro.staff.session');
    if (!raw) {
      return readStaffSession()?.accessToken ?? null;
    }
    const session = JSON.parse(raw) as { accessToken?: string };
    return session.accessToken ?? null;
  } catch {
    return null;
  }
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
export async function createFolderFile(
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
  const headers: Record<string, string> = {};
  const token = staffToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  const res = await fetch(`${apiBase()}${ownerPath(kind, id)}/files`, {
    method: 'POST',
    headers,
    credentials: 'include',
    body: formData,
  });
  const parsed = (await res.json().catch(() => null)) as
    | FolderItemDetail
    | { message?: string }
    | null;
  if (!res.ok) {
    const msg =
      parsed && 'message' in parsed && typeof parsed.message === 'string'
        ? parsed.message
        : 'Error al subir archivo';
    throw new Error(msg);
  }
  return parsed as FolderItemDetail;
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
 * Descarga autenticada (blob).
 */
export async function downloadFolderFile(
  kind: FolderOwnerKind,
  ownerId: string,
  itemId: string,
): Promise<Blob> {
  const headers: Record<string, string> = {};
  const token = staffToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  const res = await fetch(
    `${apiBase()}${ownerPath(kind, ownerId)}/${itemId}/file`,
    { headers, credentials: 'include' },
  );
  if (!res.ok) {
    throw new Error('No se pudo descargar el archivo');
  }
  return res.blob();
}
