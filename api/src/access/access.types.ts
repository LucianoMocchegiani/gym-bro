import { AccessCredentialStatus } from '@prisma/client';

/**
 * Modo de escaneo en puerta (RN-ACC-003). MVP UI: solo `member_scans_gym` vía OID4VP.
 */
export type AccessScanMode = 'gym_scans_member' | 'member_scans_gym';

/**
 * Credencial de vínculo (tabla legada `access_credentials`; stubs retirados).
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
};

/**
 * Motivos estables de allow/deny en puerta (RN-ACC-007).
 */
export const ACCESS_REASON = {
  okAccesoLibre: 'ok_acceso_libre',
  okReserva: 'ok_reserva',
  /** Pack libre vencido pero dentro de `debtToleranceDays` (RN-ACC-005). */
  okDeudaTolerancia: 'ok_deuda_tolerancia',
  /** Staff activo con VC de acceso (molinete; sin pack/deuda). */
  okStaff: 'ok_staff',
  credencialInvalida: 'credencial_invalida',
  tenantMismatch: 'tenant_mismatch',
  tenantSuspendido: 'tenant_suspendido',
  afiliadoInactivo: 'afiliado_inactivo',
  staffInactivo: 'staff_inactivo',
  sinDerecho: 'sin_derecho',
  deudaExcedida: 'deuda_excedida',
  multiIngresoExcedido: 'multi_ingreso_excedido',
  payloadInvalido: 'payload_invalido',
  okPaseManual: 'ok_pase_manual',
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
  memberName: string | null;
  memberEmail: string | null;
  subjectStaffId: string | null;
  subjectStaffName: string | null;
  subjectStaffEmail: string | null;
  credentialRef: string | null;
  result: 'ALLOWED' | 'DENIED';
  reasonCode: string;
  scanMode: string;
  reservationId: string | null;
  sessionId: string | null;
  manualPass: boolean;
  motiveCode: string | null;
  note: string | null;
  actorStaffId: string | null;
  createdAt: Date;
};

/**
 * Resultado de evaluación de ingreso (OID4VP / pase manual).
 */
export type AccessVerifyResult = {
  allowed: boolean;
  reasonCode: string;
  memberId: string | null;
  subjectStaffId: string | null;
  reservationId: string | null;
  sessionId: string | null;
  checkedInAt: Date | null;
  attempt: AccessAttemptDetail;
};

/**
 * Respuesta de `POST /access/oid4vp/request`.
 */
export type AccessOid4VpRequestResult = {
  requestUri: string;
  verificationSessionId: string;
  scanMode: 'member_scans_gym';
};

/**
 * Respuesta de `GET /access/oid4vp/session/:id`.
 */
export type AccessOid4VpSessionResult =
  | {
      status: 'pending';
      state: string;
    }
  | {
      status: 'done';
      state: string;
      result: AccessVerifyResult;
    }
  | {
      status: 'error';
      state: string;
      reasonCode: string;
    };
