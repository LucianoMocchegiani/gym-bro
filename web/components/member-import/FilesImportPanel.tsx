'use client';

import { useState } from 'react';
import { Panel } from '@/components/AdminUi';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import {
  ImportFilePicker,
  type PickedSource,
} from '@/components/member-import/ImportFilePicker';
import { ApiClientError } from '@/lib/api/client';
import { FOLDER_MAX_FILE_BYTES, FOLDER_MAX_ITEMS } from '@/lib/api/folder';
import {
  IMPORT_MATCH_KEYS_PER_BATCH,
  finishMemberImport,
  importMemberFolderFile,
  importMemberPhoto,
  matchImportFiles,
  startMemberImport,
  type ImportFileMatch,
  type MemberImportDetail,
} from '@/lib/api/member-imports';
import { chunk, downloadCsv } from '@/lib/member-import/sheet';
import {
  readImportFolder,
  readImportZip,
  type ZipImportContent,
  type ZipImportEntry,
} from '@/lib/member-import/zip';

type Step = 'pick' | 'review' | 'running' | 'done';

type UploadTask = {
  entry: ZipImportEntry;
  memberId: string;
  memberName: string | null;
};

type FileProblem = { path: string; result: string; reason: string };

const CONCURRENCY = 3;

/** Misma normalización que la API (`member-import.rows.ts`). */
function normalizeKey(raw: string): string {
  const key = raw.trim();
  return key.includes('@')
    ? key.toLowerCase()
    : key.replace(/[.\s-]/g, '').toUpperCase();
}

function errorText(err: unknown, fallback: string): string {
  if (err instanceof ApiClientError || err instanceof Error) {
    return err.message;
  }
  return fallback;
}

/**
 * Arma qué se sube y qué no. Socio con foto o carpeta → no se le carga nada
 * (RN-MIG-005); re-subir el zip no duplica.
 */
function planUploads(
  entries: ZipImportEntry[],
  matches: Map<string, ImportFileMatch>,
): { tasks: UploadTask[]; problems: FileProblem[]; withFiles: number } {
  const tasks: UploadTask[] = [];
  const problems: FileProblem[] = [];
  const withFiles = new Set<string>();
  const photoTaken = new Set<string>();
  const folderUsed = new Map<string, number>();

  for (const entry of entries) {
    const match = matches.get(normalizeKey(entry.key));
    if (!match) {
      problems.push({
        path: entry.path,
        result: 'Omitido',
        reason: `No hay socio con DNI o mail "${entry.key}"`,
      });
      continue;
    }
    if (match.hasPhoto || match.folderCount > 0) {
      withFiles.add(match.memberId);
      problems.push({
        path: entry.path,
        result: 'Omitido',
        reason: 'El socio ya tiene archivos cargados: no se le cargó nada',
      });
      continue;
    }
    if (entry.file.size > FOLDER_MAX_FILE_BYTES) {
      problems.push({
        path: entry.path,
        result: 'Omitido',
        reason: 'Supera 5 MB',
      });
      continue;
    }
    if (entry.kind === 'photo') {
      if (photoTaken.has(match.memberId)) {
        problems.push({
          path: entry.path,
          result: 'Omitido',
          reason: 'Más de una foto para el mismo socio',
        });
        continue;
      }
      photoTaken.add(match.memberId);
    } else {
      const used = folderUsed.get(match.memberId) ?? match.folderCount;
      if (used >= FOLDER_MAX_ITEMS) {
        problems.push({
          path: entry.path,
          result: 'Omitido',
          reason: `La carpeta del socio llega a ${FOLDER_MAX_ITEMS} ítems`,
        });
        continue;
      }
      folderUsed.set(match.memberId, used + 1);
    }
    tasks.push({ entry, memberId: match.memberId, memberName: match.name });
  }
  return { tasks, problems, withFiles: withFiles.size };
}

/**
 * Paso 2 de la migración: zip con fotos de perfil y documentos de carpeta.
 *
 * @remarks RN-MIG-005. Requiere que las fichas ya estén cargadas (paso 1).
 */
