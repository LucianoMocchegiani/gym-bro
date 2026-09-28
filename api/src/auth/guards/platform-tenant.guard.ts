import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Request } from 'express';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthUser } from '../auth.types';

type RequestWithUser = Request & { user?: AuthUser };

/**
 * Exige un Staff del tenant de plataforma (`slug === 'admin'`).
 *
 * @remarks La plataforma **no** es un perfil aparte: entra como Staff del tenant
 * `admin` con el rol `super-admin`. Este guard reemplaza al antiguo
 * `RequireSuperAuth` y se combina con `PermissionGuard` para los códigos
 * `platform.*`.
 *
 * @example
 * ```ts
 * @RequirePermission('platform.tenants.write')   // arriba
 * @UseGuards(JwtAuthGuard, PlatformTenantGuard, PermissionGuard)  // abajo
 * ```
 */
@Injectable()
export class PlatformTenantGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Authentication required');
    }
    if (user.profileType !== 'STAFF' || !user.tenantId) {
      throw new ForbiddenException('Platform access requires a staff user');
    }

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: user.tenantId },
      select: { slug: true },
    });

    if (tenant?.slug !== 'admin') {
      throw new ForbiddenException('Platform access requires the admin tenant');
    }
    return true;
  }
}
