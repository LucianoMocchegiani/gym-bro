/**
 * Claims del access JWT emitido por GymBro.
 *
 * @remarks `tenantId` es obligatorio para STAFF y MEMBER; ausente para SUPER
 * e IDENTITY (persona, picker de gym). El tenant nunca se toma del body.
 */
export type JwtAccessPayload = {
  sub: string;
  email: string;
  profileType: 'SUPER' | 'STAFF' | 'MEMBER' | 'IDENTITY';
  tenantId?: string;
  /** ID del Super Admin que está impersonando. */
  impersonatedBy?: string;
};

/**
 * Usuario autenticado adjunto al request tras validar el access token.
 */
export type AuthUser = {
  userId: string;
  email: string;
  profileType: 'SUPER' | 'STAFF' | 'MEMBER' | 'IDENTITY';
  tenantId?: string;
  /** ID del Super Admin que está impersonando. */
  impersonatedBy?: string;
};

/**
 * Par de tokens devuelto por login / refresh.
 */
export type AuthTokens = {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: 'Bearer';
  profileType: 'SUPER' | 'STAFF' | 'MEMBER' | 'IDENTITY';
  user: {
    id: string;
    email: string;
    name: string | null;
    tenantId?: string;
  };
};

export type MembershipProfile = 'MEMBER' | 'STAFF';

/**
 * Gym + perfil visible para una identity (picker).
 */
export type MembershipRow = {
  tenantId: string;
  tenantSlug: string;
  tenantName: string;
  profile: MembershipProfile;
  memberId?: string;
  staffUserId?: string;
};

export type MembershipsList = {
  items: MembershipRow[];
};
