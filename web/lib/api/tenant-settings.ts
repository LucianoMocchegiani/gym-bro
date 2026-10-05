/**
 * Tenant settings API (módulo `tenant-settings`).
 */

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
  /** Descuento por defecto en Caja al cobrar en efectivo, en %. */
  cashDiscountPercent: number;
  /** Descuento por defecto en Caja al cobrar por transferencia, en %. */
  transferDiscountPercent: number;
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
};

/**
 * Lee config operativa (`tenant.settings.read`).
 */
export function getTenantSettings(): Promise<TenantSettingsDetail> {
  return apiRequest<TenantSettingsDetail>('/tenant-settings');
}

/**
 * Actualiza config operativa (`tenant.settings.write`).
 */
export function updateTenantSettings(
  input: UpdateTenantSettingsInput,
): Promise<TenantSettingsDetail> {
  return apiRequest<TenantSettingsDetail>('/tenant-settings', {
    method: 'PATCH',
    body: input,
  });
}
