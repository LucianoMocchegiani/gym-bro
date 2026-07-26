/**
 * Configuración operativa del tenant expuesta por la API.
 */
export type TenantSettingsDetail = {
  tenantId: string;
  reservationCancellationHours: number;
  createdAt: Date;
  updatedAt: Date;
};
