import { FolderItemKind } from '@prisma/client';

/** Etiqueta de carpeta del tenant. */
export type FolderLabelDetail = {
  id: string;
  name: string;
};

/** Ítem de carpeta (nota o file). Sin URL de storage. */
export type FolderItemDetail = {
  id: string;
  kind: FolderItemKind;
  title: string | null;
  body: string | null;
  originalFilename: string | null;
  mime: string | null;
  sizeBytes: number | null;
  label: FolderLabelDetail | null;
  createdAt: string;
  createdByName: string | null;
};

/** Bytes para stream HTTP. */
export type FolderFileBytes = {
  buffer: Buffer;
  contentType: string;
  filename: string;
};

/** Dueño de la carpeta. */
export type FolderOwnerKind = 'member' | 'staff';
