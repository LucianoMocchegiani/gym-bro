'use client';

import { FormEvent, useEffect, useState } from 'react';
import { AdminShell } from '@/components/AdminShell';
import { AdminGrid, Panel } from '@/components/AdminUi';
import { RequireStaff } from '@/components/RequireStaff';
import { SkeletonForm } from '@/components/Skeleton';
import { ApiClientError } from '@/lib/api/client';
import {
  listNotificationTemplates,
  upsertNotificationTemplate,
} from '@/lib/api/notification-templates';
import type { NotificationTemplateDetail } from '@/lib/api/notification-templates';
import { useAuth } from '@/lib/auth/AuthProvider';
import { hasAnyPermission } from '@/lib/nav-permissions';

/**
 * Sistema → Avisos: plantillas email/in-app por evento (CU-NOT-002).
 */
export default function AvisosPage() {
  return (
    <RequireStaff>
      <AvisosInner />
    </RequireStaff>
  );
}

function AvisosInner() {
  const { session } = useAuth();
  const canWrite = hasAnyPermission(session?.permissionCodes, [
    'tenant.settings.write',
  ]);

  const [templates, setTemplates] = useState<NotificationTemplateDetail[] | null>(
    null,
  );
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busyCode, setBusyCode] = useState<string | null>(null);
  const [flashCode, setFlashCode] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveOk, setSaveOk] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const rows = await listNotificationTemplates();
        if (!cancelled) {
          setTemplates(rows);
          setLoadError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setLoadError(
            err instanceof ApiClientError
              ? err.message
              : 'No se pudieron cargar las plantillas',
          );
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  function patchLocal(
    eventCode: string,
    patch: Partial<
      Pick<NotificationTemplateDetail, 'subject' | 'body' | 'active'>
    >,
  ) {
    setTemplates((prev) =>
      prev
        ? prev.map((t) =>
            t.eventCode === eventCode ? { ...t, ...patch } : t,
          )
        : prev,
    );
  }

  async function onSave(e: FormEvent, row: NotificationTemplateDetail) {
    e.preventDefault();
    if (!canWrite) {
      return;
    }
    setBusyCode(row.eventCode);
    setFlashCode(row.eventCode);
    setSaveError(null);
    setSaveOk(null);
    try {
      const updated = await upsertNotificationTemplate(row.eventCode, {
        subject: row.subject,
        body: row.body,
        active: row.active,
      });
      setTemplates((prev) =>
        prev
          ? prev.map((t) => (t.eventCode === updated.eventCode ? updated : t))
          : prev,
      );
      setSaveOk(updated.eventCode);
    } catch (err) {
      setSaveError(
        err instanceof ApiClientError
          ? err.message
          : 'No se pudo guardar la plantilla',
      );
    } finally {
      setBusyCode(null);
    }
  }

  return (
    <AdminShell
      title="Avisos"
      subtitle="Textos de email e in-app. Si desactivás un evento, no se envía ni queda en la bandeja del socio."
    >
      {loadError ? <p className="error">{loadError}</p> : null}
      {!templates && !loadError ? <SkeletonForm fields={4} /> : null}

      {templates ? (
        <AdminGrid>
          {templates.map((row) => (
            <Panel
              key={row.eventCode}
              title={row.label}
              description={
                <>
                  {row.customized ? 'Personalizada' : 'Predeterminada'}
                  {' · '}
                  Variables:{' '}
                  {row.placeholders.map((p) => `{{${p}}}`).join(', ')}
                </>
              }
              className="form-panel"
            >
              <form
                className="admin-form"
                onSubmit={(e) => void onSave(e, row)}
              >
                <label className="checkbox-row">
                  <input
                    type="checkbox"
                    checked={row.active}
                    disabled={!canWrite}
                    onChange={(e) =>
                      patchLocal(row.eventCode, { active: e.target.checked })
                    }
                  />
                  Evento activo
                </label>
                <label>
                  Asunto
                  <input
                    value={row.subject}
                    disabled={!canWrite}
                    maxLength={200}
                    required
                    onChange={(e) =>
                      patchLocal(row.eventCode, { subject: e.target.value })
                    }
                  />
                </label>
                <label>
                  Cuerpo
                  <textarea
                    value={row.body}
                    disabled={!canWrite}
                    maxLength={4000}
                    required
                    rows={4}
                    onChange={(e) =>
                      patchLocal(row.eventCode, { body: e.target.value })
                    }
                  />
                </label>
                {saveError && flashCode === row.eventCode ? (
                  <p className="error">{saveError}</p>
                ) : null}
                {saveOk === row.eventCode ? (
                  <p className="ok-msg">Guardado.</p>
                ) : null}
                {canWrite ? (
                  <button
                    type="submit"
                    className="primary"
                    disabled={busyCode !== null}
                  >
                    {busyCode === row.eventCode ? 'Guardando…' : 'Guardar'}
                  </button>
                ) : (
                  <p className="muted small">Solo lectura</p>
                )}
              </form>
            </Panel>
          ))}
        </AdminGrid>
      ) : null}
    </AdminShell>
  );
}
