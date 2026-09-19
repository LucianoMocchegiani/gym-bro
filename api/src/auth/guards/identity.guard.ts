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
 * Exige JWT de persona (`IDENTITY`), sin tenant de negocio.
 */
@Injectable()
export class IdentityGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const user = request.user;
    if (!user) {
      throw new UnauthorizedException();
    }
    if (user.profileType !== 'IDENTITY') {
      throw new ForbiddenException('Identity session required');
    }
    return true;
  }
}
