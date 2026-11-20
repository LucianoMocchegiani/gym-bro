import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { MercadoPagoAccountService } from './mercadopago-account.service';
import { CreateMercadoPagoQrSetupDto } from './dto/create-mercadopago-qr-setup.dto';
import { HttpMpQrAdapter } from './http-mp-qr.adapter';

export type MercadoPagoQrSetupStatus = {
  configured: boolean;
  storeId: string | null;
  posId: string | null;
};

@Injectable()
export class MercadoPagoQrService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly account: MercadoPagoAccountService,
    private readonly mp: HttpMpQrAdapter,
  ) {}

  async getSetup(tenantId: string): Promise<MercadoPagoQrSetupStatus> {
    const [account, setup] = await Promise.all([
      this.prisma.mercadoPagoAccount.findUnique({ where: { tenantId } }),
      this.prisma.mercadoPagoQrSetup.findUnique({ where: { tenantId } }),
    ]);
    const belongsToConnectedAccount =
      !!account?.mpUserId && setup?.mpUserId === account.mpUserId;
    return {
      configured: belongsToConnectedAccount && !!setup?.posId,
      storeId: belongsToConnectedAccount ? setup?.storeId ?? null : null,
      posId: belongsToConnectedAccount ? setup?.posId ?? null : null,
    };
  }

  async createSetup(
    tenantId: string,
    dto: CreateMercadoPagoQrSetupDto,
    actor: { profileType: 'STAFF' | 'MEMBER' | 'IDENTITY'; userId: string },
  ): Promise<MercadoPagoQrSetupStatus> {
    const account = await this.prisma.mercadoPagoAccount.findUnique({
      where: { tenantId },
    });
    if (!account) {
      throw new NotFoundException('Mercado Pago account not connected');
    }

    const accessToken = await this.account.getDecryptedAccessToken(tenantId);
    let mpUserId: string;
    try {
      mpUserId = (await this.mpAccountValidation(accessToken)).userId;
    } catch {
      throw new BadRequestException(
        'No se pudo validar la conexión con Mercado Pago. Reconectá la cuenta e intentá de nuevo.',
      );
    }

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { name: true },
    });
    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    let setup = await this.prisma.mercadoPagoQrSetup.findUnique({
      where: { tenantId },
    });
    if (setup?.mpUserId === mpUserId && setup.posId) {
      return { configured: true, storeId: setup.storeId, posId: setup.posId };
    }
    if (!setup || setup.mpUserId !== mpUserId) {
      setup = await this.prisma.mercadoPagoQrSetup.upsert({
        where: { tenantId },
        create: { tenantId, mpUserId },
        update: { mpUserId, storeId: null, posId: null },
      });
    }

    try {
      if (!setup.storeId) {
        const storeId = await this.mp.createStore({
          accessToken,
          userId: mpUserId,
          name: tenant.name,
          externalId: `gb${tenantId.replaceAll('-', '')}`,
          streetName: dto.streetName.trim(),
          streetNumber: dto.streetNumber.trim(),
          cityName: dto.cityName.trim(),
          stateName: dto.stateName.trim(),
          latitude: dto.latitude,
          longitude: dto.longitude,
        });
        setup = await this.prisma.mercadoPagoQrSetup.update({
          where: { tenantId },
          data: { storeId },
        });
      }

      if (!setup.posId) {
        const posId = await this.mp.createPos({
          accessToken,
          storeId: setup.storeId!,
          externalId: `gp${tenantId.replaceAll('-', '')}`,
          idempotencyKey: `gymbro-qr-pos-${tenantId}`,
        });
        setup = await this.prisma.mercadoPagoQrSetup.update({
          where: { tenantId },
          data: { posId },
        });
      }
    } catch {
      throw new BadGatewayException(
        'Mercado Pago no pudo crear la sucursal o la caja QR. La sucursal creada, si la hubo, se conservará para reintentar.',
      );
    }

    await this.audit.record({
      tenantId,
      actor,
      action: 'mp.qr.setup',
      entityType: 'MercadoPagoQrSetup',
      entityId: tenantId,
      after: { storeId: setup.storeId, posId: setup.posId },
    });

    return { configured: true, storeId: setup.storeId, posId: setup.posId };
  }

  private async mpAccountValidation(
    accessToken: string,
  ): Promise<{ userId: string }> {
    return this.account['mp'].validateAccessToken(accessToken);
  }
}
