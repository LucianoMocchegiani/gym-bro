'use client';

import { FormEvent, useEffect, useState } from 'react';
import { AccessResultBanner } from '@/components/AccessResult';
import { AdminGrid, Panel } from '@/components/AdminUi';
import { MemberPicker } from '@/components/MemberPicker';
import { manualPass } from '@/lib/api/access';
import type {
  AccessVerifyResult,
  ManualPassMotive,
} from '@/lib/api/access';
import { ApiClientError } from '@/lib/api/client';
import { getMemberAccount } from '@/lib/api/members';

const MOTIVES: { value: ManualPassMotive; label: string }[] = [
  { value: 'deuda', label: 'Deuda' },
  { value: 'olvido_celular', label: 'Olvido de celular' },
  { value: 'cortesia', label: 'Cortesía' },
  { value: 'otro', label: 'Otro' },
];

type SessionOption = {
  sessionId: string;
  label: string;
};

function formatSessionWhen(iso: string): string {
  return new Date(iso).toLocaleString('es-AR', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: 'America/Argentina/Buenos_Aires',
  });
}

/**
 * Formulario de pase manual (CU-ACC-004) embebible en tabs de Puerta.
 */
export function DoorManualPassPanel({
  onPassRegistered,
}: {
  /** Tras un pase OK (p. ej. refrescar historial). */
  onPassRegistered?: () => void;
}) {
  const [memberId, setMemberId] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [sessionOptions, setSessionOptions] = useState<SessionOption[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [sessionsHint, setSessionsHint] = useState<string | null>(null);
  const [motiveCode, setMotiveCode] = useState<ManualPassMotive>('cortesia');
  const [note, setNote] = useState('');
  const [result, setResult] = useState<AccessVerifyResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!memberId) {
      setSessionOptions([]);
      setSessionId('');
      setSessionsHint(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      setSessionsLoading(true);
      setSessionId('');
      setSessionsHint(null);
      try {
        const account = await getMemberAccount(memberId);
        if (cancelled) {
          return;
        }
        const options = account.reservations
          .filter((r) => r.status === 'CONFIRMED')
          .map((r) => ({
            sessionId: r.sessionId,
            label: `${r.serviceName} — ${formatSessionWhen(r.startsAt)}`,
          }));
        setSessionOptions(options);
        if (options.length === 0) {
          setSessionsHint(
            'Este afiliado no tiene reservas confirmadas próximas. Podés registrar el pase sin sesión, o primero reservale una clase.',
          );
        }
      } catch {
        if (!cancelled) {
          setSessionOptions([]);
          setSessionsHint(
            'No se pudieron cargar las reservas del afiliado. Podés seguir sin sesión.',
          );
        }
      } finally {
        if (!cancelled) {
          setSessionsLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [memberId]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!memberId) {
      setError('Elegí un afiliado');
      return;
    }
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const res = await manualPass(memberId, {
        motiveCode,
        note: note.trim() || undefined,
        sessionId: sessionId || undefined,
      });
      setResult(res);
      setNote('');
      setSessionId('');
      onPassRegistered?.();
    } catch (err) {
      setError(
        err instanceof ApiClientError
          ? err.message
          : 'No se pudo registrar el pase',
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <AdminGrid className="door-dashboard">
      <Panel
        title="Autorizar ingreso"
        description="El pase manual omite las reglas automáticas y queda auditado."
      >
        <form className="admin-form" onSubmit={(e) => void onSubmit(e)}>
          <MemberPicker
            label="Afiliado"
            value={memberId}
            onChange={setMemberId}
            autoFocus
          />

          <label>
            Sesión (opcional)
            <select
              value={sessionId}
              onChange={(e) => setSessionId(e.target.value)}
              disabled={sessionsLoading}
            >
              <option value="">Sin sesión</option>
              {sessionOptions.map((s) => (
                <option key={s.sessionId} value={s.sessionId}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
          <p className="muted small">
            No es el listado de clases del día: solo reservas confirmadas de este
            afiliado (clases que aún no terminaron). Si elegís sesión, marca
            presente.
          </p>
          {sessionsHint ? (
            <p className="muted small">{sessionsHint}</p>
          ) : null}

          <label>
            Motivo
            <select
              value={motiveCode}
              onChange={(e) =>
                setMotiveCode(e.target.value as ManualPassMotive)
              }
            >
              {MOTIVES.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </label>

          <label>
            Nota (opcional)
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              maxLength={500}
            />
          </label>

          {error ? <p className="error">{error}</p> : null}

          <button
            type="submit"
            className="primary"
            disabled={busy || !memberId}
          >
            {busy ? 'Registrando…' : 'Registrar ingreso'}
          </button>
        </form>
      </Panel>

      <AccessResultBanner
        result={result}
        emptyText="El pase autorizado aparecerá acá."
      />
    </AdminGrid>
  );
}
