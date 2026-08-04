import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import type { AuthUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequireSuperAuth } from '../auth/decorators/require-super-auth.decorator';
import { toAuditActor } from '../audit/to-audit-actor';
import { ListResult } from '../common/list';
import {
  CreateReservationDto,
  ListReservationsQueryDto,
  UpdateReservationStatusDto,
} from './dto/reservation.dto';
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
    @Query() query: ListReservationsQueryDto,
  ): Promise<ListResult<ReservationDetail>> {
    return this.reservationsService.listByMember(tenantId, memberId, query);
  }

  @Get('reservations/:reservationId')
  findOne(
    @Param('tenantId', ParseUUIDPipe) tenantId: string,
    @Param('reservationId', ParseUUIDPipe) reservationId: string,
  ): Promise<ReservationDetail> {
    return this.reservationsService.findOne(tenantId, reservationId);
  }

  @Patch('reservations/:reservationId/status')
  cancel(
    @Param('tenantId', ParseUUIDPipe) tenantId: string,
    @Param('reservationId', ParseUUIDPipe) reservationId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateReservationStatusDto,
  ): Promise<ReservationDetail> {
    return this.reservationsService.cancel(
      tenantId,
      reservationId,
      dto,
      toAuditActor(user),
    );
  }
}
