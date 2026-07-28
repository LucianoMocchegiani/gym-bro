import { AccessCredentialStatus } from '@prisma/client';

/**
 * Credencial de vínculo expuesta por la API.
 */
export type AccessCredentialDetail = {
  id: string;
  tenantId: string;
  memberId: string;
  credentialRef: string;
  status: AccessCredentialStatus;
  provider: string;
  issuedAt: Date;
  revokedAt: Date | null;
  /**
   * Token a mostrar/escanear en modo `gym_scans_member` (stub = credentialRef).
   */
  presentationToken: string;
  /**
   * QR del local para modo `member_scans_gym` (informativo; stub = stub-venue:{tenantId}).
   */
  venueToken: string;
};

/**
 * Motivos estables de allow/deny en puerta (RN-ACC-007).
 */
export const ACCESS_REASON = {
  okAccesoLibre: 'ok_acceso_libre',
  okReserva: 'ok_reserva',
  credencialInvalida: 'credencial_invalida',
  tenantMismatch: 'tenant_mismatch',
  tenantSuspendido: 'tenant_suspendido',
  afiliadoInactivo: 'afiliado_inactivo',
  sinDerecho: 'sin_derecho',
  deudaExcedida: 'deuda_excedida',
  multiIngresoExcedido: 'multi_ingreso_excedido',
  payloadInvalido: 'payload_invalido',
} as const;

export type AccessReasonCode =
  (typeof ACCESS_REASON)[keyof typeof ACCESS_REASON];

/**
 * Detalle de un intento de ingreso.
 */
export type AccessAttemptDetail = {
  id: string;
  tenantId: string;
  memberId: string | null;
  credentialRef: string | null;
  result: 'ALLOWED' | 'DENIED';
  reasonCode: string;
  scanMode: string;
  reservationId: string | null;
  sessionId: string | null;
  manualPass: boolean;
  actorStaffId: string | null;
  createdAt: Date;
};

/**
 * Respuesta de `POST /access/verify`.
 */
export type AccessVerifyResult = {
  allowed: boolean;
  reasonCode: string;
  memberId: string | null;
  reservationId: string | null;
  sessionId: string | null;
  checkedInAt: Date | null;
  attempt: AccessAttemptDetail;
};
