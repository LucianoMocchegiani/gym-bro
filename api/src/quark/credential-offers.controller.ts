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
 * Credential offers OID4VCI (bandeja + re-oferta staff).
 *
 * @remarks Accept wallet queda fuera de este slice. Respuesta slim (sin claims).
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
   * @remarks Idempotente: si ya hay `PENDING` con URI, lo reutiliza.
   * Si `FAILED` (o no hay fila), reconstruye claims desde el contrato y llama a Quark.
   */
  @Post('contracts/:contractId/credential-offer')
  @RequirePermission('members.write')
  reofferForContract(
    @CurrentTenant() tenantId: string,
    @Param('contractId', ParseUUIDPipe) contractId: string,
  ): Promise<CredentialOfferListItem> {
    return this.offers.ensureOfferForContract(tenantId, contractId);
  }
}
