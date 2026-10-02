/**
 * Lectura de planilla (xlsx/csv) y mapeo de columnas → campos Faciliter.
 *
 * @remarks Todo corre en el navegador; a la API solo viajan filas ya mapeadas.
 */

import type { ImportRowInput } from '@/lib/api/member-imports';

export type SheetTable = { name: string; rows: string[][] };

export type ImportFieldKey =
  | 'email'
  | 'name'
  | 'lastName'
  | 'document'
  | 'phone'
  | 'status';

export type ImportField = {
  key: ImportFieldKey;
  label: string;
  required: boolean;
  hint?: string;
  synonyms: string[];
};

/** Campos Faciliter que se pueden mapear (RN-MIG-001: solo ficha). */
export const IMPORT_FIELDS: readonly ImportField[] = [
  {
    key: 'email',
    label: 'Email',
    required: true,
    hint: 'Sin mail la fila se omite.',
    synonyms: ['email', 'mail', 'correo', 'correoelectronico', 'emailaddress', 'e-mail'],
  },
  {
    key: 'name',
    label: 'Nombre',
    required: true,
    hint: 'Si viene separado, mapeá también Apellido.',
    synonyms: ['nombre', 'name', 'nombres', 'nombrecompleto', 'nombreyapellido', 'apellidoynombre', 'socio', 'afiliado', 'cliente'],
  },
  {
    key: 'lastName',
    label: 'Apellido',
    required: false,
    hint: 'Se agrega al nombre.',
    synonyms: ['apellido', 'apellidos', 'lastname', 'surname'],
  },
  {
    key: 'document',
    label: 'DNI / documento',
    required: false,
    synonyms: ['dni', 'documento', 'doc', 'nrodocumento', 'numerodocumento', 'cuit', 'cuil', 'cedula', 'document', 'nrodoc'],
  },
  {
    key: 'phone',
    label: 'Teléfono',
    required: false,
    synonyms: ['telefono', 'tel', 'celular', 'cel', 'movil', 'phone', 'whatsapp', 'telefonocelular'],
  },
  {
    key: 'status',
    label: 'Estado',
    required: false,
    hint: 'Activo / suspendido / baja. Vacío = activo.',
    synonyms: ['estado', 'status', 'situacion', 'activo', 'condicion'],
  },
];

/** Una columna de la planilla o un valor fijo para todas las filas. */
export type FieldSource =
  | { kind: 'column'; index: number }
  | { kind: 'fixed'; value: string }
  | null;

export type ImportMapping = Record<ImportFieldKey, FieldSource>;

/** Lo que se guarda en la corrida: por nombre de columna (el índice puede cambiar). */
export type SavedMapping = Partial<
  Record<ImportFieldKey, { header?: string; value?: string }>
>;

export function emptyMapping(): ImportMapping {
  return {
    email: null,
    name: null,
    lastName: null,
    document: null,
    phone: null,
    status: null,
  };
}

/**
 * Lee `.xlsx` o `.csv`. `.xls` viejo no: pedir "Guardar como" xlsx o csv.
 */
export async function readSpreadsheet(file: File): Promise<SheetTable[]> {
  const lower = file.name.toLowerCase();
  if (lower.endsWith('.xlsx')) {
    const { default: readXlsxFile } = await import('read-excel-file/browser');
    const sheets = await readXlsxFile(file);
    return sheets.map((s) => ({
      name: s.sheet,
      rows: s.data.map((row) => row.map((cell) => cellToText(cell))),
    }));
  }
  if (lower.endsWith('.csv') || lower.endsWith('.txt')) {
    const { default: Papa } = await import('papaparse');
    const text = await file.text();
    const parsed = Papa.parse<string[]>(text, { skipEmptyLines: 'greedy' });
    return [{ name: file.name, rows: parsed.data.map((r) => r.map((c) => String(c ?? '').trim())) }];
  }
  if (lower.endsWith('.xls')) {
    throw new Error(
      'Excel viejo (.xls) no soportado. Abrilo y guardalo como .xlsx o .csv.',
    );
  }
  throw new Error('Formato no soportado. Usá .xlsx o .csv.');
}

function cellToText(cell: unknown): string {
  if (cell === null || cell === undefined) {
    return '';
  }
  if (cell instanceof Date) {
    return cell.toISOString().slice(0, 10);
  }
  if (typeof cell === 'number') {
    return Number.isInteger(cell) ? cell.toFixed(0) : String(cell);
  }
  return String(cell).trim();
}

