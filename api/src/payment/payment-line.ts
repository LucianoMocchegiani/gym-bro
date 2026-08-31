import { Prisma } from '@prisma/client';

/**
 * Include Prisma para armar una línea comercial de un `transaction_item`.
 *
 * @remarks Pack (componentes = servicios del catálogo) + contrato;
 * drop-in + sesión (servicio, sede, horario) + reserva.
 */
export const PAYMENT_LINE_INCLUDE = {
  pack: {
    select: {
      name: true,
      components: {
        select: {
          creditAmount: true,
          service: { select: { name: true } },
        },
      },
    },
  },
  session: {
    select: {
      startsAt: true,
      endsAt: true,
      service: { select: { name: true } },
      branch: { select: { name: true } },
    },
  },
  contract: { select: { startsAt: true, endsAt: true } },
  reservation: { select: { id: true } },
} satisfies Prisma.TransactionItemInclude;

/** Servicio incluido en un pack (créditos null = acceso libre). */
export type PaymentLineService = {
  name: string;
  credits: number | null;
};

/** Campos mínimos para `toPaymentLine` (el include Prisma los cubre). */
export type PaymentLineSource = {
  id: string;
  amount: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'REFUNDED';
  sessionId: string | null;
  pack: {
    name: string;
    components: Array<{
      creditAmount: number | null;
      service: { name: string };
    }>;
  } | null;
  session: {
    startsAt: Date;
    endsAt: Date;
    service: { name: string };
    branch: { name: string };
  } | null;
  contract: { startsAt: Date; endsAt: Date | null } | null;
  reservation: { id: string } | null;
};

/**
 * Línea de un cart cobrado: qué se vendió y qué derecho quedó (RN-PAG-004 / CU-RES-001).
 */
export type PaymentLineDetail = {
  id: string;
  kind: 'PACK' | 'DROP_IN';
  title: string;
  amount: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'REFUNDED';
  outcome: 'CONTRACT' | 'RESERVATION' | null;
  contract: { startsAt: Date; endsAt: Date | null } | null;
  session: {
    startsAt: Date;
    endsAt: Date;
    branchName: string;
  } | null;
  services: PaymentLineService[];
};

/**
 * Mapea un transaction_item (con `PAYMENT_LINE_INCLUDE`) a línea de comprobante/reportes.
 */
export function toPaymentLine(item: PaymentLineSource): PaymentLineDetail {
  const isDropIn = Boolean(item.sessionId);
  const title = isDropIn
    ? (item.session?.service.name ?? 'Drop-in')
    : (item.pack?.name ?? 'Pack');
  let outcome: PaymentLineDetail['outcome'] = null;
  if (item.contract) {
    outcome = 'CONTRACT';
  } else if (item.reservation) {
    outcome = 'RESERVATION';
  }
  return {
    id: item.id,
    kind: isDropIn ? 'DROP_IN' : 'PACK',
    title,
    amount: item.amount,
    status: item.status,
    outcome,
    contract: item.contract
      ? {
          startsAt: item.contract.startsAt,
          endsAt: item.contract.endsAt,
        }
      : null,
    session: item.session
      ? {
          startsAt: item.session.startsAt,
          endsAt: item.session.endsAt,
          branchName: item.session.branch.name,
        }
      : null,
    services: [...(item.pack?.components ?? [])]
      .sort((a, b) => a.service.name.localeCompare(b.service.name, 'es'))
      .map((c) => ({
        name: c.service.name,
        credits: c.creditAmount,
      })),
  };
}
