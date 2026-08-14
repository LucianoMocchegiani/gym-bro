import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import type { AuthUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ListQueryDto, ListResult } from '../common/list';
import { RequirePermission } from '../roles/decorators/require-permission.decorator';
import { CurrentTenant } from '../tenant/decorators/current-tenant.decorator';
import { RequireTenantAuth } from '../tenant/decorators/require-tenant-auth.decorator';
import { FailCredentialOfferDto } from './dto/fail-credential-offer.dto';
import { IssueStaffCredentialOfferDto } from './dto/issue-staff-credential-offer.dto';
import {
  CredentialOfferListItem,
  KuatiaOfferService,
} from './kuatia-offer.service';
import {
  KuatiaStaffOfferService,
  StaffCredentialOfferListItem,
} from './kuatia-staff-offer.service';

/**
 * Credential offers OID4VCI (bandeja member + listados + offer staff molinete).
 *
 * @remarks Pack: re-oferta = re-POST contrato. Staff acceso: `POST /staff/:id/credential-offers`.
 */
@Controller()
@RequireTenantAuth()
export class CredentialOffersController {
  constructor(
    private readonly offers: KuatiaOfferService,
    private readonly staffOffers: KuatiaStaffOfferService,
  ) {}

  /**
   * Offers del afiliado autenticado (bandeja).
   */
  @Get('me/credential-offers')
  listMine(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: AuthUser,
    @Query() query: ListQueryDto,
  ): Promise<ListResult<CredentialOfferListItem>> {
    if (user.profileType !== 'MEMBER') {
      throw new ForbiddenException('Member profile required');
    }
    return this.offers.listForMember(tenantId, user.userId, query);
  }

  /**
   * Confirma aceptación en wallet (marca `ACCEPTED`; sale de la bandeja PENDING).
   */
  @Post('me/credential-offers/:offerId/accept')
  acceptMine(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: AuthUser,
    @Param('offerId', ParseUUIDPipe) offerId: string,
  ): Promise<CredentialOfferListItem> {
    if (user.profileType !== 'MEMBER') {
      throw new ForbiddenException('Member profile required');
    }
    return this.offers.markAcceptedByMember(tenantId, user.userId, offerId);
  }

  /**
   * Marca offer `FAILED` tras OID4VCI inválido/vencido en wallet.
   */
  @Post('me/credential-offers/:offerId/fail')
  failMine(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: AuthUser,
    @Param('offerId', ParseUUIDPipe) offerId: string,
    @Body() body: FailCredentialOfferDto,
  ): Promise<CredentialOfferListItem> {
    if (user.profileType !== 'MEMBER') {
      throw new ForbiddenException('Member profile required');
    }
    return this.offers.markFailedByMember(
      tenantId,
      user.userId,
      offerId,
      body?.reason,
    );
  }

  /**
   * Offers de un afiliado (staff; incluye `lastError`).
   */
  @Get('members/:memberId/credential-offers')
  @RequirePermission('members.read')
  listForMember(
    @CurrentTenant() tenantId: string,
    @Param('memberId', ParseUUIDPipe) memberId: string,
    @Query() query: ListQueryDto,
  ): Promise<ListResult<CredentialOfferListItem>> {
    return this.offers.listForMember(tenantId, memberId, query, {
      includeLastError: true,
    });
  }

  /**
   * Offers de credencial de acceso de un staff (`staff.read`).
   */
  @Get('staff/:staffId/credential-offers')
  @RequirePermission('staff.read')
  listForStaffUser(
    @CurrentTenant() tenantId: string,
    @Param('staffId', ParseUUIDPipe) staffId: string,
    @Query() query: ListQueryDto,
  ): Promise<ListResult<StaffCredentialOfferListItem>> {
    return this.staffOffers.listForStaff(tenantId, staffId, query);
  }

  /**
   * Emite o re-emite offer de acceso staff (`staff.write`). Soft-fail Kuatia.
   */
  @Post('staff/:staffId/credential-offers')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermission('staff.write')
  issueForStaffUser(
    @CurrentTenant() tenantId: string,
    @Param('staffId', ParseUUIDPipe) staffId: string,
    @Body() body: IssueStaffCredentialOfferDto,
  ): Promise<StaffCredentialOfferListItem> {
    return this.staffOffers.ensureOfferForStaff(tenantId, staffId, {
      force: body?.force ?? true,
    });
  }
}
