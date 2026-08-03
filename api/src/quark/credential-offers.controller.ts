import {
  Controller,
  ForbiddenException,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import type { AuthUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequirePermission } from '../roles/decorators/require-permission.decorator';
import { CurrentTenant } from '../tenant/decorators/current-tenant.decorator';
import { RequireTenantAuth } from '../tenant/decorators/require-tenant-auth.decorator';
import {
  CredentialOfferListItem,
  QuarkOfferService,
} from './quark-offer.service';

/**
 * Credential offers OID4VCI (bandeja, accept member, re-oferta staff).
 *
 * @remarks Respuesta slim (sin claims). Accept = estado GymBro tras OID4VCI en wallet.
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
  ): Promise<CredentialOfferListItem[]> {
    if (user.profileType !== 'MEMBER') {
      throw new ForbiddenException('Member profile required');
    }
    return this.offers.listForMember(tenantId, user.userId);
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
   * Offers de un afiliado (staff; incluye `lastError`).
   */
  @Get('members/:memberId/credential-offers')
  @RequirePermission('members.read')
  listForMember(
    @CurrentTenant() tenantId: string,
    @Param('memberId', ParseUUIDPipe) memberId: string,
  ): Promise<CredentialOfferListItem[]> {
    return this.offers.listForMember(tenantId, memberId, {
      includeLastError: true,
    });
  }

  /**
   * (Re)emite offer OID4VCI desde un contrato.
   *
   * @remarks Siempre fuerza un offer nuevo en Quark (no reutiliza `PENDING`
   * muerto tras restart del issuer). Los hooks de contrato usan
   * `ensureOfferForContract` sin force.
   */
  @Post('contracts/:contractId/credential-offer')
  @RequirePermission('members.write')
  reofferForContract(
    @CurrentTenant() tenantId: string,
    @Param('contractId', ParseUUIDPipe) contractId: string,
  ): Promise<CredentialOfferListItem> {
    return this.offers.ensureOfferForContract(tenantId, contractId, {
      force: true,
    });
  }
}
