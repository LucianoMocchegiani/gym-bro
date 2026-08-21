import { Controller, ForbiddenException, Get, Query } from '@nestjs/common';
import type { AuthUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ListResult } from '../common/list';
import { PacksService } from '../packs/packs.service';
import { SessionsService } from '../sessions/sessions.service';
import { CurrentTenant } from '../tenant/decorators/current-tenant.decorator';
import { RequireTenantAuth } from '../tenant/decorators/require-tenant-auth.decorator';
import { MemberListSessionsQueryDto } from './dto/member-catalog.dto';
import { MemberPackDetail, MemberSessionDetail } from './member-catalog.types';

/**
 * Catálogo del afiliado (mobile): sesiones publicadas y packs activos.
 *
 * @remarks E9. Sin permisos staff: basta perfil MEMBER autenticado en el tenant.
 */
@Controller()
@RequireTenantAuth()
export class MemberCatalogController {
  constructor(
    private readonly sessions: SessionsService,
    private readonly packs: PacksService,
  ) {}

  @Get('me/sessions')
  listSessions(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: AuthUser,
    @Query() query: MemberListSessionsQueryDto,
  ): Promise<ListResult<MemberSessionDetail>> {
    if (user.profileType !== 'MEMBER') {
      throw new ForbiddenException('Member profile required');
    }
    return this.sessions.listForMember(tenantId, query);
  }

  @Get('me/packs')
  listPacks(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: AuthUser,
  ): Promise<MemberPackDetail[]> {
    if (user.profileType !== 'MEMBER') {
      throw new ForbiddenException('Member profile required');
    }
    return this.packs.listForMember(tenantId);
  }
}
