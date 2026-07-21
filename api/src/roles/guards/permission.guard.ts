import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { AuthUser } from '../../auth/auth.types';
import { PERMISSIONS_KEY } from '../decorators/require-permission.decorator';
import { PermissionsService } from '../permissions.service';

type RequestWithUser = Request & { user?: AuthUser };

/**
 * Exige uno o más códigos de permiso en la unión de roles del staff.
 *
 * @remarks RN-ROL-007 / CU-ROL-006. SUPER no usa este guard en rutas de plataforma
 * (`RequireSuperAuth`). Si aparece SUPER aquí → bypass. MEMBER → 403.
 */
@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly permissions: PermissionsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!required?.length) {
      return true;
    }

    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const user = request.user;
    if (!user) {
      throw new UnauthorizedException();
    }

    if (user.profileType === 'SUPER') {
      return true;
    }

    if (user.profileType !== 'STAFF' || !user.tenantId) {
      throw new ForbiddenException('Staff permission required');
    }

    const codes = await this.permissions.getPermissionCodes(
      user.userId,
      user.tenantId,
    );

    const missing = required.filter((code) => !codes.has(code));
    if (missing.length > 0) {
      throw new ForbiddenException(
        `Missing permission(s): ${missing.join(', ')}`,
      );
    }

    return true;
  }
}
