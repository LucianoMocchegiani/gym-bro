import {
  Body,
  Controller,
  ForbiddenException,
  Get,
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
import {
  CredentialOfferListItem,
  QuarkOfferService,
} from './quark-offer.service';

/**
 * Credential offers OID4VCI (bandeja member + listado staff).
 *
 * @remarks Respuesta slim (sin claims). Re-oferta = re-POST contrato con la
 * misma `idempotencyKey` (`force` en {@link QuarkOfferService.ensureOfferForContract}).
 */
@Controller()
@RequireTenantAuth()
export class CredentialOffersController {
  constructor(private readonly offers: QuarkOfferService) {}

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
   *
   * @remarks La app llama esto solo si OID4VCI trajo ≥1 credencial. Idempotente.
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
   * Marca offer `FAILED` tras OID4VCI inválido/vencido en wallet (sale de bandeja).
   *
   * @remarks No llama a Quark. Conserva `offerUri` + `lastError` para staff.
   * Idempotente si ya `FAILED`. Timeout/red: la app no debe llamar esto.
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
}
