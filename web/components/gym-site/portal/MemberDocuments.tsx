'use client';

import { useEffect, useState } from 'react';
import { AdminModal } from '@/components/AdminModal';
import { FolderMarkdown } from '@/components/FolderMarkdown';
import { ApiClientError } from '@/lib/api/client';
import { folderItemName, type FolderItemDetail } from '@/lib/api/folder';
import { downloadMyFolderFile, listMyFolder } from '@/lib/api/member-portal';

function errorText(err: unknown, fallback: string): string {
  return err instanceof ApiClientError ? err.message : fallback;
}

/** Nota o imagen abierta en el modal (la imagen ya descargada como object URL). */
type Viewer =
  | { kind: 'note'; item: FolderItemDetail }
  | { kind: 'image'; item: FolderItemDetail; url: string };

function itemMeta(it: FolderItemDetail): string {
  return [
    it.label?.name,
    new Date(it.createdAt).toLocaleDateString('es-AR'),
    it.createdByName,
  ]
    .filter(Boolean)
    .join(' · ');
}

function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Documentos del socio (CU-FOL-003): notas y archivos que le cargó el staff,
 * solo lectura, como «Mis documentos» de la app. Las notas y las imágenes se
 * ven acá; el resto (PDF) se descarga.
 */
export function MemberDocuments() {
  const [items, setItems] = useState<FolderItemDetail[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [viewer, setViewer] = useState<Viewer | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const rows = await listMyFolder();
        if (!cancelled) {
          setItems(rows);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(errorText(err, 'No se pudieron cargar tus documentos'));
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function open(it: FolderItemDetail) {
    if (it.kind === 'NOTE') {
      setViewer({ kind: 'note', item: it });
      return;
    }
    setBusyId(it.id);
    setError(null);
    try {
      const blob = await downloadMyFolderFile(it.id);
      if (it.mime?.startsWith('image/')) {
        setViewer({ kind: 'image', item: it, url: URL.createObjectURL(blob) });
      } else {
        saveBlob(blob, folderItemName(it));
      }
    } catch (err) {
      setError(errorText(err, 'No se pudo abrir el archivo'));
    } finally {
      setBusyId(null);
    }
  }

  function closeViewer() {
    if (viewer?.kind === 'image') {
      URL.revokeObjectURL(viewer.url);
    }
    setViewer(null);
  }

  return (
    <section className="mkt-inner mkt-section">
      <p className="eyebrow">Documentos</p>
      <h2 className="mkt-h2">Tus documentos</h2>
      <p className="muted">
        Rutinas, planes y archivos que te cargó el gym. Si falta algo, pedilo en
        recepción.
      </p>
      {error ? <p className="error">{error}</p> : null}
      {!items ? (
        error ? null : <p className="muted">Cargando documentos…</p>
      ) : items.length === 0 ? (
        <p className="muted">Todavía no tenés documentos.</p>
      ) : (
        <ul className="folder-item-list">
          {items.map((it) => (
            <li key={it.id} className="folder-item">
              <strong>{folderItemName(it)}</strong>
              <p className="muted small">{itemMeta(it)}</p>
              <div className="folder-item-actions">
                <button
                  type="button"
                  className="btn ghost small"
                  disabled={busyId === it.id}
                  onClick={() => void open(it)}
                >
                  {busyId === it.id
                    ? 'Abriendo…'
                    : it.kind === 'FILE' && !it.mime?.startsWith('image/')
                      ? 'Descargar'
                      : 'Ver'}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <AdminModal
        open={Boolean(viewer)}
        onClose={closeViewer}
        title={viewer ? folderItemName(viewer.item) : ''}
        size="comfortable"
      >
        {viewer?.kind === 'note' ? (
          <FolderMarkdown source={viewer.item.body ?? ''} />
        ) : viewer?.kind === 'image' ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={viewer.url}
            alt={folderItemName(viewer.item)}
            className="portal-doc-image"
          />
        ) : null}
      </AdminModal>
    </section>
  );
}
