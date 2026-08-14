'use client';

import { FormEvent, useEffect, useState } from 'react';
import { ApiClientError } from '@/lib/api/client';
import {
  createRecurrenceRule,
  DEFAULT_RECURRENCE_TIMEZONE,
} from '@/lib/api/recurrence-rules';
import type {
  RecurrenceRuleDetail,
  Weekday,
} from '@/lib/api/recurrence-rules';
import { listServices } from '@/lib/api/services';
import type { ServiceDetail } from '@/lib/api/services';
import { createSession } from '@/lib/api/sessions';
import type { SessionDetail } from '@/lib/api/sessions';
import {
  formatServiceType,
  fromDatetimeLocalValue,
} from '@/lib/catalog-labels';

type Mode = 'PUNTUAL' | 'RECURRENTE';

const WEEKDAY_OPTIONS: { value: Weekday; label: string }[] = [
  { value: 'MONDAY', label: 'L' },
  { value: 'TUESDAY', label: 'M' },
  { value: 'WEDNESDAY', label: 'X' },
  { value: 'THURSDAY', label: 'J' },
  { value: 'FRIDAY', label: 'V' },
  { value: 'SATURDAY', label: 'S' },
  { value: 'SUNDAY', label: 'D' },
];

function todayDateInput(): string {
  return new Date().toISOString().slice(0, 10);
}

function plusMonthsDateInput(months: number): string {
  const d = new Date();
  d.setUTCMonth(d.getUTCMonth() + months);
  return d.toISOString().slice(0, 10);
}

function normalizeTime(value: string): string {
  const [h = '0', m = '0'] = value.split(':');
  return `${h.padStart(2, '0')}:${m.padStart(2, '0')}`;
}

/**
 * Alta de sesión puntual o recurrencia (CU-SER-003/004), usable en modal.
 */
