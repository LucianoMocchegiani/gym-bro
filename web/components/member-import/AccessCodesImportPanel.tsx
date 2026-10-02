'use client';

import { useMemo, useState } from 'react';
import { Panel } from '@/components/AdminUi';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { ImportFilePicker } from '@/components/member-import/ImportFilePicker';
import { ApiClientError } from '@/lib/api/client';
import {
  IMPORT_ROWS_PER_BATCH,
  finishMemberImport,
  importAccessCodesBatch,
  previewAccessCodes,
  startMemberImport,
  type AccessCodeRowInput,
  type ImportItemResult,
  type ImportPreviewRow,
  type MemberImportDetail,
} from '@/lib/api/member-imports';
import {
  chunk,
  downloadCsv,
  findColumn,
  readSpreadsheet,
  type SheetTable,
} from '@/lib/member-import/sheet';

type Step = 'pick' | 'map' | 'preview' | 'running' | 'done';

type ColumnKey = 'document' | 'email' | 'externalId';

type Columns = Record<ColumnKey, number | null>;

type RowOutcome = {
  rowNumber: number;
  document: string;
  email: string;
  externalId: string;
  result: string;
  reason: string;
};

const COLUMN_FIELDS: { key: ColumnKey; label: string; synonyms: string[] }[] = [
  {
    key: 'document',
    label: 'DNI del socio',
    synonyms: ['dni', 'documento', 'doc', 'nrodocumento', 'nrodoc', 'cuit', 'cuil'],
  },
  {
    key: 'email',
    label: 'Mail del socio',
    synonyms: ['email', 'mail', 'correo', 'e-mail'],
  },
  {
    key: 'externalId',
    label: 'Número del aparato *',
    synonyms: ['numeroaparato', 'userid', 'idusuario', 'acno', 'pin', 'tarjeta', 'codigo', 'numero'],
  },
];

function errorText(err: unknown, fallback: string): string {
  if (err instanceof ApiClientError || err instanceof Error) {
    return err.message;
  }
  return fallback;
}

function suggestColumns(headers: string[]): Columns {
  const used: number[] = [];
  const out: Columns = { document: null, email: null, externalId: null };
  for (const field of COLUMN_FIELDS) {
    const idx = findColumn(headers, field.synonyms, used);
    out[field.key] = idx;
    if (idx !== null) used.push(idx);
  }
  return out;
}

function buildRows(
  table: string[][],
  headerRow: number,
  columns: Columns,
): AccessCodeRowInput[] {
  const read = (row: string[], idx: number | null) =>
    idx === null ? '' : (row[idx] ?? '').trim();
  const out: AccessCodeRowInput[] = [];
  for (let i = headerRow; i < table.length; i++) {
    const row = table[i];
    if (!row || row.every((c) => !c?.trim())) continue;
    out.push({
      rowNumber: i + 1,
      document: read(row, columns.document) || undefined,
      email: read(row, columns.email) || undefined,
      externalId: read(row, columns.externalId) || undefined,
    });
  }
  return out;
}

/** Número repetido en toda la planilla (la API solo ve un lote a la vez). */
function splitDuplicates(rows: AccessCodeRowInput[]): {
  unique: AccessCodeRowInput[];
  duplicates: ImportPreviewRow[];
} {
  const seen = new Map<string, number>();
  const unique: AccessCodeRowInput[] = [];
  const duplicates: ImportPreviewRow[] = [];
  for (const row of rows) {
    const code = row.externalId?.trim() ?? '';
    const first = code ? seen.get(code) : undefined;
    if (first !== undefined) {
      duplicates.push({
        rowNumber: row.rowNumber,
        status: 'error',
        reason: `Número repetido en la planilla (fila ${first})`,
      });
      continue;
    }
    if (code) seen.set(code, row.rowNumber);
    unique.push(row);
  }
  return { unique, duplicates };
}

/**
 * Paso 3 de la migración (solo gym ZKTeco): números del aparato → socio.
 *
 * @remarks RN-MIG-006. Socio por DNI o mail. Vista previa sin escribir, alta
 * por lotes; re-subir la planilla omite los vínculos que ya están.
 */
