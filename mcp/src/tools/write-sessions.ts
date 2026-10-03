import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { baYmd } from '../dates.js';
import { gymbroGet } from '../gymbro-client.js';
import type { ProposalLine } from '../proposals.js';
import { asRecord, pickNumber, pickString } from '../slim.js';
import {
  baLocalToIso,
  changeLine,
  dateTimeHuman,
  definedOnly,
  getRecord,
  isoToBaLocal,
  nameOf,
  ProposalError,
  proposeWrite,
  ymdHuman,
} from './write-support.js';

const LINKS = [{ href: '/sesiones', label: 'Sesiones' }];
const YMD = /^\d{4}-\d{2}-\d{2}$/;
const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;
const WEEKDAYS = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'] as const;
const WEEKDAY_LABEL: Record<(typeof WEEKDAYS)[number], string> = {
  MONDAY: 'lunes',
  TUESDAY: 'martes',
  WEDNESDAY: 'miércoles',
  THURSDAY: 'jueves',
  FRIDAY: 'viernes',
  SATURDAY: 'sábado',
  SUNDAY: 'domingo',
};

const dateSchema = z.string().regex(YMD).describe('Día YYYY-MM-DD (Buenos Aires).');
const timeSchema = z.string().regex(HHMM).describe('Hora local HH:mm (Buenos Aires).');
const durationSchema = z.number().int().min(1).max(1440).describe('Duración en minutos.');
const capacitySchema = z.number().int().min(1).describe('Cupo.');
const instructorSchema = z.string().uuid().describe('id de search_staff.');

/** Nombre del instructor si el staff puede verlo; si no, igual valida Nest al confirmar. */
async function instructorName(staffId: string): Promise<string> {
  try {
    const raw = asRecord(await gymbroGet(`/api/staff/${staffId}`));
    return raw ? nameOf(raw) : 'Instructor elegido';
  } catch {
    return 'Instructor elegido';
  }
}

function minutesBetween(fromIso: string, toIso: string): number {
  return Math.round((Date.parse(toIso) - Date.parse(fromIso)) / 60_000);
}

/**
 * Propuestas de calendario (CU-SER-003..005). Nest: `sessions.write`. No cancela.
 */
