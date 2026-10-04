'use client';

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type MouseEvent,
} from 'react';
import { AdminModal } from '@/components/AdminModal';
import { Panel } from '@/components/AdminUi';
import { FolderMarkdown } from '@/components/FolderMarkdown';
import { ApiClientError } from '@/lib/api/client';
import {
  createFolderFile,
  createFolderLabel,
  createFolderNote,
  deleteFolderItem,
  downloadFolderFile,
  folderItemName,
  listFolderItems,
  listFolderLabels,
  FOLDER_MAX_FILE_BYTES,
  FOLDER_MAX_ITEMS,
  FOLDER_NOTE_BODY_MAX,
  FOLDER_NOTE_TITLE_MAX,
  type FolderItemDetail,
  type FolderLabelDetail,
  type FolderOwnerKind,
} from '@/lib/api/folder';

const FOLDER_FILE_ACCEPT =
  'application/pdf,image/jpeg,image/png,image/webp,image/gif';

/**
 * Selector de PDF o imagen con el mismo lenguaje visual que la foto de ficha.
 *
 * @remarks También lo usan los comprobantes de gastos (mismos tipos y tope).
 */
export function FolderFileUpload({
  file,
  onFileSelect,
  onReject,
  disabled,
}: {
  file: File | null;
  onFileSelect: (file: File | null) => void;
  onReject?: (message: string) => void;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const isPdf =
    file != null &&
    (file.type === 'application/pdf' ||
      file.name.toLowerCase().endsWith('.pdf'));

  useEffect(() => {
    if (!file || isPdf) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file, isPdf]);

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const next = e.target.files?.[0];
    if (!next) {
      return;
    }
    if (next.size > FOLDER_MAX_FILE_BYTES) {
      onReject?.('El archivo supera 5 MB.');
      e.target.value = '';
      return;
    }
    onFileSelect(next);
  }

  function handleClear(e: MouseEvent) {
    e.stopPropagation();
    onFileSelect(null);
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  }

  function handleReplace(e: MouseEvent) {
    e.stopPropagation();
    inputRef.current?.click();
  }

  const editButtons = (
    <div className="image-upload-overlay">
      <button
        type="button"
        className="image-upload-icon-btn"
        onClick={handleReplace}
        disabled={disabled}
        title="Cambiar archivo"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z" />
          <path d="m15 5 4 4" />
        </svg>
      </button>
      <button
        type="button"
        className="image-upload-icon-btn danger"
        onClick={handleClear}
        disabled={disabled}
        title="Quitar archivo"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M3 6h18" />
          <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
          <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
          <path d="M10 11v6" />
          <path d="M14 11v6" />
        </svg>
      </button>
    </div>
  );

  return (
    <div className="image-upload">
      <span className="muted small">PDF o imagen (máx. 5 MB)</span>
      {previewUrl ? (
        <div
          className="image-upload-preview"
          onClick={() => inputRef.current?.click()}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={previewUrl} alt="" className="image-upload-thumb" />
          {editButtons}
        </div>
      ) : isPdf && file ? (
        <div className="folder-file-pdf" onClick={() => inputRef.current?.click()}>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
            <path d="M14 2v4a2 2 0 0 0 2 2h4" />
            <path d="M10 9H8" />
            <path d="M16 13H8" />
            <path d="M16 17H8" />
          </svg>
          <span className="folder-file-pdf-name">{file.name}</span>
          {editButtons}
        </div>
      ) : (
        <div
          className="folder-file-empty"
          onClick={() => inputRef.current?.click()}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M5 12h14" />
            <path d="M12 5v14" />
          </svg>
          <strong>Elegir archivo</strong>
          <span className="muted small">PDF, JPG, PNG, WebP o GIF</span>
        </div>
      )}
      <input
        ref={inputRef}
        type="file"
        accept={FOLDER_FILE_ACCEPT}
        onChange={handleChange}
        disabled={disabled}
        hidden
      />
    </div>
  );
}

/**
 * Modal de carpeta: notas y files del socio o del staff.
 *
 * @remarks CU-FOL-001. Carga solo staff. Layout alineado a la ficha (Panel + admin-form).
 */
