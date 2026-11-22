export type TenantSettingsDetail = {
  tenantId: string;
  reservationCancellationHours: number;
  waitlistMode: 'AUTO_ASSIGN' | 'MEMBER_CONFIRM' | 'STAFF_CONFIRM';
  allowLateSessionEntry: boolean;
  debtToleranceDays: number;
  multiEntryEnabled: boolean;
  multiEntryMaxPerDay: number;
  accessProvider: 'KUATIA' | 'ZKTECO';
  cashDiscountPercent: number;
  transferDiscountPercent: number;
  qrPointDiscountPercent: number;
  mpLinkDiscountPercent: number;
  createdAt: Date;
  updatedAt: Date;
};
