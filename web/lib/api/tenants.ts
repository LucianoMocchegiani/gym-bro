export function cancelPlatformTenantPlan(
  id: string,
  confirmSlug: string,
): Promise<{ contract: unknown; automaticDebitCancelled: boolean }> {
  return apiRequest(`/tenants/${id}/platform-plan/cancel`, {
    method: 'POST',
    body: { confirmSlug },
  });
}
