import {
  createParamDecorator,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Request } from 'express';
import { AuthUser } from '../../auth/auth.types';

type RequestWithUser = Request & { user?: AuthUser };

/**
 * Devuelve el `tenantId` del JWT (STAFF / MEMBER).
 *
 * @throws {ForbiddenException} Si no hay tenant en el usuario autenticado.
 * @remarks Nunca leer tenant desde body/query (RN-TEN-001).
 */
export const CurrentTenant = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest<RequestWithUser>();
    const tenantId = request.user?.tenantId;
    if (!tenantId) {
      throw new ForbiddenException('Tenant context is required');
    }
    return tenantId;
  },
);
