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
  createdAt: Date;
  updatedAt: Date;
};
