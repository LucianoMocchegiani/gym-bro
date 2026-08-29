import { Controller, ForbiddenException, Get, Query } from '@nestjs/common';
import type { AuthUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ListResult } from '../common/list';
import { MercadoPagoAccountService } from '../payment/mercadopago-account.service';
import { PacksService } from '../packs/packs.service';
import { SessionsService } from '../sessions/sessions.service';
import { CurrentTenant } from '../tenant/decorators/current-tenant.decorator';
import { RequireTenantAuth } from '../tenant/decorators/require-tenant-auth.decorator';
import { MemberListSessionsQueryDto } from './dto/member-catalog.dto';
import {
  MemberPackDetail,
  MemberSessionDetail,
  MpStatus,
} from './member-catalog.types';

/**
 * Catálogo del afiliado (mobile): sesiones, packs y estado MP (E9).
 *
 * @remarks Sin permisos staff: basta perfil MEMBER autenticado en el tenant.
 */
@Controller()
@RequireTenantAuth()
export class MemberCatalogController {
  constructor(
    private readonly sessions: SessionsService,
    private readonly packs: PacksService,
    private readonly mp: MercadoPagoAccountService,
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

  @Get('me/mp-status')
  async mpStatus(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: AuthUser,
  ): Promise<MpStatus> {
    if (user.profileType !== 'MEMBER') {
      throw new ForbiddenException('Member profile required');
    }
    const status = await this.mp.getStatus(tenantId);
    return { connected: status.connected };
  }
}
