import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { AuthUser } from '../../auth/auth.types';

type RequestWithUser = Request & { user?: AuthUser };

/**
 * Exige un usuario autenticado con `tenantId` (STAFF / MEMBER).
 *
 * @remarks Aplica RN-TEN-001: el tenant sale del JWT, no del body.
 * SUPER no puede usar rutas marcadas con este guard (sin impersonación en MVP).
 * El estado ACTIVE del tenant se valida en login/refresh, no en cada request.
 */
@Injectable()
export class TenantGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const user = request.user;

    if (!user) {
      throw new UnauthorizedException();
    }

    if (user.profileType === 'SUPER') {
      throw new ForbiddenException(
        'Super Admin cannot access tenant-scoped routes without support impersonation',
      );
    }

    if (!user.tenantId) {
      throw new ForbiddenException('Tenant context is required');
    }

    return true;
  }
}