export function FilesImportPanel({
  onFinished,
}: {
  onFinished: (detail: MemberImportDetail) => void;
}) {
  const [step, setStep] = useState<Step>('pick');
  const [source, setSource] = useState<{
    kind: 'zip' | 'folder';
    picked: PickedSource;
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ignored, setIgnored] = useState<string[]>([]);
  const [tasks, setTasks] = useState<UploadTask[]>([]);
  const [problems, setProblems] = useState<FileProblem[]>([]);
  const [withFiles, setWithFiles] = useState(0);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [doneCount, setDoneCount] = useState(0);
  const [runProblems, setRunProblems] = useState<FileProblem[]>([]);
  const [finished, setFinished] = useState<MemberImportDetail | null>(null);

  async function onPickZip(picked: File | null) {
    if (!picked) return;
    setSource({ kind: 'zip', picked: { name: picked.name } });
    await analyze(() => readImportZip(picked), 'No se pudo leer el zip');
  }

  async function onPickFolder(files: File[]) {
    if (files.length === 0) return;
    const root = files[0].webkitRelativePath.split('/')[0] || 'Carpeta';
    setSource({
      kind: 'folder',
      picked: { name: root, detail: `${files.length} archivos` },
    });
    await analyze(
      () => Promise.resolve(readImportFolder(files)),
      'No se pudo leer la carpeta',
    );
  }

  async function analyze(
    read: () => Promise<ZipImportContent>,
    fallback: string,
  ) {
    setError(null);
    setBusy(true);
    try {
      const content = await read();
      const keys = [...new Set(content.entries.map((e) => e.key))];
      const matches = new Map<string, ImportFileMatch>();
      for (const batch of chunk(keys, IMPORT_MATCH_KEYS_PER_BATCH)) {
        for (const m of await matchImportFiles(batch)) {
          matches.set(m.key, m);
        }
      }
      const plan = planUploads(content.entries, matches);
      setIgnored(content.ignored);
      setTasks(plan.tasks);
      setProblems(plan.problems);
      setWithFiles(plan.withFiles);
      setStep('review');
    } catch (err) {
      setError(errorText(err, fallback));
    } finally {
      setBusy(false);
    }
  }

  async function runUploads() {
    setConfirmOpen(false);
    setStep('running');
    setBusy(true);
    setError(null);
    setDoneCount(0);
    setRunProblems([]);
    try {
      const started = await startMemberImport({
        kind: 'FILES',
        filename: source?.picked.name ?? 'archivos',
        totalRows: tasks.length,
      });
      let next = 0;
      const worker = async () => {
        while (next < tasks.length) {
          const task = tasks[next++];
          try {
            const res =
              task.entry.kind === 'photo'
                ? await importMemberPhoto(
                    started.id,
                    task.memberId,
                    task.entry.file,
                  )
                : await importMemberFolderFile(
                    started.id,
                    task.memberId,
                    task.entry.file,
                  );
            if (res.status !== 'created') {
              setRunProblems((prev) => [
                ...prev,
                {
                  path: task.entry.path,
                  result: res.status === 'skipped' ? 'Omitido' : 'Error',
                  reason: res.reason ?? '',
                },
              ]);
            }
          } catch (err) {
            setRunProblems((prev) => [
              ...prev,
              {
                path: task.entry.path,
                result: 'Error',
                reason: errorText(err, 'No se pudo subir'),
              },
            ]);
          }
          setDoneCount((n) => n + 1);
        }
      };
      await Promise.all(
        Array.from({ length: Math.min(CONCURRENCY, tasks.length) }, worker),
      );
      const done = await finishMemberImport(started.id);
      setFinished(done);
      setStep('done');
      onFinished(done);
    } catch (err) {
      setError(errorText(err, 'Se cortó la subida'));
      setStep('review');
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    setStep('pick');
    setSource(null);
    setTasks([]);
    setProblems([]);
    setWithFiles(0);
    setIgnored([]);
    setRunProblems([]);
    setFinished(null);
    setError(null);
  }

  const photos = tasks.filter((t) => t.entry.kind === 'photo').length;
  const docs = tasks.length - photos;
  const allProblems = [
    ...problems,
    ...ignored.map((path) => ({
      path,
      result: 'Ignorado',
      reason: 'No sigue la convención fotos/ o carpeta/{dni o mail}/',
    })),
    ...runProblems,
  ];

  return (
    <Panel
      title="2. Fotos y carpeta"
      description={
        <>
          Una carpeta o un zip con <code>fotos/&#123;dni o mail&#125;.jpg</code>{' '}
          y <code>carpeta/&#123;dni o mail&#125;/archivo.pdf</code>. Primero
          importá las fichas. Al socio que ya tiene foto o algo en la carpeta no
          se le carga nada. La carpeta admite hasta {FOLDER_MAX_ITEMS} ítems de
          5 MB por socio.
        </>
      }
    >
      <div className="admin-form">
        {error ? <p className="err-msg">{error}</p> : null}

        {step === 'pick' || step === 'review' ? (
          <div className="import-source-grid">
            <ImportFilePicker
              selected={source?.kind === 'folder' ? source.picked : null}
              directory
              label="Elegir carpeta"
              hint="La carpeta que tiene fotos/ y carpeta/"
              disabled={busy}
              onPick={(files) => void onPickFolder(files)}
            />
            <ImportFilePicker
              selected={source?.kind === 'zip' ? source.picked : null}
              accept=".zip"
              label="Elegir zip"
              hint="Zip con fotos/ y carpeta/"
              disabled={busy}
              onPick={(files) => void onPickZip(files[0] ?? null)}
            />
          </div>
        ) : null}
        {busy && step === 'pick' ? (
          <p className="muted">Leyendo y cruzando con socios…</p>
        ) : null}

        {step === 'review' ? (
          <>
            <div className="stat-row">
              <Panel className="stat-card">
                <p className="muted small">Fotos a subir</p>
                <p className="stat-value">{photos}</p>
              </Panel>
              <Panel className="stat-card">
                <p className="muted small">Documentos a carpeta</p>
                <p className="stat-value">{docs}</p>
              </Panel>
              <Panel className="stat-card">
                <p className="muted small">Socios que ya tenían archivos</p>
                <p className="stat-value">{withFiles}</p>
              </Panel>
              <Panel className="stat-card">
                <p className="muted small">Archivos que se omiten</p>
                <p className="stat-value">{problems.length}</p>
              </Panel>
              <Panel className="stat-card">
                <p className="muted small">Ignorados</p>
                <p className="stat-value">{ignored.length}</p>
              </Panel>
            </div>
            {tasks.length === 0 ? (
              <p className="muted">
                {withFiles > 0
                  ? 'No hay nada para subir: los socios del zip ya tienen archivos cargados.'
                  : 'No hay nada para subir.'}
              </p>
            ) : null}
            {allProblems.length ? (
              <FileProblemsBlock rows={allProblems} />
            ) : null}
            <div className="admin-modal-actions">
              <button
                type="button"
                className="btn"
                disabled={busy || tasks.length === 0}
                onClick={() => setConfirmOpen(true)}
              >
                Subir {tasks.length} archivos
              </button>
            </div>
          </>
        ) : null}

        {step === 'running' ? (
          <>
            <p>
              Subiendo {doneCount} de {tasks.length}… No cierres esta pestaña.
            </p>
            <progress value={doneCount} max={Math.max(1, tasks.length)} />
          </>
        ) : null}

        {step === 'done' && finished ? (
          <>
            <p className="ok-msg">
              Listo: {finished.createdCount} subidos · {finished.skippedCount}{' '}
              omitidos · {finished.failedCount} con error.
            </p>
            {allProblems.length ? (
              <FileProblemsBlock rows={allProblems} />
            ) : null}
            <div className="admin-modal-actions">
              <button type="button" className="btn ghost" onClick={reset}>
                Subir otro zip
              </button>
            </div>
          </>
        ) : null}
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title="¿Subir fotos y documentos?"
        description={`${photos} fotos de perfil y ${docs} documentos a carpeta.`}
        confirmWord="CONFIRMAR"
        confirmLabel="Subir"
        busy={busy}
        onConfirm={() => void runUploads()}
        onCancel={() => setConfirmOpen(false)}
      />
    </Panel>
  );
}

function FileProblemsBlock({ rows }: { rows: FileProblem[] }) {
  const shown = rows.slice(0, 100);
  return (
    <>
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Archivo</th>
              <th>Resultado</th>
              <th>Motivo</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((r, i) => (
              <tr key={`${r.path}-${i}`}>
                <td>{r.path}</td>
                <td>{r.result}</td>
                <td>{r.reason}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length > shown.length ? (
          <p className="muted small">
            Mostrando 100 de {rows.length}. El CSV trae todos.
          </p>
        ) : null}
      </div>
      <button
        type="button"
        className="btn ghost"
        onClick={() =>
          downloadCsv('archivos-omitidos.csv', [
            ['Archivo', 'Resultado', 'Motivo'],
            ...rows.map((r) => [r.path, r.result, r.reason]),
          ])
        }
      >
        Descargar listado (CSV)
      </button>
    </>
  );
}
