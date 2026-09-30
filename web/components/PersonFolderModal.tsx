'use client';

import { useCallback, useEffect, useState } from 'react';
import { ImageUpload } from '@/components/ImageUpload';
import { ApiClientError } from '@/lib/api/client';
import {
  createFolderFile,
  createFolderLabel,
  createFolderNote,
  deleteFolderItem,
  downloadFolderFile,
  listFolderItems,
  listFolderLabels,
  type FolderItemDetail,
  type FolderLabelDetail,
  type FolderOwnerKind,
} from '@/lib/api/folder';

/**
 * Modal de carpeta: notas y files del socio o del staff.
 *
 * @remarks CU-FOL-001. Carga solo staff. Preview de imagen local; PDF por nombre.
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
  const [fileIsPdf, setFileIsPdf] = useState(false);
  const [busy, setBusy] = useState(false);

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
    if (!body) {
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
    if (!file) {
      return;
    }
    setBusy(true);
    try {
      await createFolderFile(kind, ownerId, file, {
        labelId: labelId || undefined,
      });
      setFile(null);
      setFileIsPdf(false);
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
    <div className="stack">
      {error ? <p className="err-msg">{error}</p> : null}
      {loading ? <p className="muted">Cargando…</p> : null}

      <div className="form-row">
        <label>
          Etiqueta
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
          className="btn secondary"
          onClick={() => void addLabel()}
          disabled={busy || !newLabel.trim()}
        >
          Crear etiqueta
        </button>
      </div>

      <label>
        Título (opcional)
        <input
          value={noteTitle}
          onChange={(e) => setNoteTitle(e.target.value)}
          disabled={busy}
        />
      </label>
      <label>
        Nota
        <textarea
          value={noteBody}
          onChange={(e) => setNoteBody(e.target.value)}
          rows={4}
          disabled={busy}
        />
      </label>
      <button
        type="button"
        className="btn"
        onClick={() => void addNote()}
        disabled={busy || !noteBody.trim()}
      >
        Guardar nota
      </button>

      <p className="muted small">Archivo (PDF o imagen, máx. 10 MB)</p>
      {fileIsPdf && file ? (
        <p className="muted">{file.name}</p>
      ) : (
        <ImageUpload
          label="Imagen"
          onFileSelect={(f) => {
            setFile(f);
            setFileIsPdf(false);
          }}
          disabled={busy}
        />
      )}
      <label className="muted small">
        O PDF
        <input
          type="file"
          accept="application/pdf"
          disabled={busy}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (!f) {
              return;
            }
            setFile(f);
            setFileIsPdf(true);
          }}
        />
      </label>
      <button
        type="button"
        className="btn"
        onClick={() => void addFile()}
        disabled={busy || !file}
      >
        Subir archivo
      </button>

      <h3 className="muted">Contenido</h3>
      {items.length === 0 && !loading ? (
        <p className="muted">Vacío.</p>
      ) : (
        <ul className="stack">
          {items.map((it) => (
            <li key={it.id}>
              <strong>
                {it.kind === 'NOTE' ? 'Nota' : it.originalFilename ?? 'Archivo'}
              </strong>
              {it.label ? ` · ${it.label.name}` : ''}
              {it.title && it.kind === 'NOTE' ? ` — ${it.title}` : ''}
              {it.kind === 'NOTE' && it.body ? (
                <p className="muted">{it.body}</p>
              ) : null}
              <p className="muted small">
                {new Date(it.createdAt).toLocaleString()}
                {it.createdByName ? ` · ${it.createdByName}` : ''}
              </p>
              <div className="btn-row">
                {it.kind === 'FILE' ? (
                  <button
                    type="button"
                    className="btn secondary"
                    onClick={() => void openFile(it)}
                    disabled={busy}
                  >
                    Abrir
                  </button>
                ) : null}
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
          ))}
        </ul>
      )}
    </div>
  );
}
