import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { AuthUser } from '../auth.types';

type RequestWithUser = Request & { user?: AuthUser };

/**
 * Exige usuario autenticado con perfil SUPER (plataforma GymBro).
 *
 * @remarks RN-TEN-002 / RN-ROL-001: solo Super Admin opera tenants a nivel plataforma.
 */
@Injectable()
export class SuperGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const user = request.user;

    if (!user) {
      throw new UnauthorizedException();
    }

    if (user.profileType !== 'SUPER') {
      throw new ForbiddenException('Super Admin access required');
    }

    return true;
  }
}
