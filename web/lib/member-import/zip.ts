/**
 * Lectura de fotos y carpeta desde un zip o una carpeta elegida (RN-MIG-005).
 *
 * Convención:
 * - `fotos/{dni o email}.jpg|png|webp|gif` → foto de perfil.
 * - `carpeta/{dni o email}/{archivo}.pdf|jpg|png|webp|gif` → carpeta del socio.
 *
 * Puede haber una carpeta raíz extra (`export/fotos/...`).
 */

export type ZipImportEntry = {
  kind: 'photo' | 'folder';
  /** DNI o mail del socio, tal cual el nombre de archivo/carpeta. */
  key: string;
  path: string;
  file: File;
};

export type ZipImportContent = {
  entries: ZipImportEntry[];
  ignored: string[];
};

const MIME_BY_EXT: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
  pdf: 'application/pdf',
};

const PHOTO_DIRS = new Set(['fotos', 'foto', 'photos']);
const FOLDER_DIRS = new Set(['carpeta', 'carpetas', 'documentos', 'docs']);

function extOf(name: string): string {
  const i = name.lastIndexOf('.');
  return i >= 0 ? name.slice(i + 1).toLowerCase() : '';
}

/**
 * Clasifica un archivo por su ruta. `toFile` arma el `File` solo si se usa.
 */
function classify(
  path: string,
  toFile: (filename: string, mime: string) => File,
  out: ZipImportContent,
): void {
  const parts = path.split('/').filter(Boolean);
  const filename = parts[parts.length - 1] ?? '';
  if (
    parts.some((p) => p === '__MACOSX') ||
    filename.startsWith('.') ||
    filename.toLowerCase() === 'thumbs.db' ||
    filename.toLowerCase() === 'desktop.ini'
  ) {
    return;
  }
  const mime = MIME_BY_EXT[extOf(filename)];
  const lowerParts = parts.map((p) => p.toLowerCase());
  const photoAt = lowerParts.findIndex((p) => PHOTO_DIRS.has(p));
  const folderAt = lowerParts.findIndex((p) => FOLDER_DIRS.has(p));

  if (mime && photoAt >= 0 && photoAt === parts.length - 2 && mime !== 'application/pdf') {
    out.entries.push({
      kind: 'photo',
      key: filename.slice(0, filename.lastIndexOf('.')).trim(),
      path,
      file: toFile(filename, mime),
    });
    return;
  }
  if (mime && folderAt >= 0 && folderAt === parts.length - 3) {
    out.entries.push({
      kind: 'folder',
      key: parts[folderAt + 1].trim(),
      path,
      file: toFile(filename, mime),
    });
    return;
  }
  out.ignored.push(path);
}

/**
 * Descomprime y clasifica. Lo que no sigue la convención va a `ignored`.
 */
export async function readImportZip(file: File): Promise<ZipImportContent> {
  const { unzip } = await import('fflate');
  const buffer = new Uint8Array(await file.arrayBuffer());
  const files = await new Promise<Record<string, Uint8Array>>(
    (resolve, reject) => {
      unzip(buffer, (err, data) => (err ? reject(err) : resolve(data)));
    },
  );

  const out: ZipImportContent = { entries: [], ignored: [] };
  for (const [path, bytes] of Object.entries(files)) {
    if (path.endsWith('/')) {
      continue;
    }
    classify(
      path,
      (filename, mime) =>
        new File([bytes as BlobPart], filename, { type: mime }),
      out,
    );
  }
  return out;
}

/**
 * Clasifica los archivos de una carpeta elegida con `webkitdirectory`.
 *
 * @remarks No lee el contenido: cada archivo se sube recién al confirmar.
 */
export function readImportFolder(files: File[]): ZipImportContent {
  const out: ZipImportContent = { entries: [], ignored: [] };
  for (const file of files) {
    const path = file.webkitRelativePath || file.name;
    classify(
      path,
      (filename, mime) =>
        file.type === mime ? file : new File([file], filename, { type: mime }),
      out,
    );
  }
  return out;
}
