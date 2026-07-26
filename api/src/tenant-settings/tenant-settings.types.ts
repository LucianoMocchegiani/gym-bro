/**
 * Configuración operativa del tenant expuesta por la API.
 */
export type TenantSettingsDetail = {
  tenantId: string;
  reservationCancellationHours: number;
  waitlistMode: 'AUTO_ASSIGN' | 'MEMBER_CONFIRM' | 'STAFF_CONFIRM';
  createdAt: Date;
  updatedAt: Date;
};
