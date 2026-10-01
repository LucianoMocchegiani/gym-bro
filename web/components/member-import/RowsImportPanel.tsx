'use client';

import { useMemo, useState } from 'react';
import { Panel } from '@/components/AdminUi';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { ImportFilePicker } from '@/components/member-import/ImportFilePicker';
import { ApiClientError } from '@/lib/api/client';
import {
  IMPORT_ROWS_PER_BATCH,
  finishMemberImport,
  importRowsBatch,
  previewImportRows,
  startMemberImport,
  type ImportItemResult,
  type ImportPreviewRow,
  type ImportRowInput,
  type MemberImportDetail,
} from '@/lib/api/member-imports';
import {
  IMPORT_FIELDS,
  buildImportRows,
  chunk,
  downloadCsv,
  readSpreadsheet,
  suggestMapping,
  toSavedMapping,
  type FieldSource,
  type ImportFieldKey,
  type ImportMapping,
  type SavedMapping,
  type SheetTable,
} from '@/lib/member-import/sheet';

type Step = 'pick' | 'map' | 'preview' | 'running' | 'done';

type RowOutcome = {
  rowNumber: number;
  email: string;
  name: string;
  result: string;
  reason: string;
};

function errorText(err: unknown, fallback: string): string {
  if (err instanceof ApiClientError || err instanceof Error) {
    return err.message;
  }
  return fallback;
}

function normalizeDoc(value?: string): string {
  return (value ?? '').replace(/[.\s-]/g, '').toUpperCase();
}

/**
 * Repetidos dentro de toda la planilla (la API solo ve un lote a la vez).
 */
function splitDuplicates(rows: ImportRowInput[]): {
  unique: ImportRowInput[];
  duplicates: ImportPreviewRow[];
} {
  const byEmail = new Map<string, number>();
  const byDoc = new Map<string, number>();
  const unique: ImportRowInput[] = [];
  const duplicates: ImportPreviewRow[] = [];
  for (const row of rows) {
    const email = row.email?.trim().toLowerCase() ?? '';
    const doc = normalizeDoc(row.document);
    const firstEmail = email ? byEmail.get(email) : undefined;
    const firstDoc = doc ? byDoc.get(doc) : undefined;
    if (firstEmail !== undefined) {
      duplicates.push({
        rowNumber: row.rowNumber,
        status: 'error',
        reason: `Mail repetido en la planilla (fila ${firstEmail})`,
      });
      continue;
    }
    if (firstDoc !== undefined) {
      duplicates.push({
        rowNumber: row.rowNumber,
        status: 'error',
        reason: `DNI repetido en la planilla (fila ${firstDoc})`,
      });
      continue;
    }
    if (email) byEmail.set(email, row.rowNumber);
    if (doc) byDoc.set(doc, row.rowNumber);
    unique.push(row);
  }
  return { unique, duplicates };
}

/**
 * Paso 1 de la migración: fichas desde Excel/CSV.
 *
 * @remarks RN-MIG-001..004. Mapeo columna → campo, vista previa sin escribir,
 * alta por lotes. Re-subir el mismo archivo omite a los que ya están.
 */