export function PersonFolderModal({
  kind,
  ownerId,
}: {
  kind: FolderOwnerKind;
  ownerId: string;
}) {
  const [items, setItems] = useState<FolderItemDetail[]>([]);
  const [labels, setLabels] = useState<FolderLabelDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [noteBody, setNoteBody] = useState('');
  const [noteTitle, setNoteTitle] = useState('');
  const [labelId, setLabelId] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [viewNote, setViewNote] = useState<FolderItemDetail | null>(null);
  const atCapacity = items.length >= FOLDER_MAX_ITEMS;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [list, labs] = await Promise.all([
        listFolderItems(kind, ownerId),
        listFolderLabels(),
      ]);
      setItems(list);
      setLabels(labs);
      setError(null);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'No se pudo cargar');
    } finally {
      setLoading(false);
    }
  }, [kind, ownerId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function addNote() {
    const body = noteBody.trim();
    if (!body || items.length >= FOLDER_MAX_ITEMS) {
      return;
    }
    setBusy(true);
    try {
      await createFolderNote(kind, ownerId, {
        body,
        title: noteTitle.trim() || undefined,
        labelId: labelId || undefined,
      });
      setNoteBody('');
      setNoteTitle('');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar nota');
    } finally {
      setBusy(false);
    }
  }

  async function addLabel() {
    const name = newLabel.trim();
    if (!name) {
      return;
    }
    setBusy(true);
    try {
      const created = await createFolderLabel(name);
      setLabels((prev) =>
        [...prev, created].sort((a, b) => a.name.localeCompare(b.name)),
      );
      setLabelId(created.id);
      setNewLabel('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear etiqueta');
    } finally {
      setBusy(false);
    }
  }

  async function addFile() {
    if (!file || items.length >= FOLDER_MAX_ITEMS) {
      return;
    }
    setBusy(true);
    try {
      await createFolderFile(kind, ownerId, file, {
        labelId: labelId || undefined,
      });
      setFile(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al subir');
    } finally {
      setBusy(false);
    }
  }

  async function remove(itemId: string) {
    if (!window.confirm('¿Eliminar este ítem?')) {
      return;
    }
    setBusy(true);
    try {
      await deleteFolderItem(kind, ownerId, itemId);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al borrar');
    } finally {
      setBusy(false);
    }
  }

  async function openFile(item: FolderItemDetail) {
    try {
      const blob = await downloadFolderFile(kind, ownerId, item.id);
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al abrir');
    }
  }

  return (
    <div className="admin-stack">
      {error ? <p className="error">{error}</p> : null}
      {loading ? <p className="muted">Cargando…</p> : null}
      <p className="muted small">
        {items.length} / {FOLDER_MAX_ITEMS} ítems (nota o archivo). Máx. 5 MB
        por file.
      </p>
      {atCapacity ? (
        <p className="warn">
          Carpeta llena. Eliminá un ítem para cargar otro.
        </p>
      ) : null}

      <Panel title="Etiqueta">
        <div className="admin-form">
          <label>
            Usar etiqueta
            <select
              value={labelId}
              onChange={(e) => setLabelId(e.target.value)}
              disabled={busy}
            >
              <option value="">Sin etiqueta</option>
              {labels.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Nueva etiqueta
            <input
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              disabled={busy}
              maxLength={80}
            />
          </label>
          <button
            type="button"
            className="btn ghost"
            onClick={() => void addLabel()}
            disabled={busy || !newLabel.trim()}
          >
            Crear etiqueta
          </button>
        </div>
      </Panel>

      <Panel title="Nota">
        <div className="admin-form">
          <label>
            Título (opcional)
            <input
              value={noteTitle}
              onChange={(e) => setNoteTitle(e.target.value)}
              disabled={busy || atCapacity}
              maxLength={FOLDER_NOTE_TITLE_MAX}
            />
          </label>
          <label>
            Texto (Markdown)
            <textarea
              value={noteBody}
              onChange={(e) => setNoteBody(e.target.value)}
              rows={8}
              disabled={busy || atCapacity}
              maxLength={FOLDER_NOTE_BODY_MAX}
              placeholder={'# Título\n\n- Lunes: pecho\n- Miércoles: piernas'}
            />
          </label>
          <p className="muted small">
            Títulos con #, listas con - o 1., **negrita**. El asistente va a
            escribir en el mismo formato.
          </p>
          <button
            type="button"
            className="primary"
            onClick={() => void addNote()}
            disabled={busy || atCapacity || !noteBody.trim()}
          >
            Guardar nota
          </button>
        </div>
      </Panel>

      <Panel title="Archivo">
        <div className="admin-form">
          <FolderFileUpload
            file={file}
            onFileSelect={setFile}
            onReject={setError}
            disabled={busy || atCapacity}
          />
          <button
            type="button"
            className="primary"
            onClick={() => void addFile()}
            disabled={busy || atCapacity || !file}
          >
            Subir archivo
          </button>
        </div>
      </Panel>

      <Panel title="Contenido">
        {items.length === 0 && !loading ? (
          <p className="muted">Vacío.</p>
        ) : (
          <ul className="folder-item-list">
            {items.map((it) => {
              const name = folderItemName(it);
              return (
                <li key={it.id} className="folder-item">
                  <strong>{name}</strong>
                  <p className="muted small">
                    {new Date(it.createdAt).toLocaleString()}
                    {it.createdByName ? ` · ${it.createdByName}` : ''}
                  </p>
                  <div className="folder-item-actions">
                    <button
                      type="button"
                      className="btn ghost"
                      onClick={() => {
                        if (it.kind === 'NOTE') {
                          setViewNote(it);
                        } else {
                          void openFile(it);
                        }
                      }}
                      disabled={busy}
                    >
                      Abrir
                    </button>
                    <button
                      type="button"
                      className="btn danger"
                      onClick={() => void remove(it.id)}
                      disabled={busy}
                    >
                      Eliminar
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>

      <AdminModal
        elevated
        open={Boolean(viewNote)}
        onClose={() => setViewNote(null)}
        title={viewNote?.title?.trim() || 'Nota'}
        size="comfortable"
      >
        {viewNote ? <FolderMarkdown source={viewNote.body ?? ''} /> : null}
      </AdminModal>
    </div>
  );
}
