'use client';

import { FormEvent, useEffect, useState } from 'react';
import { AccessResultBanner } from '@/components/AccessResult';
import { DoorShell } from '@/components/DoorShell';
import { RequireStaff } from '@/components/RequireStaff';
import { manualPass } from '@/lib/api/access';
import { ApiClientError } from '@/lib/api/client';
import { listMembers } from '@/lib/api/members';
import type {
  AccessVerifyResult,
  ManualPassMotive,
  MemberSummary,
} from '@/lib/api/types';

const MOTIVES: { value: ManualPassMotive; label: string }[] = [
  { value: 'deuda', label: 'Deuda' },
  { value: 'olvido_celular', label: 'Olvido de celular' },
  { value: 'cortesia', label: 'Cortesía' },
  { value: 'otro', label: 'Otro' },
];

/**
 * Pase manual en puerta (CU-ACC-004).
 */
export default function PaseManualPage() {
  return (
    <RequireStaff>
      <PaseManualInner />
    </RequireStaff>
  );
}

function PaseManualInner() {
  const [members, setMembers] = useState<MemberSummary[]>([]);
  const [memberId, setMemberId] = useState('');
  const [motiveCode, setMotiveCode] = useState<ManualPassMotive>('cortesia');
  const [note, setNote] = useState('');
  const [filter, setFilter] = useState('');
  const [result, setResult] = useState<AccessVerifyResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const rows = await listMembers('ACTIVE');
        setMembers(rows);
        if (rows[0]) {
          setMemberId(rows[0].id);
        }
      } catch (err) {
        setLoadError(
          err instanceof ApiClientError
            ? err.message
            : 'No se pudieron cargar afiliados',
        );
      }
    })();
  }, []);

  const filtered = members.filter((m) => {
    const q = filter.trim().toLowerCase();
    if (!q) {
      return true;
    }
    return (
      (m.name ?? '').toLowerCase().includes(q) ||
      m.email.toLowerCase().includes(q)
    );
  });

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
      });
      setResult(res);
      setNote('');
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
    <DoorShell title="Pase manual">
      <form className="verify-form" onSubmit={(e) => void onSubmit(e)}>
        {loadError ? <p className="error">{loadError}</p> : null}

        <label>
          Buscar afiliado
          <input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Nombre o email"
            autoComplete="off"
          />
        </label>

        <label>
          Afiliado
          <select
            value={memberId}
            onChange={(e) => setMemberId(e.target.value)}
            required
          >
            {filtered.map((m) => (
              <option key={m.id} value={m.id}>
                {(m.name ?? 'Sin nombre') + ` — ${m.email}`}
              </option>
            ))}
          </select>
        </label>

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

        <button type="submit" className="primary" disabled={busy || !memberId}>
          {busy ? 'Registrando…' : 'Registrar ingreso'}
        </button>
      </form>

      <AccessResultBanner result={result} />
    </DoorShell>
  );
}