export function RowsImportPanel({
  savedMapping,
  onFinished,
}: {
  savedMapping: SavedMapping | null;
  onFinished: (detail: MemberImportDetail) => void;
}) {
  const [step, setStep] = useState<Step>('pick');
  const [file, setFile] = useState<File | null>(null);
  const [sheets, setSheets] = useState<SheetTable[]>([]);
  const [sheetIndex, setSheetIndex] = useState(0);
  const [headerRow, setHeaderRow] = useState(1);
  const [mapping, setMapping] = useState<ImportMapping | null>(null);
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
    () => (mapping ? buildImportRows(table, headerRow, mapping) : []),
    [table, headerRow, mapping],
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

  const missingRequired = IMPORT_FIELDS.filter(
    (f) => f.required && !mapping?.[f.key],
  );

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
      setMapping(
        suggestMapping(parsed[firstWithData]?.rows[0] ?? [], savedMapping),
      );
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
    setMapping(suggestMapping(sheets[index]?.rows[0] ?? [], savedMapping));
    setPreview(null);
  }

  function changeHeaderRow(value: number) {
    const row = Math.max(1, Math.min(value || 1, Math.max(1, table.length)));
    setHeaderRow(row);
    setMapping(suggestMapping(table[row - 1] ?? [], savedMapping));
    setPreview(null);
  }

  function setField(key: ImportFieldKey, source: FieldSource) {
    setMapping((m) => (m ? { ...m, [key]: source } : m));
    setPreview(null);
  }

  async function runPreview() {
    setBusy(true);
    setError(null);
    try {
      const out: ImportPreviewRow[] = [...split.duplicates];
      for (const batch of batches) {
        out.push(...(await previewImportRows(batch)));
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
      if (!id && mapping) {
        const started = await startMemberImport({
          kind: 'ROWS',
          filename: file?.name ?? 'planilla',
          totalRows: allRows.length,
          mapping: toSavedMapping(mapping, headers),
        });
        id = started.id;
        setImportId(id);
      }
      if (!id) return;
      for (let i = fromBatch; i < batches.length; i++) {
        const res = await importRowsBatch(id, batches[i]);
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
          email: src?.email ?? '',
          name: src?.name ?? '',
          result: labels[r.status] ?? r.status,
          reason: r.reason ?? '',
        };
      });
  }

  function downloadOutcomes(name: string, list: RowOutcome[]) {
    downloadCsv(name, [
      ['Fila', 'Email', 'Nombre', 'Resultado', 'Motivo'],
      ...list.map((o) => [
        String(o.rowNumber),
        o.email,
        o.name,
        o.result,
        o.reason,
      ]),
    ]);
  }

  function reset() {
    setStep('pick');
    setFile(null);
    setSheets([]);
    setMapping(null);
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
        linked: preview.filter((p) => p.status === 'new' && p.linkedAccount)
          .length,
        exists: preview.filter((p) => p.status === 'exists').length,
        errors: preview.filter((p) => p.status === 'error').length,
      }
    : null;
  const previewProblems = preview
    ? outcomes(
        preview.filter((p) => p.status !== 'new'),
        { exists: 'Ya existe', error: 'Error' },
      )
    : [];
  const resultProblems = outcomes(
    [...split.duplicates, ...results].filter((r) => r.status !== 'created'),
    { skipped: 'Omitido', error: 'Error' },
  );

  return (
    <Panel
      title="1. Fichas de afiliados"
      description="Excel (.xlsx) o CSV, una fila por socio. Mail obligatorio. Los nuevos entran con la contraseña ChangeMe123! (la cambian desde la app o entrando con Google)."
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

        {(step === 'map' || step === 'preview') && mapping ? (
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
                <span>Campo Faciliter</span>
                <span>Viene de</span>
                <span>Ejemplo</span>
              </div>
              {IMPORT_FIELDS.map((field) => {
                const src = mapping[field.key];
                const selectValue =
                  src?.kind === 'column'
                    ? String(src.index)
                    : src?.kind === 'fixed'
                      ? 'fixed'
                      : '';
                const sample =
                  src?.kind === 'column'
                    ? (table[headerRow]?.[src.index] ?? '')
                    : src?.kind === 'fixed'
                      ? src.value
                      : '';
                return (
                  <div key={field.key} className="import-map-row">
                    <div className="import-map-field">
                      <strong>
                        {field.label}
                        {field.required ? ' *' : ''}
                      </strong>
                      {field.hint ? (
                        <span className="muted small">{field.hint}</span>
                      ) : null}
                    </div>
                    <div className="import-map-source">
                      <select
                        aria-label={`Columna para ${field.label}`}
                        value={selectValue}
                        onChange={(e) => {
                          const v = e.target.value;
                          if (v === '') setField(field.key, null);
                          else if (v === 'fixed')
                            setField(field.key, { kind: 'fixed', value: '' });
                          else
                            setField(field.key, {
                              kind: 'column',
                              index: Number(v),
                            });
                        }}
                      >
                        <option value="">— No importar —</option>
                        {headers.map((h, i) => (
                          <option key={i} value={i}>
                            {h}
                          </option>
                        ))}
                        <option value="fixed">Valor fijo…</option>
                      </select>
                      {src?.kind === 'fixed' ? (
                        <input
                          aria-label={`Valor fijo para ${field.label}`}
                          value={src.value}
                          placeholder="Mismo valor para todas las filas"
                          onChange={(e) =>
                            setField(field.key, {
                              kind: 'fixed',
                              value: e.target.value,
                            })
                          }
                        />
                      ) : null}
                    </div>
                    <div className="import-map-sample muted small">
                      <span className="import-map-sample-label">Ej.: </span>
                      {sample || '—'}
                    </div>
                  </div>
                );
              })}
            </div>

            <p className="muted small">
              {allRows.length} filas con datos
              {split.duplicates.length
                ? ` · ${split.duplicates.length} repetidas en la planilla`
                : ''}
            </p>

            <div className="admin-modal-actions">
              <button
                type="button"
                className="btn"
                disabled={busy || missingRequired.length > 0 || !allRows.length}
                onClick={() => void runPreview()}
              >
                {busy ? 'Revisando…' : 'Revisar'}
              </button>
            </div>
            {missingRequired.length ? (
              <p className="muted small">
                Falta mapear: {missingRequired.map((f) => f.label).join(', ')}
              </p>
            ) : null}
          </>
        ) : null}

        {step === 'preview' && previewCounts ? (
          <>
            <div className="stat-row import-stats">
              <Panel className="stat-card">
                <p className="muted small">Se crean</p>
                <p className="stat-value">{previewCounts.news}</p>
              </Panel>
              <Panel className="stat-card">
                <p className="muted small">Ya tenían cuenta Faciliter</p>
                <p className="stat-value">{previewCounts.linked}</p>
              </Panel>
              <Panel className="stat-card">
                <p className="muted small">Ya son socios (se omiten)</p>
                <p className="stat-value">{previewCounts.exists}</p>
              </Panel>
              <Panel className="stat-card">
                <p className="muted small">Con error</p>
                <p className="stat-value">{previewCounts.errors}</p>
              </Panel>
            </div>
            {previewCounts.linked ? (
              <p className="muted small">
                Los que ya tenían cuenta Faciliter (otro gym) conservan su
                contraseña.
              </p>
            ) : null}
            {previewProblems.length ? (
              <>
                <ProblemsTable rows={previewProblems} />
                <button
                  type="button"
                  className="btn ghost"
                  onClick={() =>
                    downloadOutcomes('revision-afiliados.csv', previewProblems)
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
                Importar {previewCounts.news} afiliados
              </button>
            </div>
          </>
        ) : null}

        {step === 'running' ? (
          <>
            <p>
              Importando… lote {Math.min(batchIndex + 1, batches.length)} de{' '}
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
              Listo: {finished.createdCount} creados · {finished.skippedCount}{' '}
              omitidos · {finished.failedCount} con error
              {split.duplicates.length
                ? ` · ${split.duplicates.length} repetidos en la planilla`
                : ''}
              .
            </p>
            {resultProblems.length ? (
              <>
                <ProblemsTable rows={resultProblems} />
                <button
                  type="button"
                  className="btn ghost"
                  onClick={() =>
                    downloadOutcomes('resultado-afiliados.csv', resultProblems)
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
        title="¿Importar afiliados?"
        description={`Se van a crear ${previewCounts?.news ?? 0} afiliados activos con la contraseña ChangeMe123!. No se mandan mails ni avisos.`}
        confirmWord="CONFIRMAR"
        confirmLabel="Importar"
        busy={busy}
        onConfirm={() => void runImport(0, null)}
        onCancel={() => setConfirmOpen(false)}
      />
    </Panel>
  );
}

function ProblemsTable({ rows }: { rows: RowOutcome[] }) {
  const shown = rows.slice(0, 100);
  return (
    <div className="table-wrap">
      <div className="table-scroll">
        <table className="data-table import-table">
          <thead>
            <tr>
              <th>Fila</th>
              <th>Email</th>
              <th>Nombre</th>
              <th>Resultado</th>
              <th>Motivo</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((r) => (
              <tr key={`${r.rowNumber}-${r.result}`}>
                <td>{r.rowNumber}</td>
                <td>{r.email || '—'}</td>
                <td>{r.name || '—'}</td>
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
