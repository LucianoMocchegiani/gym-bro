import {
  Body,
  Controller,
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
import { RequireSuperAuth } from '../auth/decorators/require-super-auth.decorator';
import { toAuditActor } from '../audit/to-audit-actor';
import { CreateReservationDto } from './dto/reservation.dto';
import { ReservationsService } from './reservations.service';
import { ReservationDetail } from './reservations.types';

/**
 * Reservas por tenant (Super Admin).
 */
@Controller('tenants/:tenantId')
@RequireSuperAuth()
export class SuperReservationsController {
  constructor(private readonly reservationsService: ReservationsService) {}

  @Post('members/:memberId/reservations')
  @HttpCode(HttpStatus.CREATED)
  createForMember(
    @Param('tenantId', ParseUUIDPipe) tenantId: string,
    @Param('memberId', ParseUUIDPipe) memberId: string,
    @CurrentUser() user: AuthUser,
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
  listByMember(
    @Param('tenantId', ParseUUIDPipe) tenantId: string,
    @Param('memberId', ParseUUIDPipe) memberId: string,
    @Query('status', new ParseEnumPipe(ReservationStatus, { optional: true }))
    status?: ReservationStatus,
  ): Promise<ReservationDetail[]> {
    return this.reservationsService.listByMember(tenantId, memberId, {
      status,
    });
  }

  @Get('reservations/:reservationId')
  findOne(
    @Param('tenantId', ParseUUIDPipe) tenantId: string,
    @Param('reservationId', ParseUUIDPipe) reservationId: string,
  ): Promise<ReservationDetail> {
    return this.reservationsService.findOne(tenantId, reservationId);
  }
}
