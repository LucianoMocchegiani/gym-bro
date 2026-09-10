/**
 * Identidad resuelta por introspección (contrato portable, no GymBro).
 *
 * @remarks `tenantId` + `userId` aíslan hilos. Nunca salen del body del cliente.
 * Landing pública: `profileType` PUBLIC y `tenantId` `public` (sin gym).
 */

export const PUBLIC_TENANT_ID = 'public';
export const PUBLIC_PROFILE = 'PUBLIC';

export type Principal = {
  userId: string;
  tenantId: string;
  profileType: string;
  email: string | null;
  name: string | null;
};

export function isPublicPrincipal(principal: Principal): boolean {
  return (
    principal.profileType === PUBLIC_PROFILE &&
    principal.tenantId === PUBLIC_TENANT_ID
  );
}

export type AppEnv = {
  Variables: {
    principal: Principal;
    accessToken: string;
  };
};