export function registerSessionWriteTools(server: McpServer): void {
  server.registerTool(
    'propose_create_session',
    {
      title: 'Proponer clase puntual',
      description:
        'Arma una clase de un solo día (servicio por sesiones, id de list_services) para que el usuario la confirme. Fecha y hora en Buenos Aires.',
      inputSchema: {
        serviceId: z.string().uuid(),
        date: dateSchema,
        startTime: timeSchema,
        durationMinutes: durationSchema,
        capacity: capacitySchema,
        instructorId: instructorSchema.optional(),
      },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ serviceId, date, startTime, durationMinutes, capacity, instructorId }) =>
      proposeWrite('sessions.write', async () => {
        const service = await getRecord(`/api/services/${serviceId}`);
        const startsAt = baLocalToIso(date, startTime);
        const endsAt = new Date(Date.parse(startsAt) + durationMinutes * 60_000).toISOString();
        const lines: ProposalLine[] = [
          { label: 'Servicio', value: nameOf(service) },
          { label: 'Cuándo', value: dateTimeHuman(startsAt) },
          { label: 'Duración', value: `${durationMinutes} min` },
          { label: 'Cupo', value: String(capacity) },
        ];
        if (instructorId) {
          lines.push({ label: 'Instructor', value: await instructorName(instructorId) });
        }
        return {
          title: 'Crear clase',
          lines,
          request: {
            method: 'POST',
            path: '/api/sessions',
            body: definedOnly({ serviceId, startsAt, endsAt, capacity, instructorId }),
          },
          doneText: `Clase creada: ${nameOf(service)} ${dateTimeHuman(startsAt)}.`,
          links: LINKS,
        };
      }),
  );

  server.registerTool(
    'propose_update_session',
    {
      title: 'Proponer edición de clase',
      description:
        'Arma la edición de una clase (id de list_sessions) para que el usuario la confirme: día, hora, duración, cupo o instructor (instructorId null lo saca). Subir el cupo va solo (sin otros cambios) porque avisa a la lista de espera. No cancela clases.',
      inputSchema: {
        sessionId: z.string().uuid(),
        date: dateSchema.optional(),
        startTime: timeSchema.optional(),
        durationMinutes: durationSchema.optional(),
        capacity: capacitySchema.optional(),
        instructorId: instructorSchema.nullable().optional(),
      },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ sessionId, date, startTime, durationMinutes, capacity, instructorId }) =>
      proposeWrite('sessions.write', async () => {
        const before = await getRecord(`/api/sessions/${sessionId}`);
        if (pickString(before, 'status') === 'CANCELLED') {
          throw new ProposalError('Esa clase está cancelada: no se edita.');
        }
        const prevStarts = String(before.startsAt ?? '');
        const prevEnds = String(before.endsAt ?? '');
        const prevCapacity = pickNumber(before, 'capacity') ?? 0;
        const header: ProposalLine = {
          label: 'Clase',
          value: `${pickString(before, 'serviceName') ?? 'Clase'} ${dateTimeHuman(prevStarts)}`,
        };
        const timeChange = date !== undefined || startTime !== undefined || durationMinutes !== undefined;
        const expand = capacity !== undefined && capacity > prevCapacity;

        if (expand) {
          if (timeChange || instructorId !== undefined) {
            throw new ProposalError(
              'Subir el cupo se propone solo (avisa a la lista de espera). Primero el cupo y después el resto.',
            );
          }
          return {
            title: 'Ampliar cupo',
            lines: [header, changeLine('Cupo', String(prevCapacity), String(capacity))],
            request: { method: 'PATCH', path: `/api/sessions/${sessionId}/capacity`, body: { capacity } },
            doneText: `Cupo ampliado a ${capacity}. Si había lista de espera, se promueve sola.`,
            links: LINKS,
          };
        }

        const lines: ProposalLine[] = [header];
        const body: Record<string, unknown> = {};
        if (timeChange) {
          const prevLocal = isoToBaLocal(prevStarts);
          const nextStarts = baLocalToIso(date ?? prevLocal.ymd, startTime ?? prevLocal.hhmm);
          const minutes = durationMinutes ?? minutesBetween(prevStarts, prevEnds);
          const nextEnds = new Date(Date.parse(nextStarts) + minutes * 60_000).toISOString();
          body.startsAt = nextStarts;
          body.endsAt = nextEnds;
          lines.push(changeLine('Cuándo', dateTimeHuman(prevStarts), dateTimeHuman(nextStarts)));
          if (durationMinutes !== undefined) {
            lines.push(changeLine('Duración', `${minutesBetween(prevStarts, prevEnds)} min`, `${minutes} min`));
          }
        }
        if (capacity !== undefined) {
          body.capacity = capacity;
          lines.push(changeLine('Cupo', String(prevCapacity), String(capacity)));
        }
        if (instructorId !== undefined) {
          body.instructorId = instructorId;
          lines.push(
            changeLine(
              'Instructor',
              pickString(before, 'instructorName'),
              instructorId === null ? '(sin instructor)' : await instructorName(instructorId),
            ),
          );
        }
        if (Object.keys(body).length === 0) {
          throw new ProposalError('No indicaste qué cambiar.');
        }
        return {
          title: 'Editar clase',
          lines,
          request: { method: 'PATCH', path: `/api/sessions/${sessionId}`, body },
          doneText: 'Clase actualizada. Las reservas siguen como estaban.',
          links: LINKS,
        };
      }),
  );

  server.registerTool(
    'propose_create_recurring_sessions',
    {
      title: 'Proponer serie semanal',
      description:
        'Arma una serie de clases semanales (servicio por sesiones) para que el usuario la confirme: días de la semana, hora, duración, desde/hasta y cupo. Crea todas las clases del rango. Revisá bien los días con el usuario.',
      inputSchema: {
        serviceId: z.string().uuid(),
        weekdays: z.array(z.enum(WEEKDAYS)).min(1),
        startTime: timeSchema,
        durationMinutes: durationSchema,
        startsOn: dateSchema.optional().describe('Desde YYYY-MM-DD. Default hoy.'),
        endsOn: dateSchema.describe('Hasta YYYY-MM-DD (inclusive).'),
        capacity: capacitySchema,
        instructorId: instructorSchema.optional(),
      },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ serviceId, weekdays, startTime, durationMinutes, startsOn, endsOn, capacity, instructorId }) =>
      proposeWrite('sessions.write', async () => {
        const from = startsOn ?? baYmd();
        if (endsOn < from) {
          throw new ProposalError('La fecha "hasta" es anterior a "desde".');
        }
        const service = await getRecord(`/api/services/${serviceId}`);
        const days = [...new Set(weekdays)];
        const lines: ProposalLine[] = [
          { label: 'Servicio', value: nameOf(service) },
          { label: 'Días', value: days.map((day) => WEEKDAY_LABEL[day]).join(', ') },
          { label: 'Hora', value: `${startTime} (${durationMinutes} min)` },
          { label: 'Desde / hasta', value: `${ymdHuman(from)} al ${ymdHuman(endsOn)}` },
          { label: 'Cupo', value: String(capacity) },
        ];
        if (instructorId) {
          lines.push({ label: 'Instructor', value: await instructorName(instructorId) });
        }
        return {
          title: 'Crear serie semanal',
          lines,
          request: {
            method: 'POST',
            path: '/api/session-recurrence-rules',
            body: definedOnly({
              serviceId,
              weekdays: days,
              localStartTime: startTime,
              durationMinutes,
              timezone: 'America/Argentina/Buenos_Aires',
              startsOn: from,
              endsOn,
              capacity,
              instructorId,
            }),
          },
          doneText: `Serie creada: ${nameOf(service)} ${days.map((day) => WEEKDAY_LABEL[day]).join(', ')} ${startTime}.`,
          links: LINKS,
        };
      }),
  );
}
