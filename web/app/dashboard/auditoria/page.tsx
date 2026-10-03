'use client';

import { useCallback, useEffect, useState } from 'react';
import { AdminShell } from '@/components/AdminShell';
import {
  DataTable,
  ListSearchField,
  ListToolbar,
  listCountDescription,
} from '@/components/AdminList';
import { AdminModal } from '@/components/AdminModal';
import { RequireStaff } from '@/components/RequireStaff';
import {
  IconView,
  RowActions,
  RowIconButton,
} from '@/components/RowActions';
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
 * @remarks Requiere permiso API `audit.read`. Detalle en modal (alineado al resto del Admin).
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
  const [selected, setSelected] = useState<AuditEventDetail | null>(null);

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
    let cancelled = false;
    void (async () => {
      if (cancelled) return;
      await load();
    })();
    return () => {
      cancelled = true;
    };
  }, [load]);

  return (
    <AdminShell title="Auditoría">
      <ListToolbar hint="Eventos del gym (quién hizo qué). Requiere permiso audit.read.">
        <ListSearchField
          label="Buscar acción"
          value={qInput}
          onChange={setQInput}
          onSubmit={() => {
            setPage(1);
            setSelected(null);
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
          setSelected(null);
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
          <tr key={row.id}>
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
            <td>
              <RowActions>
                <RowIconButton
                  label="Ver detalle"
                  onClick={() => setSelected(row)}
                >
                  <IconView />
                </RowIconButton>
              </RowActions>
            </td>
          </tr>
        ))}
      </DataTable>

      <AdminModal
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        title="Detalle del evento"
        description={
          selected
            ? `${formatWhen(selected.createdAt)} · ${selected.action}`
            : undefined
        }
        size="wide"
      >
        {selected ? (
          <>
            <p className="muted small">
              {formatActor(selected.actorProfile)} · actorId:{' '}
              {selected.actorId}
              <br />
              {selected.entityType}
              {selected.entityId ? ` · entityId: ${selected.entityId}` : ''}
            </p>
            <div className="audit-detail-grid">
              <div>
                <p className="muted small">Antes</p>
                <pre className="audit-json">{formatJson(selected.before)}</pre>
              </div>
              <div>
                <p className="muted small">Después</p>
                <pre className="audit-json">{formatJson(selected.after)}</pre>
              </div>
            </div>
          </>
        ) : null}
      </AdminModal>
    </AdminShell>
  );
}
