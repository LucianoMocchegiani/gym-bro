import {
  Body,
  ConflictException,
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
import { AccessProvider } from '@prisma/client';
import type { AuthUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ListQueryDto, ListResult } from '../common/list';
import { RequirePermission } from '../roles/decorators/require-permission.decorator';
import { CurrentTenant } from '../tenant/decorators/current-tenant.decorator';
import { RequirePlatformModule } from '../tenant/decorators/require-platform-module.decorator';
import { RequireTenantAuth } from '../tenant/decorators/require-tenant-auth.decorator';
import { TenantSettingsService } from '../tenant-settings/tenant-settings.service';
import { FailCredentialOfferDto } from './dto/fail-credential-offer.dto';
import { IssueMemberCredentialOfferDto } from './dto/issue-member-credential-offer.dto';
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
 * @remarks Pack: re-oferta = POST del pack que cubre hoy (`packId` opcional).
 * Staff acceso: `POST /staff/:id/credential-offers`.
 * Bandeja propia staff: `GET /me/staff-credential-offers` (no mezcla packs).
 */
@Controller()
@RequireTenantAuth()
@RequirePlatformModule('club')
export class CredentialOffersController {
  constructor(
    private readonly offers: KuatiaOfferService,
    private readonly staffOffers: KuatiaStaffOfferService,
    private readonly tenantSettings: TenantSettingsService,
  ) {}

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

  @Post('me/credential-offers')
  @HttpCode(HttpStatus.CREATED)
  async issueMine(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: AuthUser,
  ): Promise<CredentialOfferListItem> {
    if (user.profileType !== 'MEMBER') {
      throw new ForbiddenException('Member profile required');
    }
    await this.assertEmitsInKuatia(tenantId);
    return this.offers.ensureOfferForCurrentContract(tenantId, user.userId);
  }

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
    return this.offers.markFailedByMember(tenantId, user.userId, offerId, body?.reason);
  }

  @Get('me/staff-credential-offers')
  listMyStaffOffers(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: AuthUser,
    @Query() query: ListQueryDto,
  ): Promise<ListResult<StaffCredentialOfferListItem>> {
    if (user.profileType !== 'STAFF') {
      throw new ForbiddenException('Staff profile required');
    }
    return this.staffOffers.listForStaff(tenantId, user.userId, query);
  }

  @Post('me/staff-credential-offers')
  @HttpCode(HttpStatus.CREATED)
  async issueMyStaffOffer(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: AuthUser,
  ): Promise<StaffCredentialOfferListItem> {
    if (user.profileType !== 'STAFF') {
      throw new ForbiddenException('Staff profile required');
    }
    await this.assertEmitsInKuatia(tenantId);
    return this.staffOffers.ensureOfferForStaff(tenantId, user.userId, { force: true });
  }

  @Post('me/staff-credential-offers/:offerId/accept')
  acceptMyStaffOffer(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: AuthUser,
    @Param('offerId', ParseUUIDPipe) offerId: string,
  ): Promise<StaffCredentialOfferListItem> {
    if (user.profileType !== 'STAFF') {
      throw new ForbiddenException('Staff profile required');
    }
    return this.staffOffers.markAcceptedByStaff(tenantId, user.userId, offerId);
  }

  @Post('me/staff-credential-offers/:offerId/fail')
  failMyStaffOffer(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: AuthUser,
    @Param('offerId', ParseUUIDPipe) offerId: string,
    @Body() body: FailCredentialOfferDto,
  ): Promise<StaffCredentialOfferListItem> {
    if (user.profileType !== 'STAFF') {
      throw new ForbiddenException('Staff profile required');
    }
    return this.staffOffers.markFailedByStaff(tenantId, user.userId, offerId, body?.reason);
  }

  @Get('members/:memberId/credential-offers')
  @RequirePermission('members.read')
  listForMember(
    @CurrentTenant() tenantId: string,
    @Param('memberId', ParseUUIDPipe) memberId: string,
    @Query() query: ListQueryDto,
  ): Promise<ListResult<CredentialOfferListItem>> {
    return this.offers.listForMember(tenantId, memberId, query, { includeLastError: true });
  }

  @Post('members/:memberId/credential-offers')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermission('members.write')
  async issueForMemberCurrentContract(
    @CurrentTenant() tenantId: string,
    @Param('memberId', ParseUUIDPipe) memberId: string,
    @Body() body: IssueMemberCredentialOfferDto,
  ): Promise<CredentialOfferListItem> {
    await this.assertEmitsInKuatia(tenantId);
    return this.offers.ensureOfferForCurrentContract(tenantId, memberId, {
      force: body?.force ?? true,
      packId: body?.packId,
    });
  }

  @Get('staff/:staffId/credential-offers')
  @RequirePermission('staff.read')
  listForStaffUser(
    @CurrentTenant() tenantId: string,
    @Param('staffId', ParseUUIDPipe) staffId: string,
    @Query() query: ListQueryDto,
  ): Promise<ListResult<StaffCredentialOfferListItem>> {
    return this.staffOffers.listForStaff(tenantId, staffId, query);
  }

  @Post('staff/:staffId/credential-offers')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermission('staff.write')
  async issueForStaffUser(
    @CurrentTenant() tenantId: string,
    @Param('staffId', ParseUUIDPipe) staffId: string,
    @Body() body: IssueStaffCredentialOfferDto,
  ): Promise<StaffCredentialOfferListItem> {
    await this.assertEmitsInKuatia(tenantId);
    return this.staffOffers.ensureOfferForStaff(tenantId, staffId, { force: body?.force ?? true });
  }

  private async assertEmitsInKuatia(tenantId: string): Promise<void> {
    const provider = await this.tenantSettings.getAccessProvider(tenantId);
    if (provider !== AccessProvider.KUATIA) {
      throw new ConflictException('Este tenant usa acceso ZKTeco: no se emiten credenciales en Kuatia.');
    }
  }
}
