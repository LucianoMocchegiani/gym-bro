import {
  BadGatewayException,
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { AuditActor } from '../audit/audit.types';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMercadoPagoQrSetupDto } from './dto/create-mercadopago-qr-setup.dto';
import { HttpMpQrAdapter, MpQrApiError } from './http-mp-qr.adapter';
import { MercadoPagoAccountService } from './mercadopago-account.service';
import { MP_ACCOUNT_PORT, MpAccountPort } from './mp-account.port';

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
    private readonly mpQr: HttpMpQrAdapter,
    @Inject(MP_ACCOUNT_PORT) private readonly mp: MpAccountPort,
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
      storeId: belongsToConnectedAccount ? (setup?.storeId ?? null) : null,
      posId: belongsToConnectedAccount ? (setup?.posId ?? null) : null,
    };
  }

  async createSetup(
    tenantId: string,
    dto: CreateMercadoPagoQrSetupDto,
    actor: AuditActor,
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
      mpUserId = (await this.mp.validateAccessToken(accessToken)).userId;
    } catch {
      throw new BadRequestException(
        'No se pudo validar la conexión con Mercado Pago. Reconectá la cuenta e intentá de nuevo.',
      );
    }
    await this.prisma.mercadoPagoAccount.update({
      where: { tenantId },
      data: { mpUserId, lastValidatedAt: new Date(), lastValidationOk: true },
    });

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
        const externalId = `gb${tenantId.replaceAll('-', '')}`;
        const storeId =
          (await this.mpQr.findStoreByExternalId(
            accessToken,
            mpUserId,
            externalId,
          )) ??
          (await this.mpQr.createStore({
            accessToken,
            userId: mpUserId,
            name: tenant.name,
            externalId,
            streetName: dto.streetName.trim(),
            streetNumber: dto.streetNumber.trim(),
            cityName: dto.cityName.trim(),
            stateName: dto.stateName.trim(),
            latitude: dto.latitude,
            longitude: dto.longitude,
          }));
        setup = await this.prisma.mercadoPagoQrSetup.update({
          where: { tenantId },
          data: { storeId },
        });
      }

      if (!setup.posId) {
        if (!setup.storeId) {
          throw new Error('Mercado Pago store ID missing after creation');
        }
        const posId = await this.mpQr.createPos({
          accessToken,
          storeId: setup.storeId,
          externalId: `gp${tenantId.replaceAll('-', '')}`,
          idempotencyKey: `gymbro-qr-pos-${tenantId}`,
        });
        setup = await this.prisma.mercadoPagoQrSetup.update({
          where: { tenantId },
          data: { posId },
        });
      }
    } catch (error) {
      if (
        error instanceof MpQrApiError &&
        error.operation === 'store' &&
        error.status === 400 &&
        error.detail
      ) {
        throw new BadRequestException(
          `Mercado Pago rechazó los datos de la sucursal: ${error.detail}`,
        );
      }
      throw new BadGatewayException(
        'Mercado Pago no pudo crear la sucursal o la caja QR. Si la sucursal se creó, queda guardada para reintentar.',
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
}
