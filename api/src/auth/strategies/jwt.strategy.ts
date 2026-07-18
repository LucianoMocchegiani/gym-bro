import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AuthUser, JwtAccessPayload } from '../auth.types';

/**
 * Valida el access JWT y construye el {@link AuthUser} del request.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(config: ConfigService) {
    const secret = config.get<string>('JWT_ACCESS_SECRET');
    if (!secret) {
      throw new Error('JWT_ACCESS_SECRET is required');
    }
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  /**
   * Mapea claims del token al usuario de request.
   *
   * @param payload Claims firmados del access token.
   * @returns Usuario autenticado para controllers.
   * @throws {UnauthorizedException} Si el payload es inconsistente (STAFF/MEMBER sin tenant).
   */
  validate(payload: JwtAccessPayload): AuthUser {
    if (
      (payload.profileType === 'STAFF' || payload.profileType === 'MEMBER') &&
      !payload.tenantId
    ) {
      throw new UnauthorizedException('Invalid token claims');
    }

    return {
      userId: payload.sub,
      email: payload.email,
      profileType: payload.profileType,
      tenantId: payload.tenantId,
    };
  }
}
