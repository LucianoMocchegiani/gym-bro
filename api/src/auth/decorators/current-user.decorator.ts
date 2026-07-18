import {
  createParamDecorator,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { AuthUser } from '../auth.types';

type RequestWithUser = Request & { user?: AuthUser };

/**
 * Extrae el {@link AuthUser} del request autenticado.
 *
 * @throws {UnauthorizedException} Si no hay usuario en el request.
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthUser => {
    const request = ctx.switchToHttp().getRequest<RequestWithUser>();
    if (!request.user) {
      throw new UnauthorizedException();
    }
    return request.user;
  },
);
