import { AccessCredentialStatus } from '@prisma/client';

/**
 * Modo de escaneo en puerta (RN-ACC-003).
 *
 * @remarks `member_scans_gym` = QR Kuatia en `/puerta`; `member_at_device` = la
 * persona se identifica en el aparato del torno (ZKTeco).
 */
export type AccessScanMode =
  'gym_scans_member' | 'member_scans_gym' | 'member_at_device';

/**
 * Sistema por el que llegó un ingreso (`access_attempts.channel`, RN-ACC-010).
 */
export const ACCESS_CHANNEL = {
  kuatia: 'kuatia',
  zkteco: 'zkteco',
  manual: 'manual',
} as const;

export type AccessChannel =
  (typeof ACCESS_CHANNEL)[keyof typeof ACCESS_CHANNEL];

/**
 * Quién quiere entrar, ya identificado por el sistema de puerta.
 *
 * @remarks Cada adapter (Kuatia, ZKTeco…) resuelve su identidad a esto; las
 * reglas de Faciliter no saben de qué sistema vino.
 */
export type AccessSubject =
  { kind: 'member'; memberId: string } | { kind: 'staff'; staffUserId: string };

/**
 * Origen del intento: canal, modo y referencia idempotente del sistema de puerta.
 */
export type AccessEntryOrigin = {
  tenantId: string;
  channel: AccessChannel;
  scanMode: AccessScanMode;
  /** Referencia del evento en el sistema de puerta (`oid4vp:{id}`, `zkteco:{…}`). */
  credentialRef: string;
  /** Staff que opera la puerta, o `null` si el evento vino de un aparato. */
  actorStaffId: string | null;
};

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
  /** Staff activo (VC de acceso o vínculo ZKTeco; sin pack/deuda). */
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
  /** El aparato informó un número de usuario sin vínculo ni DNI en el gym. */
  sinVinculo: 'sin_vinculo',
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
  [ACCESS_REASON.okStaff]: 'Puede entrar: staff activo.',
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
  [ACCESS_REASON.sinVinculo]:
    'No puede entrar: número de usuario del aparato sin vincular.',
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
  channel: string;
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
 * Respuesta de `POST /access/zkteco/events` para el puente del gym.
 *
 * @remarks `open` = el puente debe abrir (allow y no repetido). `duplicate` =
 * el evento ya se había procesado; se devuelve el mismo resultado sin abrir.
 */
export type ZktecoEventResult = {
  allowed: boolean;
  reasonCode: string;
  reasonLabel: string;
  open: boolean;
  duplicate: boolean;
  result: AccessVerifyResult;
};

/**
 * Vínculo número de aparato → socio o staff (RN-ACC-011).
 */
export type AccessIdentityLinkDetail = {
  id: string;
  provider: 'KUATIA' | 'ZKTECO';
  externalId: string;
  memberId: string | null;
  staffUserId: string | null;
  createdAt: Date;
};

/**
 * Sistema de puerta del gym (RN-ACC-010).
 */
export type AccessDoorConfig = {
  provider: 'KUATIA' | 'ZKTECO';
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
