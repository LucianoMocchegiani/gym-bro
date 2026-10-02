'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { Panel } from '@/components/AdminUi';
import { AdminShell } from '@/components/AdminShell';
import { AccessCodesImportPanel } from '@/components/member-import/AccessCodesImportPanel';
import { FilesImportPanel } from '@/components/member-import/FilesImportPanel';
import { RowsImportPanel } from '@/components/member-import/RowsImportPanel';
import { RequireStaff } from '@/components/RequireStaff';
import { ApiClientError } from '@/lib/api/client';
import {
  listMemberImports,
  type ImportKind,
  type MemberImportDetail,
} from '@/lib/api/member-imports';
import { useAuth } from '@/lib/auth/AuthProvider';
import type { SavedMapping } from '@/lib/member-import/sheet';
import { useAccessDoor } from '@/lib/use-access-door';

const IMPORT_CODES = ['members.import', 'members.write'] as const;

const IMPORT_KIND_LABELS: Record<ImportKind, string> = {
  ROWS: 'Fichas',
  FILES: 'Archivos',
  ACCESS_CODES: 'Números de acceso',
};

export default function ImportarAfiliadosPage() {
  return (
    <RequireStaff>
      <ImportarInner />
    </RequireStaff>
  );
}

/**
 * Migración de afiliados desde otro sistema (RN-MIG-001..005).
 *
 * @remarks Ficha + foto + carpeta; en gym ZKTeco, números del aparato
 * (RN-MIG-006). Sin packs, contratos, caja ni QR.
 */
function ImportarInner() {
  const { session } = useAuth();
  const codes = session?.permissionCodes;
  const allowed =
    codes == null || IMPORT_CODES.every((c) => codes.includes(c));

  const doorProvider = useAccessDoor();
  const [history, setHistory] = useState<MemberImportDetail[]>([]);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    try {
      setHistory(await listMemberImports());
      setHistoryError(null);
    } catch (err) {
      setHistoryError(
        err instanceof ApiClientError
          ? err.message
          : 'No se pudo cargar el historial',
      );
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (cancelled || !allowed) return;
      await load();
    })();
    return () => {
      cancelled = true;
    };
  }, [allowed, load]);

  const savedMapping =
    (history.find((h) => h.kind === 'ROWS' && h.mapping)?.mapping as
      | SavedMapping
      | undefined) ?? null;

  return (
    <AdminShell
      title="Importar afiliados"
      actions={
        <Link href="/afiliados" className="btn ghost">
          Volver
        </Link>
      }
    >
      {!allowed ? (
        <Panel>
          <p className="err-msg">
            Necesitás los permisos “Migrar afiliados” y “Alta y edición de
            ficha”. Pedíselos a un Admin del gym.
          </p>
        </Panel>
      ) : !loaded ? (
        <p className="muted">Cargando…</p>
      ) : (
        <>
          <RowsImportPanel
            savedMapping={savedMapping}
            onFinished={() => void load()}
          />
          <FilesImportPanel onFinished={() => void load()} />
          {doorProvider === 'ZKTECO' ? (
            <AccessCodesImportPanel onFinished={() => void load()} />
          ) : null}
          <Panel title="Últimas importaciones">
            {historyError ? <p className="err-msg">{historyError}</p> : null}
            {history.length === 0 ? (
              <p className="muted">Todavía no hay importaciones.</p>
            ) : (
              <div className="table-wrap table-scroll">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Fecha</th>
                      <th>Tipo</th>
                      <th>Archivo</th>
                      <th>Creados</th>
                      <th>Omitidos</th>
                      <th>Errores</th>
                      <th>Quién</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((h) => (
                      <tr key={h.id}>
                        <td>
                          {new Date(h.createdAt).toLocaleString('es-AR')}
                          {h.status === 'RUNNING' ? ' (sin terminar)' : ''}
                        </td>
                        <td>{IMPORT_KIND_LABELS[h.kind]}</td>
                        <td>{h.filename}</td>
                        <td>{h.createdCount}</td>
                        <td>{h.skippedCount}</td>
                        <td>{h.failedCount}</td>
                        <td>{h.createdByName ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>
        </>
      )}
    </AdminShell>
  );
}
