import type { AccessAttemptDetail } from '@/lib/api/access';

/**
 * Etiquetas legibles de motivos de acceso (RN-ACC-007).
 */
const REASON_LABELS: Record<string, string> = {
  ok_acceso_libre: 'Permitido — acceso libre',
  ok_reserva: 'Permitido — reserva',
  ok_deuda_tolerancia: 'Permitido — deuda dentro de tolerancia',
  ok_pase_manual: 'Permitido — pase manual',
  ok_staff: 'Permitido — staff',
  credencial_invalida: 'Credencial inválida o revocada',
  tenant_mismatch: 'Credencial de otro gym',
  tenant_suspendido: 'Gym suspendido',
  afiliado_inactivo: 'Afiliado inactivo',
  staff_inactivo: 'Staff inactivo',
  sin_derecho: 'Sin derecho de ingreso',
  deuda_excedida: 'Deuda fuera de tolerancia',
  multi_ingreso_excedido: 'Multi-ingreso excedido',
  payload_invalido: 'Datos de escaneo inválidos',
  sin_vinculo: 'Número de usuario del aparato sin vincular',
};

const CHANNEL_LABELS: Record<string, string> = {
  kuatia: 'App (Kuatia)',
  zkteco: 'ZKTeco',
  manual: 'Pase manual',
};

/**
 * Canal por el que entró el intento (RN-ACC-010).
 */
export function formatAccessChannel(code: string): string {
  return CHANNEL_LABELS[code] ?? code;
}

/**
 * Quién intentó entrar: staff, afiliado o, en ZKTeco sin vínculo, el número.
 */
export function formatAccessSubject(a: AccessAttemptDetail): string {
  if (a.subjectStaffId) {
    return (
      a.subjectStaffName?.trim() ||
      a.subjectStaffEmail?.trim() ||
      a.subjectStaffId
    );
  }
  if (a.memberName?.trim()) {
    return a.memberName;
  }
  if (a.memberEmail?.trim()) {
    return a.memberEmail;
  }
  if (a.channel === 'zkteco' && a.credentialRef) {
    const externalId = a.credentialRef.split(':')[2];
    if (externalId) {
      return `Nº ${externalId} (sin vincular)`;
    }
  }
  return a.credentialRef || '—';
}

/**
 * Traduce `reasonCode` de la API a texto de puerta.
 */
export function formatAccessReason(code: string): string {
  return REASON_LABELS[code] ?? code;
}

const MOTIVE_LABELS: Record<string, string> = {
  deuda: 'Deuda',
  olvido_celular: 'Olvido de celular',
  cortesia: 'Cortesía',
  otro: 'Otro',
};

/**
 * Etiqueta de motivo de pase manual.
 */
export function formatManualMotive(code: string): string {
  return MOTIVE_LABELS[code] ?? code;
}
