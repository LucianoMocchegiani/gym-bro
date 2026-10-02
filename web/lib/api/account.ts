import { apiRequest } from '@/lib/api/client';

/**
 * Elimina la cuenta Faciliter de la persona con sesión en el apex (CU-CTA-001).
 *
 * @remarks La API anonimiza la cuenta y revoca todas las sesiones; después hay
 * que limpiar la sesión local. 409 si es dueña de un gym activo (RN-CTA-003).
 */
export function deleteMyAccount(): Promise<{ ok: true }> {
  return apiRequest<{ ok: true }>('/me/identity', {
    method: 'DELETE',
    body: { confirm: 'ELIMINAR' },
    auth: 'identity',
  });
}
