import { apiRequest } from '@/lib/api/client';

export type WaitlistMode = 'AUTO_ASSIGN' | 'MEMBER_CONFIRM' | 'STAFF_CONFIRM';

export type AccessProvider = 'KUATIA' | 'ZKTECO';

export type TenantSettingsDetail = {
  tenantId: string;
  accessProvider: AccessProvider;
  reservationCancellationHours: number;
  waitlistMode: WaitlistMode;
  allowLateSessionEntry: boolean;
  debtToleranceDays: number;
  multiEntryEnabled: boolean;
  multiEntryMaxPerDay: number;
  cashDiscountPercent: number;
  transferDiscountPercent: number;
  qrPointDiscountPercent: number;
  mpLinkDiscountPercent: number;
  createdAt: string;
  updatedAt: string;
};

export type UpdateTenantSettingsInput = {
  accessProvider?: AccessProvider;
  reservationCancellationHours?: number;
  waitlistMode?: WaitlistMode;
  allowLateSessionEntry?: boolean;
  debtToleranceDays?: number;
  multiEntryEnabled?: boolean;
  multiEntryMaxPerDay?: number;
  cashDiscountPercent?: number;
  transferDiscountPercent?: number;
  qrPointDiscountPercent?: number;
  mpLinkDiscountPercent?: number;
};

export function getTenantSettings(): Promise<TenantSettingsDetail> {
  return apiRequest<TenantSettingsDetail>('/tenant-settings');
}

export function updateTenantSettings(
  input: UpdateTenantSettingsInput,
): Promise<TenantSettingsDetail> {
  return apiRequest<TenantSettingsDetail>('/tenant-settings', {
    method: 'PATCH',
    body: input,
  });
}