function normalizeHeader(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9@-]/g, '');
}

/**
 * Primera columna cuyo encabezado coincide (o contiene) algún sinónimo.
 *
 * @returns Índice de la columna o `null`.
 */
export function findColumn(
  headers: string[],
  synonyms: string[],
  skip: number[] = [],
): number | null {
  const normalized = headers.map(normalizeHeader);
  const wanted = synonyms.map(normalizeHeader);
  let idx = normalized.findIndex(
    (h, i) => !skip.includes(i) && wanted.includes(h),
  );
  if (idx < 0) {
    idx = normalized.findIndex(
      (h, i) => !skip.includes(i) && h && wanted.some((s) => h.includes(s)),
    );
  }
  return idx >= 0 ? idx : null;
}

/**
 * Sugiere el mapa: primero el guardado de la última corrida (por nombre de
 * columna), después por sinónimos del encabezado.
 */
export function suggestMapping(
  headers: string[],
  saved?: SavedMapping | null,
): ImportMapping {
  const mapping = emptyMapping();
  const normalized = headers.map(normalizeHeader);
  const used = new Set<number>();

  for (const field of IMPORT_FIELDS) {
    const prev = saved?.[field.key];
    if (prev?.value !== undefined) {
      mapping[field.key] = { kind: 'fixed', value: prev.value };
      continue;
    }
    if (prev?.header) {
      const idx = normalized.indexOf(normalizeHeader(prev.header));
      if (idx >= 0 && !used.has(idx)) {
        mapping[field.key] = { kind: 'column', index: idx };
        used.add(idx);
      }
    }
  }

  for (const field of IMPORT_FIELDS) {
    if (mapping[field.key]) {
      continue;
    }
    const synonyms = field.synonyms.map(normalizeHeader);
    let idx = normalized.findIndex(
      (h, i) => !used.has(i) && synonyms.includes(h),
    );
    if (idx < 0) {
      idx = normalized.findIndex(
        (h, i) => !used.has(i) && h && synonyms.some((s) => h.includes(s)),
      );
    }
    if (idx >= 0) {
      mapping[field.key] = { kind: 'column', index: idx };
      used.add(idx);
    }
  }
  return mapping;
}

/** Mapa para guardar en la corrida. */
export function toSavedMapping(
  mapping: ImportMapping,
  headers: string[],
): SavedMapping {
  const saved: SavedMapping = {};
  for (const field of IMPORT_FIELDS) {
    const src = mapping[field.key];
    if (src?.kind === 'column') {
      saved[field.key] = { header: headers[src.index] ?? '' };
    } else if (src?.kind === 'fixed') {
      saved[field.key] = { value: src.value };
    }
  }
  return saved;
}

/**
 * Arma las filas a enviar. `rowNumber` = número de fila en Excel (1-based).
 *
 * @param headerRow Fila de encabezados (1-based); los datos empiezan debajo.
 */
export function buildImportRows(
  table: string[][],
  headerRow: number,
  mapping: ImportMapping,
): ImportRowInput[] {
  const read = (row: string[], src: FieldSource): string => {
    if (!src) return '';
    if (src.kind === 'fixed') return src.value.trim();
    return (row[src.index] ?? '').trim();
  };
  const out: ImportRowInput[] = [];
  for (let i = headerRow; i < table.length; i++) {
    const row = table[i];
    if (!row || row.every((c) => !c?.trim())) {
      continue;
    }
    const first = read(row, mapping.name);
    const last = read(row, mapping.lastName);
    const name = [first, last].filter(Boolean).join(' ');
    out.push({
      rowNumber: i + 1,
      email: read(row, mapping.email) || undefined,
      name: name || undefined,
      document: read(row, mapping.document) || undefined,
      phone: read(row, mapping.phone) || undefined,
      status: read(row, mapping.status) || undefined,
    });
  }
  return out;
}

/** Corta un array en lotes. */
export function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    out.push(items.slice(i, i + size));
  }
  return out;
}

/** Descarga un CSV (UTF-8 con BOM para que Excel respete acentos). */
export function downloadCsv(filename: string, rows: string[][]): void {
  const escape = (v: string) =>
    /[",;\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
  const content = rows.map((r) => r.map(escape).join(',')).join('\r\n');
  const blob = new Blob(['\uFEFF', content], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
