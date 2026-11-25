'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { AdminShell } from '@/components/AdminShell';
import { RequireStaff } from '@/components/RequireStaff';
import { ApiClientError, apiRequest } from '@/lib/api/client';
import { useAuth } from '@/lib/auth/AuthProvider';

type PlatformPlan = {
  id: string;
  name: string;
  price: number;
  billingPeriod: string;
  active: boolean;
  modules: string[];
};

export default function PlatformPlansPage() {
  return (
    <RequireStaff>
      <PlansInner />
    </RequireStaff>
  );
}

function PlansInner() {
  const { session } = useAuth();
  const [plans, setPlans] = useState<PlatformPlan[]>([]);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const canWrite = Boolean(session?.permissionCodes?.includes('platform.tenants.write'));

  useEffect(() => {
    let current = true;
    apiRequest<PlatformPlan[]>('/platform-plans')
      .then((data) => { if (current) setPlans(data); })
      .catch((err: unknown) => {
        if (current) setError(err instanceof ApiClientError ? err.message : 'No se pudieron cargar los planes');
      })
      .finally(() => { if (current) setLoading(false); });
    return () => { current = false; };
  }, []);

  async function save(event: FormEvent<HTMLFormElement>, plan: PlatformPlan) {
    event.preventDefault();
    const modules = (drafts[plan.id] ?? plan.modules.join(',')).split(',').map((module) => module.trim()).filter(Boolean);
    if (!modules.length) {
      setError('Cada plan debe tener al menos un módulo.');
      return;
    }
    setSavingId(plan.id);
    setError(null);
    setSuccess(null);
    try {
      const result = await apiRequest<{ packId: string; modules: string[] }>(
        `/platform-plans/${plan.id}/modules`,
        { method: 'PATCH', body: { modules } },
      );
      setPlans((current) => current.map((item) => item.id === plan.id ? { ...item, modules: result.modules } : item));
      setDrafts((current) => ({ ...current, [plan.id]: result.modules.join(', ') }));
      setSuccess(`Módulos guardados para ${plan.name}.`);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'No se pudieron guardar los módulos.');
    } finally {
      setSavingId(null);
    }
  }

  return (
    <AdminShell title="Planes de la plataforma" subtitle="Asigná módulos a los planes de Faciliter; el plan se crea o edita desde Packs.">
      <p className="muted">Usá claves separadas por comas (por ejemplo: club, ecommerce). Una clave nueva solo habilita funciones cuando la aplicación la implementa.</p>
      {error ? <p className="err-msg" role="alert">{error}</p> : null}
      {success ? <p className="ok-msg" role="status">{success}</p> : null}
      {loading ? <p className="muted">Cargando planes…</p> : plans.length === 0 ? <p className="muted">No hay planes de plataforma.</p> : (
        <div className="table-scroll">
          <table>
            <thead><tr><th>Plan</th><th>Estado</th><th>Módulos</th><th /></tr></thead>
            <tbody>{plans.map((plan) => (
              <tr key={plan.id}>
                <td>{plan.name}</td>
                <td>{plan.active ? 'Activo' : 'Inactivo'}</td>
                <td colSpan={2}>
                  <form onSubmit={(event) => void save(event, plan)}>
                    <label>
                      <span className="sr-only">Módulos de {plan.name}</span>
                      <input
                        value={drafts[plan.id] ?? plan.modules.join(', ')}
                        onChange={(event) => setDrafts((current) => ({ ...current, [plan.id]: event.target.value }))}
                        disabled={!canWrite || savingId === plan.id}
                        aria-label={`Módulos de ${plan.name}`}
                      />
                    </label>{' '}
                    <button className="btn btn-small" type="submit" disabled={!canWrite || savingId === plan.id}>
                      {savingId === plan.id ? 'Guardando…' : 'Guardar'}
                    </button>
                  </form>
                </td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
      {!canWrite ? <p className="muted">Tu rol permite ver los planes, pero no modificar sus módulos.</p> : null}
    </AdminShell>
  );
}
