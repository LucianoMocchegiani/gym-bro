/**
 * Claims del access JWT emitido por GymBro.
 *
 * @remarks `tenantId` es obligatorio para STAFF y MEMBER; ausente para SUPER.
 * El tenant nunca se toma del body en rutas de negocio (RN-TEN-001).
 */
export type JwtAccessPayload = {
  sub: string;
  email: string;
  profileType: 'SUPER' | 'STAFF' | 'MEMBER';
  tenantId?: string;
};

/**
 * Usuario autenticado adjunto al request tras validar el access token.
 */
export type AuthUser = {
  userId: string;
  email: string;
  profileType: 'SUPER' | 'STAFF' | 'MEMBER';
  tenantId?: string;
};

/**
 * Par de tokens devuelto por login / refresh.
 */
export type AuthTokens = {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: 'Bearer';
  profileType: 'SUPER' | 'STAFF' | 'MEMBER';
  user: {
    id: string;
    email: string;
    name: string | null;
    tenantId?: string;
  };
};
