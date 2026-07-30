/**
 * Etiquetas legibles de motivos de acceso (RN-ACC-007).
 */
const REASON_LABELS: Record<string, string> = {
  ok_acceso_libre: 'Permitido — acceso libre',
  ok_reserva: 'Permitido — reserva',
  ok_pase_manual: 'Permitido — pase manual',
  credencial_invalida: 'Credencial inválida o revocada',
  tenant_mismatch: 'Credencial de otro gym',
  tenant_suspendido: 'Gym suspendido',
  afiliado_inactivo: 'Afiliado inactivo',
  sin_derecho: 'Sin derecho de ingreso',
  deuda_excedida: 'Deuda fuera de tolerancia',
  multi_ingreso_excedido: 'Multi-ingreso excedido',
  payload_invalido: 'Datos de escaneo inválidos',
};

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
