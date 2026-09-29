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
import { ALLOW_WHEN_LIMITED_KEY } from '../decorators/allow-when-limited.decorator';
import { PlatformAccessService } from '../platform-access.service';

type RequestWithUser = Request & { user?: AuthUser };

/**
 * Bloquea operación de staff si el gym está en modo limitado.
 *
 * @remarks MEMBER e IDENTITY no se recortan. Impersonación plataforma (`impersonatedBy`) tampoco.
 */
@Injectable()
export class PlatformAccessGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly platformAccess: PlatformAccessService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const user = request.user;
    if (!user) {
      throw new UnauthorizedException();
    }
    if (user.profileType !== 'STAFF' || !user.tenantId) {
      return true;
    }
    if (user.impersonatedBy) {
      return true;
    }

    const state = await this.platformAccess.evaluate(user.tenantId);
    if (state === 'ok') {
      return true;
    }

    const allowed = this.reflector.getAllAndOverride<boolean>(
      ALLOW_WHEN_LIMITED_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (allowed) {
      return true;
    }

    throw new ForbiddenException(
      'Plan Faciliter vencido. Renová el plan en Plan / Uso.',
    );
  }
}
