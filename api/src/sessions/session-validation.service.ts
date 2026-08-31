import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { SessionStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { TenantSettingsService } from '../tenant-settings/tenant-settings.service';

type SessionWithService = {
  id: string;
  status: SessionStatus;
  startsAt: Date;
  endsAt: Date;
  capacity: number;
  bookedCount: number;
  serviceId: string;
  service: { id: string; name: string; active: boolean; dropInPrice: number | null; type: string };
  branch: { name: string };
};

/**
 * Validaciones de sesión para drop-in.
 */
@Injectable()
export class SessionValidationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantSettings: TenantSettingsService,
  ) {}

  async validateSessionForDropIn(
    tenantId: string,
    memberId: string,
    sessionId: string,
  ): Promise<SessionWithService> {
    const session = await this.prisma.session.findFirst({
      where: { id: sessionId, tenantId },
      select: {
        id: true,
        status: true,
        startsAt: true,
        endsAt: true,
        capacity: true,
        bookedCount: true,
        serviceId: true,
        service: {
          select: { id: true, name: true, active: true, dropInPrice: true, type: true },
        },
        branch: { select: { name: true } },
      },
    });
    if (!session) {
      throw new NotFoundException('Session not found in tenant');
    }
    if (session.status !== SessionStatus.PUBLISHED) {
      throw new BadRequestException('Session is not published');
    }
    await this.tenantSettings.assertSessionOpenForBooking(tenantId, session);
    if (session.bookedCount >= session.capacity) {
      throw new BadRequestException('Session is full');
    }
    if (!session.service.active) {
      throw new BadRequestException('Service is inactive');
    }
    if (
      session.service.dropInPrice === null ||
      session.service.dropInPrice < 1
    ) {
      throw new BadRequestException(
        'Drop-in is not enabled for this service (set dropInPrice)',
      );
    }
    const existing = await this.prisma.reservation.findFirst({
      where: {
        tenantId,
        memberId,
        sessionId: session.id,
        status: 'CONFIRMED',
      },
      select: { id: true },
    });
    if (existing) {
      throw new ConflictException(
        'Member already has a confirmed reservation for this session',
      );
    }
    return session;
  }
}
