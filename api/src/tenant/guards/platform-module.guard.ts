import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import type { AuthUser } from '../../auth/auth.types';
import { PlatformPlansService } from '../../platform-plans/platform-plans.service';
import { REQUIRED_PLATFORM_MODULE } from '../decorators/require-platform-module.decorator';

type RequestWithUser = Request & { user?: AuthUser };

@Injectable()
export class PlatformModuleGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly plans: PlatformPlansService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<string | string[]>(
      REQUIRED_PLATFORM_MODULE,
      [context.getHandler(), context.getClass()],
    );
    if (!required) return true;

    const user = context.switchToHttp().getRequest<RequestWithUser>().user;
    if (!user?.tenantId || user.impersonatedBy) return true;
    const requiredModules = Array.isArray(required) ? required : [required];
    const tenantModules = await this.plans.getTenantModules(user.tenantId);
    if (requiredModules.some((module) => tenantModules.includes(module))) {
      return true;
    }
    throw new ForbiddenException(
      requiredModules.length === 1
        ? `El plan contratado no incluye el módulo ${requiredModules[0]}.`
        : `El plan contratado no incluye ninguno de los módulos ${requiredModules.join(', ')}.`,
    );
  }
}
