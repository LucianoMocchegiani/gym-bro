import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseEnumPipe,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { ReservationStatus } from '@prisma/client';
import type { AuthUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuditActor } from '../audit/audit.types';
import { toAuditActor } from '../audit/to-audit-actor';
import { RequirePermission } from '../roles/decorators/require-permission.decorator';
import { CurrentTenant } from '../tenant/decorators/current-tenant.decorator';
import { RequireTenantAuth } from '../tenant/decorators/require-tenant-auth.decorator';
import { CreateReservationDto } from './dto/reservation.dto';
import { ReservationsService } from './reservations.service';
import { ReservationDetail } from './reservations.types';

/**
 * Reservas del gym (staff) y propias (afiliado).
 *
 * @remarks CU-RES-001 / CU-RES-002. Staff: `reservations.write`. Member: JWT propio.
 */
@Controller()
@RequireTenantAuth()
export class ReservationsController {
  constructor(private readonly reservationsService: ReservationsService) {}

  @Post('me/reservations')
  @HttpCode(HttpStatus.CREATED)
  createMine(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateReservationDto,
  ): Promise<ReservationDetail> {
    if (user.profileType !== 'MEMBER') {
      throw new ForbiddenException('Member profile required');
    }
    return this.reservationsService.createForMember(
      tenantId,
      user.userId,
      dto,
      this.memberActor(user),
    );
  }

  @Get('me/reservations')
  listMine(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: AuthUser,
    @Query('status', new ParseEnumPipe(ReservationStatus, { optional: true }))
    status?: ReservationStatus,
  ): Promise<ReservationDetail[]> {
    if (user.profileType !== 'MEMBER') {
      throw new ForbiddenException('Member profile required');
    }
    return this.reservationsService.listByMember(tenantId, user.userId, {
      status,
    });
  }

  @Post('members/:memberId/reservations')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermission('reservations.write')
  createForMember(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: AuthUser,
    @Param('memberId', ParseUUIDPipe) memberId: string,
    @Body() dto: CreateReservationDto,
  ): Promise<ReservationDetail> {
    return this.reservationsService.createForMember(
      tenantId,
      memberId,
      dto,
      toAuditActor(user),
    );
  }

  @Get('members/:memberId/reservations')
  @RequirePermission('reservations.write')
  listByMember(
    @CurrentTenant() tenantId: string,
    @Param('memberId', ParseUUIDPipe) memberId: string,
    @Query('status', new ParseEnumPipe(ReservationStatus, { optional: true }))
    status?: ReservationStatus,
  ): Promise<ReservationDetail[]> {
    return this.reservationsService.listByMember(tenantId, memberId, {
      status,
    });
  }

  @Get('reservations/:reservationId')
  @RequirePermission('reservations.write')
  findOne(
    @CurrentTenant() tenantId: string,
    @Param('reservationId', ParseUUIDPipe) reservationId: string,
  ): Promise<ReservationDetail> {
    return this.reservationsService.findOne(tenantId, reservationId);
  }

  private memberActor(user: AuthUser): AuditActor {
    return { profileType: 'MEMBER', userId: user.userId };
  }
}
