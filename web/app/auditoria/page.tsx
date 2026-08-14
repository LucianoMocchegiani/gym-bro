'use client';

import { Fragment, useCallback, useEffect, useState } from 'react';
import { AdminShell } from '@/components/AdminShell';
import {
  DataTable,
  ListSearchField,
  ListToolbar,
  listCountDescription,
} from '@/components/AdminList';
import { RequireStaff } from '@/components/RequireStaff';
import { listAuditEvents } from '@/lib/api/audit';
import type { AuditEventDetail } from '@/lib/api/audit';
import { ApiClientError } from '@/lib/api/client';

const PAGE_SIZE = 20;

function formatWhen(iso: string): string {
  return new Intl.DateTimeFormat('es-AR', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: 'America/Argentina/Buenos_Aires',
  }).format(new Date(iso));
}

function formatActor(profile: AuditEventDetail['actorProfile']): string {
  switch (profile) {
    case 'STAFF':
      return 'Staff';
    case 'SUPER':
      return 'Super';
    case 'MEMBER':
      return 'Afiliado';
    default:
      return profile;
  }
}

function formatJson(value: unknown): string {
  if (value === null || value === undefined) {
    return 'Sin datos';
  }
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

/**
 * Lectura de auditoría del gym (CU-ROL-007 / RN-ROL-008).
 *
 * @remarks Requiere permiso API `audit.read`.
 */
export default function AuditoriaPage() {
  return (
    <RequireStaff>
      <AuditoriaInner />
    </RequireStaff>
  );
}

function AuditoriaInner() {
  const [qInput, setQInput] = useState('');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<AuditEventDetail[]>([]);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listAuditEvents({
        q: q || undefined,
        page,
        pageSize: PAGE_SIZE,
        order: 'desc',
        orderBy: 'createdAt',
      });
      setRows(data.items);
      setTotal(data.total);
      setHasMore(data.hasMore);
      setError(null);
    } catch (err) {
      setRows([]);
      setTotal(0);
      setHasMore(false);
      setError(
        err instanceof ApiClientError
          ? err.message
          : 'No se pudieron cargar los eventos',
      );
    } finally {
      setLoading(false);
    }
  }, [page, q]);

  useEffect(() => {
    // Fetch remoto al cambiar página/filtro.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga API
    void load();
  }, [load]);

  function toggleExpand(id: string) {
    setExpandedId((prev) => (prev === id ? null : id));
  }

  return (
    <AdminShell title="Auditoría">
      <ListToolbar hint="Eventos del gym (quién hizo qué). Requiere permiso audit.read.">
        <ListSearchField
          label="Buscar acción"
          value={qInput}
          onChange={setQInput}
          onSubmit={() => {
            setPage(1);
            setExpandedId(null);
            setQ(qInput.trim());
          }}
          placeholder="ej. contract, refund, waitlist"
        />
      </ListToolbar>

      <DataTable
        title="Eventos"
        description={listCountDescription(total, page, 'evento', 'eventos')}
        loading={loading}
        error={error}
        isEmpty={rows.length === 0}
        emptyText="Sin eventos con ese filtro."
        page={page}
        hasMore={hasMore}
        onPageChange={(p) => {
          setExpandedId(null);
          setPage(p);
        }}
        header={
          <>
            <th>Cuándo</th>
            <th>Acción</th>
            <th>Entidad</th>
            <th>Actor</th>
            <th />
          </>
        }
      >
        {rows.map((row) => (
          <Fragment key={row.id}>
            <tr>
              <td>{formatWhen(row.createdAt)}</td>
              <td>
                <code>{row.action}</code>
              </td>
              <td>
                {row.entityType}
                {row.entityId ? ` · ${row.entityId.slice(0, 8)}…` : ''}
              </td>
              <td>
                {formatActor(row.actorProfile)} · {row.actorId.slice(0, 8)}…
              </td>
              <td className="row-actions">
                <button
                  type="button"
                  className="btn ghost"
                  onClick={() => toggleExpand(row.id)}
                >
                  {expandedId === row.id ? 'Ocultar' : 'Detalle'}
                </button>
              </td>
            </tr>
            {expandedId === row.id ? (
              <tr className="audit-detail-row">
                <td colSpan={5}>
                  <div className="audit-detail-grid">
                    <div>
                      <p className="muted small">Antes</p>
                      <pre className="audit-json">{formatJson(row.before)}</pre>
                    </div>
                    <div>
                      <p className="muted small">Después</p>
                      <pre className="audit-json">{formatJson(row.after)}</pre>
                    </div>
                  </div>
                  <p className="muted small">
                    entityId: {row.entityId ?? '—'} · actorId: {row.actorId}
                  </p>
                </td>
              </tr>
            ) : null}
          </Fragment>
        ))}
      </DataTable>
    </AdminShell>
  );
}