export function SessionCreateForm({
  onSuccessSession,
  onSuccessRule,
  onCancel,
}: {
  onSuccessSession: (created: SessionDetail) => void;
  onSuccessRule: (created: RecurrenceRuleDetail) => void;
  onCancel?: () => void;
}) {
  const [mode, setMode] = useState<Mode>('PUNTUAL');
  const [services, setServices] = useState<ServiceDetail[]>([]);
  const [serviceId, setServiceId] = useState('');
  const [startsAt, setStartsAt] = useState('');
  const [endsAt, setEndsAt] = useState('');
  const [capacity, setCapacity] = useState('10');
  const [weekdays, setWeekdays] = useState<Weekday[]>(['MONDAY', 'WEDNESDAY']);
  const [localStartTime, setLocalStartTime] = useState('08:00');
  const [durationMinutes, setDurationMinutes] = useState('60');
  const [startsOn, setStartsOn] = useState(todayDateInput);
  const [endsOn, setEndsOn] = useState(() => plusMonthsDateInput(2));
  const [loadError, setLoadError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const data = await listServices({
          type: 'POR_SESIONES',
          active: true,
          pageSize: 100,
        });
        if (cancelled) {
          return;
        }
        setServices(data.items);
        setLoadError(null);
      } catch (err) {
        if (cancelled) {
          return;
        }
        setLoadError(
          err instanceof ApiClientError
            ? err.message
            : 'No se pudieron cargar servicios',
        );
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  function toggleWeekday(day: Weekday) {
    setWeekdays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day],
    );
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (mode === 'PUNTUAL') {
        const created = await createSession({
          serviceId,
          startsAt: fromDatetimeLocalValue(startsAt),
          endsAt: fromDatetimeLocalValue(endsAt),
          capacity: Number(capacity),
        });
        onSuccessSession(created);
        return;
      }
      if (weekdays.length === 0) {
        setError('Elegí al menos un día de la semana');
        setBusy(false);
        return;
      }
      const created = await createRecurrenceRule({
        serviceId,
        weekdays,
        localStartTime: normalizeTime(localStartTime),
        durationMinutes: Number(durationMinutes),
        timezone: DEFAULT_RECURRENCE_TIMEZONE,
        startsOn,
        endsOn,
        capacity: Number(capacity),
      });
      onSuccessRule(created);
    } catch (err) {
      setError(
        err instanceof ApiClientError
          ? err.message
          : mode === 'PUNTUAL'
            ? 'No se pudo crear la sesión'
            : 'No se pudo crear la recurrencia',
      );
    } finally {
      setBusy(false);
    }
  }

  if (loadError) {
    return <p className="error">{loadError}</p>;
  }

  return (
    <form className="admin-form" onSubmit={(e) => void onSubmit(e)}>
      <fieldset className="radio-row">
        <legend>Tipo</legend>
        <label className="checkbox-row">
          <input
            type="radio"
            name="mode"
            checked={mode === 'PUNTUAL'}
            onChange={() => setMode('PUNTUAL')}
          />
          Puntual
        </label>
        <label className="checkbox-row">
          <input
            type="radio"
            name="mode"
            checked={mode === 'RECURRENTE'}
            onChange={() => setMode('RECURRENTE')}
          />
          Recurrente
        </label>
      </fieldset>

      <label>
        Servicio (por sesiones)
        <select
          value={serviceId}
          onChange={(e) => setServiceId(e.target.value)}
          required
        >
          <option value="">Elegir…</option>
          {services.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} ({formatServiceType(s.type)})
            </option>
          ))}
        </select>
      </label>

      {mode === 'PUNTUAL' ? (
        <>
          <label>
            Inicio
            <input
              type="datetime-local"
              value={startsAt}
              onChange={(e) => setStartsAt(e.target.value)}
              required
            />
          </label>
          <label>
            Fin
            <input
              type="datetime-local"
              value={endsAt}
              onChange={(e) => setEndsAt(e.target.value)}
              required
            />
          </label>
        </>
      ) : (
        <>
          <p className="muted small">
            Genera sesiones futuras (máx. 6 meses). Zona horaria:{' '}
            {DEFAULT_RECURRENCE_TIMEZONE}. Desactivar la regla no cancela las ya
            creadas.
          </p>
          <div className="weekday-row" role="group" aria-label="Días">
            {WEEKDAY_OPTIONS.map((opt) => (
              <label key={opt.value} className="checkbox-row">
                <input
                  type="checkbox"
                  checked={weekdays.includes(opt.value)}
                  onChange={() => toggleWeekday(opt.value)}
                />
                {opt.label}
              </label>
            ))}
          </div>
          <label>
            Hora de inicio
            <input
              type="time"
              value={localStartTime}
              onChange={(e) => setLocalStartTime(e.target.value)}
              required
            />
          </label>
          <label>
            Duración (minutos)
            <input
              type="number"
              min={1}
              max={1440}
              step={1}
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(e.target.value)}
              required
            />
          </label>
          <label>
            Desde
            <input
              type="date"
              value={startsOn}
              onChange={(e) => setStartsOn(e.target.value)}
              required
            />
          </label>
          <label>
            Hasta
            <input
              type="date"
              value={endsOn}
              onChange={(e) => setEndsOn(e.target.value)}
              required
            />
          </label>
        </>
      )}

      <label>
        Cupo
        <input
          type="number"
          min={1}
          step={1}
          value={capacity}
          onChange={(e) => setCapacity(e.target.value)}
          required
        />
      </label>

      {error ? <p className="error">{error}</p> : null}

      <div className="form-actions">
        {onCancel ? (
          <button type="button" className="btn ghost" onClick={onCancel}>
            Cancelar
          </button>
        ) : null}
        <button type="submit" className="primary" disabled={busy}>
          {busy
            ? 'Guardando…'
            : mode === 'PUNTUAL'
              ? 'Crear sesión'
              : 'Crear recurrencia'}
        </button>
      </div>
    </form>
  );
}
