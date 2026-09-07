/**
 * Identidad resuelta por introspección (contrato portable, no GymBro).
 *
 * @remarks `tenantId` + `userId` aíslan hilos. Nunca salen del body del cliente.
 */
export type Principal = {
  userId: string;
  tenantId: string;
  profileType: string;
  email: string | null;
  name: string | null;
};

export type AppEnv = {
  Variables: {
    principal: Principal;
    accessToken: string;
  };
};
