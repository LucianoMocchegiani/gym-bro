import { randomUUID } from 'node:crypto';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { pickNumber, pickString } from '../slim.js';
import { dateTimeHuman, getRecord, nameOf, ProposalError, proposeWrite } from './write-support.js';

const LINKS = [{ href: '/sesiones', label: 'Sesiones' }];

async function memberAndSession(memberId: string, sessionId: string) {
  const member = await getRecord(`/api/members/${memberId}`);
  const session = await getRecord(`/api/sessions/${sessionId}`);
  if (pickString(session, 'status') === 'CANCELLED') {
    throw new ProposalError('Esa clase está cancelada.');
  }
  const label = `${pickString(session, 'serviceName') ?? 'Clase'} ${dateTimeHuman(String(session.startsAt ?? ''))}`;
  return { member, session, label };
}

/**
 * Propuestas de reservas operadas por staff (CU-RES-001/004). Nest: `reservations.write`.
 *
 * @remarks Solo con crédito: drop-in es cobro (Caja). No cancela.
 */
export function registerReservationWriteTools(server: McpServer): void {
  server.registerTool(
    'propose_reserve_session',
    {
      title: 'Proponer reserva',
      description:
        'Arma la reserva de un afiliado (search_members) en una clase (list_sessions) usando crédito de su pack, para que el usuario la confirme. Si no tiene crédito, no se puede: la clase suelta se cobra en Caja. Si no hay cupo, proponé propose_join_waitlist.',
      inputSchema: {
        memberId: z.string().uuid(),
        sessionId: z.string().uuid(),
      },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ memberId, sessionId }) =>
      proposeWrite('reservations.write', async () => {
        const { member, session, label } = await memberAndSession(memberId, sessionId);
        const capacity = pickNumber(session, 'capacity') ?? 0;
        const booked = pickNumber(session, 'bookedCount') ?? 0;
        if (booked >= capacity) {
          throw new ProposalError('La clase no tiene cupo. Podés proponer anotarlo en la lista de espera.');
        }
        return {
          title: 'Reservar clase',
          lines: [
            { label: 'Afiliado', value: nameOf(member) },
            { label: 'Clase', value: label },
            { label: 'Cupo', value: `${booked}/${capacity} ocupados` },
            { label: 'Paga con', value: 'Crédito de su pack' },
          ],
          request: {
            method: 'POST',
            path: `/api/members/${memberId}/reservations`,
            body: { sessionId, coverage: 'CREDIT', idempotencyKey: randomUUID() },
          },
          doneText: `Reserva hecha: ${nameOf(member)} en ${label}.`,
          links: LINKS,
        };
      }),
  );

  server.registerTool(
    'propose_join_waitlist',
    {
      title: 'Proponer lista de espera',
      description:
        'Arma anotar a un afiliado en la lista de espera de una clase llena, para que el usuario lo confirme.',
      inputSchema: {
        memberId: z.string().uuid(),
        sessionId: z.string().uuid(),
      },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ memberId, sessionId }) =>
      proposeWrite('reservations.write', async () => {
        const { member, label } = await memberAndSession(memberId, sessionId);
        return {
          title: 'Anotar en lista de espera',
          lines: [
            { label: 'Afiliado', value: nameOf(member) },
            { label: 'Clase', value: label },
          ],
          request: {
            method: 'POST',
            path: `/api/members/${memberId}/waitlist`,
            body: { sessionId },
          },
          doneText: `${nameOf(member)} quedó en la lista de espera de ${label}.`,
          links: LINKS,
        };
      }),
  );
}