export function AccessCodesImportPanel({
  onFinished,
}: {
  onFinished: (detail: MemberImportDetail) => void;
}) {
  const [step, setStep] = useState<Step>('pick');
  const [file, setFile] = useState<File | null>(null);
  const [sheets, setSheets] = useState<SheetTable[]>([]);
  const [sheetIndex, setSheetIndex] = useState(0);
  const [headerRow, setHeaderRow] = useState(1);
  const [columns, setColumns] = useState<Columns | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<ImportPreviewRow[] | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [importId, setImportId] = useState<string | null>(null);
  const [batchIndex, setBatchIndex] = useState(0);
  const [results, setResults] = useState<ImportItemResult[]>([]);
  const [finished, setFinished] = useState<MemberImportDetail | null>(null);

  const table = useMemo(
    () => sheets[sheetIndex]?.rows ?? [],
    [sheets, sheetIndex],
  );
  const headers = useMemo(
    () => (table[headerRow - 1] ?? []).map((h, i) => h || `Columna ${i + 1}`),
    [table, headerRow],
  );
  const allRows = useMemo(
    () => (columns ? buildRows(table, headerRow, columns) : []),
    [table, headerRow, columns],
  );
  const split = useMemo(() => splitDuplicates(allRows), [allRows]);
  const batches = useMemo(
    () => chunk(split.unique, IMPORT_ROWS_PER_BATCH),
    [split.unique],
  );
  const rowsByNumber = useMemo(
    () => new Map(allRows.map((r) => [r.rowNumber, r])),
    [allRows],
  );

  const canReview =
    columns !== null &&
    columns.externalId !== null &&
    (columns.document !== null || columns.email !== null);

  async function onPickFile(picked: File | null) {
    setError(null);
    setFile(picked);
    if (!picked) return;
    setBusy(true);
    try {
      const parsed = await readSpreadsheet(picked);
      const firstWithData = Math.max(
        0,
        parsed.findIndex((s) => s.rows.length > 1),
      );
      setSheets(parsed);
      setSheetIndex(firstWithData);
      setHeaderRow(1);
      setColumns(suggestColumns(parsed[firstWithData]?.rows[0] ?? []));
      setPreview(null);
      setStep('map');
    } catch (err) {
      setError(errorText(err, 'No se pudo leer el archivo'));
    } finally {
      setBusy(false);
    }
  }

  function changeSheet(index: number) {
    setSheetIndex(index);
    setHeaderRow(1);
    setColumns(suggestColumns(sheets[index]?.rows[0] ?? []));
    setPreview(null);
  }

  function changeHeaderRow(value: number) {
    const row = Math.max(1, Math.min(value || 1, Math.max(1, table.length)));
    setHeaderRow(row);
    setColumns(suggestColumns(table[row - 1] ?? []));
    setPreview(null);
  }

  function setColumn(key: ColumnKey, value: string) {
    setColumns((c) => (c ? { ...c, [key]: value === '' ? null : Number(value) } : c));
    setPreview(null);
  }

  async function runPreview() {
    setBusy(true);
    setError(null);
    try {
      const out: ImportPreviewRow[] = [...split.duplicates];
      for (const batch of batches) {
        out.push(...(await previewAccessCodes(batch)));
      }
      out.sort((a, b) => a.rowNumber - b.rowNumber);
      setPreview(out);
      setStep('preview');
    } catch (err) {
      setError(errorText(err, 'No se pudo revisar la planilla'));
    } finally {
      setBusy(false);
    }
  }

  async function runImport(fromBatch: number, currentId: string | null) {
    setConfirmOpen(false);
    setStep('running');
    setBusy(true);
    setError(null);
    let id = currentId;
    try {
      if (!id && columns) {
        const started = await startMemberImport({
          kind: 'ACCESS_CODES',
          filename: file?.name ?? 'planilla',
          totalRows: allRows.length,
          mapping: Object.fromEntries(
            COLUMN_FIELDS.map((f) => {
              const idx = columns[f.key];
              return [f.key, idx === null ? null : { header: headers[idx] ?? '' }];
            }),
          ),
        });
        id = started.id;
        setImportId(id);
      }
      if (!id) return;
      for (let i = fromBatch; i < batches.length; i++) {
        const res = await importAccessCodesBatch(id, batches[i]);
        setResults((prev) => [...prev, ...res]);
        setBatchIndex(i + 1);
      }
      const done = await finishMemberImport(id);
      setFinished(done);
      setStep('done');
      onFinished(done);
    } catch (err) {
      setError(
        `${errorText(err, 'Se cortó la importación')}. Podés reintentar: sigue desde el lote donde quedó.`,
      );
    } finally {
      setBusy(false);
    }
  }

  function outcomes(
    items: { rowNumber?: number; status: string; reason?: string }[],
    labels: Record<string, string>,
  ): RowOutcome[] {
    return items
      .filter((r) => r.rowNumber !== undefined)
      .map((r) => {
        const src = rowsByNumber.get(r.rowNumber ?? 0);
        return {
          rowNumber: r.rowNumber ?? 0,
          document: src?.document ?? '',
          email: src?.email ?? '',
          externalId: src?.externalId ?? '',
          result: labels[r.status] ?? r.status,
          reason: r.reason ?? '',
        };
      });
  }

  function downloadOutcomes(name: string, list: RowOutcome[]) {
    downloadCsv(name, [
      ['Fila', 'DNI', 'Mail', 'Número', 'Resultado', 'Motivo'],
      ...list.map((o) => [
        String(o.rowNumber),
        o.document,
        o.email,
        o.externalId,
        o.result,
        o.reason,
      ]),
    ]);
  }

  function reset() {
    setStep('pick');
    setFile(null);
    setSheets([]);
    setColumns(null);
    setPreview(null);
    setImportId(null);
    setBatchIndex(0);
    setResults([]);
    setFinished(null);
    setError(null);
  }

  const previewCounts = preview
    ? {
        news: preview.filter((p) => p.status === 'new').length,
        exists: preview.filter((p) => p.status === 'exists').length,
        errors: preview.filter((p) => p.status === 'error').length,
      }
    : null;
  const previewProblems = preview
    ? outcomes(
        preview.filter((p) => p.status !== 'new'),
        { exists: 'Ya estaba', error: 'Error' },
      )
    : [];
  const resultProblems = outcomes(
    [...split.duplicates, ...results].filter((r) => r.status !== 'created'),
    { skipped: 'Omitido', error: 'Error' },
  );

  return (
    <Panel
      title="3. Números del aparato ZKTeco"
      description="Excel (.xlsx) o CSV con el DNI o el mail del socio y el número (ID de usuario) con el que está cargado en el aparato. Los socios tienen que estar importados antes (paso 1). Si el número es el mismo DNI, no hace falta: el acceso ya lo reconoce."
    >
      <div className="admin-form">
        {error ? <p className="err-msg">{error}</p> : null}

        {step === 'pick' || step === 'map' || step === 'preview' ? (
          <ImportFilePicker
            selected={file ? { name: file.name } : null}
            accept=".xlsx,.csv,.txt"
            hint="Excel (.xlsx) o CSV"
            disabled={busy}
            onPick={(picked) => void onPickFile(picked[0] ?? null)}
          />
        ) : null}

        {busy && step === 'pick' ? <p className="muted">Leyendo…</p> : null}

        {(step === 'map' || step === 'preview') && columns ? (
          <>
            <div className="import-map-controls">
              {sheets.length > 1 ? (
                <label>
                  Hoja
                  <select
                    value={sheetIndex}
                    onChange={(e) => changeSheet(Number(e.target.value))}
                  >
                    {sheets.map((s, i) => (
                      <option key={s.name + i} value={i}>
                        {s.name} ({s.rows.length} filas)
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
              <label>
                Fila de encabezados
                <input
                  type="number"
                  min={1}
                  value={headerRow}
                  onChange={(e) => changeHeaderRow(Number(e.target.value))}
                />
              </label>
            </div>

            <div className="import-map">
              <div className="import-map-head" aria-hidden>
                <span>Campo</span>
                <span>Viene de</span>
                <span>Ejemplo</span>
              </div>
              {COLUMN_FIELDS.map((field) => {
                const idx = columns[field.key];
                return (
                  <div key={field.key} className="import-map-row">
                    <div className="import-map-field">
                      <strong>{field.label}</strong>
                    </div>
                    <div className="import-map-source">
                      <select
                        aria-label={`Columna para ${field.label}`}
                        value={idx === null ? '' : String(idx)}
                        onChange={(e) => setColumn(field.key, e.target.value)}
                      >
                        <option value="">— No usar —</option>
                        {headers.map((h, i) => (
                          <option key={i} value={i}>
                            {h}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="import-map-sample muted small">
                      <span className="import-map-sample-label">Ej.: </span>
                      {idx === null ? '—' : table[headerRow]?.[idx] || '—'}
                    </div>
                  </div>
                );
              })}
            </div>

            <p className="muted small">
              {allRows.length} filas con datos
              {split.duplicates.length
                ? ` · ${split.duplicates.length} con número repetido en la planilla`
                : ''}
            </p>

            <div className="admin-modal-actions">
              <button
                type="button"
                className="btn"
                disabled={busy || !canReview || !allRows.length}
                onClick={() => void runPreview()}
              >
                {busy ? 'Revisando…' : 'Revisar'}
              </button>
            </div>
            {!canReview ? (
              <p className="muted small">
                Elegí la columna del número y la del DNI o la del mail.
              </p>
            ) : null}
          </>
        ) : null}

        {step === 'preview' && previewCounts ? (
          <>
            <div className="stat-row import-stats">
              <Panel className="stat-card">
                <p className="muted small">Se vinculan</p>
                <p className="stat-value">{previewCounts.news}</p>
              </Panel>
              <Panel className="stat-card">
                <p className="muted small">Ya estaban (se omiten)</p>
                <p className="stat-value">{previewCounts.exists}</p>
              </Panel>
              <Panel className="stat-card">
                <p className="muted small">Con error</p>
                <p className="stat-value">{previewCounts.errors}</p>
              </Panel>
            </div>
            {previewProblems.length ? (
              <>
                <OutcomesTable rows={previewProblems} />
                <button
                  type="button"
                  className="btn ghost"
                  onClick={() =>
                    downloadOutcomes('revision-numeros.csv', previewProblems)
                  }
                >
                  Descargar observaciones (CSV)
                </button>
              </>
            ) : null}
            <div className="admin-modal-actions">
              <button
                type="button"
                className="btn"
                disabled={busy || previewCounts.news === 0}
                onClick={() => setConfirmOpen(true)}
              >
                Vincular {previewCounts.news} números
              </button>
            </div>
          </>
        ) : null}

        {step === 'running' ? (
          <>
            <p>
              Vinculando… lote {Math.min(batchIndex + 1, batches.length)} de{' '}
              {batches.length}. No cierres esta pestaña.
            </p>
            <progress value={batchIndex} max={Math.max(1, batches.length)} />
            {!busy && error ? (
              <div className="admin-modal-actions">
                <button
                  type="button"
                  className="btn"
                  onClick={() => void runImport(batchIndex, importId)}
                >
                  Reintentar
                </button>
              </div>
            ) : null}
          </>
        ) : null}

        {step === 'done' && finished ? (
          <>
            <p className="ok-msg">
              Listo: {finished.createdCount} vinculados · {finished.skippedCount}{' '}
              ya estaban · {finished.failedCount} con error
              {split.duplicates.length
                ? ` · ${split.duplicates.length} repetidos en la planilla`
                : ''}
              .
            </p>
            {resultProblems.length ? (
              <>
                <OutcomesTable rows={resultProblems} />
                <button
                  type="button"
                  className="btn ghost"
                  onClick={() =>
                    downloadOutcomes('resultado-numeros.csv', resultProblems)
                  }
                >
                  Descargar omitidos y errores (CSV)
                </button>
              </>
            ) : null}
            <div className="admin-modal-actions">
              <button type="button" className="btn ghost" onClick={reset}>
                Importar otra planilla
              </button>
            </div>
          </>
        ) : null}
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title="¿Vincular números?"
        description={`Se van a vincular ${previewCounts?.news ?? 0} números del aparato a sus socios. Desde ese momento esos números dan acceso con las reglas del gym.`}
        confirmWord="CONFIRMAR"
        confirmLabel="Vincular"
        busy={busy}
        onConfirm={() => void runImport(0, null)}
        onCancel={() => setConfirmOpen(false)}
      />
    </Panel>
  );
}

function OutcomesTable({ rows }: { rows: RowOutcome[] }) {
  const shown = rows.slice(0, 100);
  return (
    <div className="table-wrap">
      <div className="table-scroll">
        <table className="data-table import-table">
          <thead>
            <tr>
              <th>Fila</th>
              <th>DNI</th>
              <th>Mail</th>
              <th>Número</th>
              <th>Resultado</th>
              <th>Motivo</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((r) => (
              <tr key={`${r.rowNumber}-${r.result}`}>
                <td>{r.rowNumber}</td>
                <td>{r.document || '—'}</td>
                <td>{r.email || '—'}</td>
                <td>{r.externalId || '—'}</td>
                <td>{r.result}</td>
                <td>{r.reason}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rows.length > shown.length ? (
        <p className="muted small">
          Mostrando 100 de {rows.length}. El CSV trae todas.
        </p>
      ) : null}
    </div>
  );
}
