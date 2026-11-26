import { apiRequest } from '@/lib/api/client';
import type { GymPlanView } from '@/lib/api/plan';

export type IdentityGymRow = {
  tenantId: string;
  name: string;
  slug: string;
  status: 'ACTIVE' | 'SUSPENDED';
};

export type PlatformSignupView = {
  id: string;
  gymName: string;
  slug: string;
  packId: string;
  packName: string;
  applyTrial: boolean;
  status: 'PENDING' | 'AWAITING_PAYMENT' | 'COMPLETED' | 'FAILED';
  checkoutUrl: string | null;
  tenantId: string | null;
  tenantSlug: string | null;
};

export type IdentityPlanActionsView = {
  automaticDebit: 'active' | 'cancelled' | 'none' | 'unknown';
  canFinalize: boolean;
  finalizationAt: string | null;
};

export function listIdentityGyms(): Promise<IdentityGymRow[]> {
  return apiRequest<IdentityGymRow[]>('/identity/tenants', { auth: 'identity' });
}

export function getIdentityGymPlan(tenantId: string): Promise<GymPlanView> {
  return apiRequest<GymPlanView>(`/identity/tenants/${tenantId}/plan`, {
    auth: 'identity',
  });
}

export function getIdentityPlanActions(
  tenantId: string,
): Promise<IdentityPlanActionsView> {
  return apiRequest<IdentityPlanActionsView>(
    `/identity/tenants/${tenantId}/plan-actions`,
    { auth: 'identity' },
  );
}

export function cancelIdentityPlanDebit(
  tenantId: string,
): Promise<IdentityPlanActionsView> {
  return apiRequest<IdentityPlanActionsView>(
    `/identity/tenants/${tenantId}/plan-actions/automatic-debit`,
    { method: 'DELETE', auth: 'identity' },
  );
}

export function finalizeIdentityPlan(
  tenantId: string,
): Promise<IdentityPlanActionsView> {
  return apiRequest<IdentityPlanActionsView>(
    `/identity/tenants/${tenantId}/plan-actions/finalize`,
    { method: 'POST', auth: 'identity' },
  );
}

export function startPlatformSignup(input: {
  packId: string;
  slug: string;
  gymName: string;
  payerEmail?: string;
}): Promise<PlatformSignupView> {
  return apiRequest<PlatformSignupView>('/identity/signups', {
    method: 'POST',
    body: input,
    auth: 'identity',
  });
}

export function getPlatformSignup(id: string): Promise<PlatformSignupView> {
  return apiRequest<PlatformSignupView>(`/identity/signups/${id}`, {
    auth: 'identity',
  });
}
