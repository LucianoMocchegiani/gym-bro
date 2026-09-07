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
 * Texto corto (es-AR) para UI / MCP. No sustituye el `reasonCode` estable.
 */
export const ACCESS_REASON_LABEL: Record<AccessReasonCode, string> = {
  [ACCESS_REASON.okAccesoLibre]: 'Puede entrar: pack de acceso libre vigente.',
  [ACCESS_REASON.okReserva]: 'Puede entrar: tiene reserva en ventana.',
  [ACCESS_REASON.okDeudaTolerancia]:
    'Puede entrar: pack vencido dentro de la tolerancia de deuda.',
  [ACCESS_REASON.okStaff]: 'Puede entrar: staff activo (molinete).',
  [ACCESS_REASON.credencialInvalida]: 'No puede entrar: credencial inválida.',
  [ACCESS_REASON.tenantMismatch]: 'No puede entrar: gym no coincide.',
  [ACCESS_REASON.tenantSuspendido]: 'No puede entrar: gym suspendido.',
  [ACCESS_REASON.afiliadoInactivo]: 'No puede entrar: afiliado inactivo.',
  [ACCESS_REASON.staffInactivo]: 'No puede entrar: staff inactivo.',
  [ACCESS_REASON.sinDerecho]: 'No puede entrar: sin pack ni reserva.',
  [ACCESS_REASON.deudaExcedida]: 'No puede entrar: deuda fuera de tolerancia.',
  [ACCESS_REASON.multiIngresoExcedido]:
    'No puede entrar: ya alcanzó el tope de ingresos del día.',
  [ACCESS_REASON.payloadInvalido]: 'No puede entrar: payload inválido.',
  [ACCESS_REASON.okPaseManual]: 'Ingreso por pase manual.',
};

/**
 * Resultado de `GET /members/:id/access-preview`.
 *
 * @remarks Mismas RN-ACC-004..007 que la puerta. No hay fila en
 * `access_attempts` ni `checked_in_at`. `overdueDays` se calcula pero
 * no incrementa el contador de multi-ingreso.
 */
export type AccessPreviewResult = {
  allowed: boolean;
  reasonCode: AccessReasonCode;
  reasonLabel: string;
  memberId: string;
  reservationId: string | null;
  sessionId: string | null;
  overdueDays: number;
  debtToleranceDays: number;
};

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
