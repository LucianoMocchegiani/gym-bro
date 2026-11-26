import { apiRequest } from '@/lib/api/client';

/**
 * Plan Faciliter del gym (GET /plan).
 */

export type GymPlanStatus = 'trial' | 'active' | 'expired' | 'none';

export type GymPlanView = {
  tenantId: string;
  tenantName: string;
  tenantSlug: string;
  status: GymPlanStatus;
  packId: string | null;
  packName: string | null;
  serviceNames: string[];
  startsAt: string | null;
  endsAt: string | null;
  isPlatformTrial: boolean;
  isOwner: boolean;
  platformTrialEligible: boolean;
};

export type PlatformTrialEligibility = {
  eligible: boolean;
  reason: string | null;
};

export type TenantPlanActionsView = {
  automaticDebit: 'active' | 'cancelled' | 'none' | 'unknown';
  canFinalize: boolean;
  finalizationAt: string | null;
};

/**
 * Plan del gym del Host (`tenant.settings.read`).
 */
export function getGymPlan(): Promise<GymPlanView> {
  return apiRequest<GymPlanView>('/plan');
}

export function getTenantPlanActions(): Promise<TenantPlanActionsView> {
  return apiRequest<TenantPlanActionsView>('/plan/actions');
}

export function cancelTenantPlanDebit(): Promise<TenantPlanActionsView> {
  return apiRequest<TenantPlanActionsView>('/plan/actions/automatic-debit', {
    method: 'DELETE',
  });
}

export function finalizeTenantPlan(): Promise<TenantPlanActionsView> {
  return apiRequest<TenantPlanActionsView>('/plan/actions/finalize', {
    method: 'POST',
  });
}

/**
 * Elegibilidad de prueba (Caja de `admin`).
 */
export function getPlatformTrialEligibility(
  billingTenantId: string,
): Promise<PlatformTrialEligibility> {
  return apiRequest<PlatformTrialEligibility>(
    `/tenants/${billingTenantId}/platform-trial`,
  );
}
