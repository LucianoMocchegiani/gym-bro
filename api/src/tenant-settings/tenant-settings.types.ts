/**
 * Configuración operativa del tenant expuesta por la API.
 */
export type TenantSettingsDetail = {
  tenantId: string;
  reservationCancellationHours: number;
  waitlistMode: 'AUTO_ASSIGN' | 'MEMBER_CONFIRM' | 'STAFF_CONFIRM';
  allowLateSessionEntry: boolean;
  debtToleranceDays: number;
  multiEntryEnabled: boolean;
  multiEntryMaxPerDay: number;
  /** Sistema de puerta del gym (RN-ACC-010). */
  accessProvider: 'KUATIA' | 'ZKTECO';
  /** Descuento por defecto en Caja al cobrar en efectivo, en % (RN-PAG-020). */
  cashDiscountPercent: number;
  /** Descuento por defecto en Caja al cobrar por transferencia, en %. */
  transferDiscountPercent: number;
  createdAt: Date;
  updatedAt: Date;
};
