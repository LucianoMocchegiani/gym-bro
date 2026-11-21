import { BadGatewayException, BadRequestException } from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMercadoPagoQrSetupDto } from './dto/create-mercadopago-qr-setup.dto';
import { HttpMpQrAdapter, MpQrApiError } from './http-mp-qr.adapter';
import { MercadoPagoAccountService } from './mercadopago-account.service';
import { MercadoPagoQrService } from './mercadopago-qr.service';
import { MpAccountPort } from './mp-account.port';

describe('MercadoPagoQrService', () => {
  it('returns store validation details so the user can correct the input', async () => {
    const setup = {
      tenantId: 'tenant-id',
      mpUserId: 'seller-1',
      storeId: null,
      posId: null,
    };
    const prisma = {
      mercadoPagoAccount: {
        findUnique: jest
          .fn()
          .mockResolvedValue({ mpUserId: 'seller-1' }),
        update: jest.fn().mockResolvedValue(undefined),
      },
      mercadoPagoQrSetup: {
        findUnique: jest.fn().mockResolvedValue(null),
        upsert: jest.fn().mockResolvedValue(setup),
        update: jest.fn().mockResolvedValue(setup),
      },
      tenant: {
        findUnique: jest.fn().mockResolvedValue({ name: 'Gym' }),
      },
    } as unknown as PrismaService;
    const service = new MercadoPagoQrService(
      prisma,
      {} as AuditService,
      {
        getDecryptedAccessToken: jest.fn().mockResolvedValue('secret'),
      } as unknown as MercadoPagoAccountService,
      {
        findStoreByExternalId: jest.fn().mockResolvedValue(null),
        createStore: jest.fn().mockRejectedValue(
          new MpQrApiError('store', 400, 'location.city_name was invalid'),
        ),
      } as unknown as HttpMpQrAdapter,
      {
        validateAccessToken: jest.fn().mockResolvedValue({ userId: 'seller-1' }),
      } as unknown as MpAccountPort,
    );

    await expect(
      service.createSetup('tenant-id', {} as CreateMercadoPagoQrSetupDto, {
        profileType: 'STAFF',
        userId: 'staff',
      }),
    ).rejects.toThrow(
      'Mercado Pago rechazó los datos de la sucursal: location.city_name was invalid',
    );
  });

  it('reuses a created store after a failed POS call and is idempotent once configured', async () => {
    type SavedSetup = {
      tenantId: string;
      mpUserId: string;
      storeId: string | null;
      posId: string | null;
    };
    const saved: { row: SavedSetup | null } = { row: null };
    const qrSetup = {
      findUnique: jest.fn(() => Promise.resolve(saved.row)),
      upsert: jest.fn(
        (args: { create: SavedSetup; update: Partial<SavedSetup> }) => {
          saved.row = saved.row
            ? { ...saved.row, ...args.update }
            : args.create;
          return Promise.resolve(saved.row);
        },
      ),
      update: jest.fn((args: { data: Partial<SavedSetup> }) => {
        if (!saved.row) {
          throw new Error('Setup was not initialized');
        }
        saved.row = { ...saved.row, ...args.data };
        return Promise.resolve(saved.row);
      }),
    };
    const prisma = {
      mercadoPagoAccount: {
        findUnique: jest.fn().mockResolvedValue({ mpUserId: 'seller-1' }),
        update: jest.fn().mockResolvedValue(undefined),
      },
      mercadoPagoQrSetup: qrSetup,
      tenant: { findUnique: jest.fn().mockResolvedValue({ name: 'Gym' }) },
    } as unknown as PrismaService;
    const account = {
      getDecryptedAccessToken: jest.fn().mockResolvedValue('secret'),
    } as unknown as MercadoPagoAccountService;
    const mpAccount = {
      validateAccessToken: jest.fn().mockResolvedValue({ userId: 'seller-1' }),
    } as unknown as MpAccountPort;
    const findStoreByExternalId = jest.fn().mockResolvedValue(null);
    const createStore = jest.fn().mockResolvedValue('store-1');
    const createPos = jest
      .fn()
      .mockRejectedValueOnce(new Error('temporary'))
      .mockResolvedValue('pos-1');
    const mpQr = {
      findStoreByExternalId,
      createStore,
      createPos,
    } as unknown as HttpMpQrAdapter;
    const auditRecord = jest.fn().mockResolvedValue(undefined);
    const audit = { record: auditRecord } as unknown as AuditService;
    const service = new MercadoPagoQrService(
      prisma,
      audit,
      account,
      mpQr,
      mpAccount,
    );
    const dto = {
      streetName: 'Calle 1',
      streetNumber: '10',
      cityName: 'Ciudad',
      stateName: 'Provincia',
      latitude: -34,
      longitude: -58,
    };
    const actor = { profileType: 'STAFF' as const, userId: 'staff' };

    await expect(service.createSetup('tenant-id', dto, actor)).rejects.toThrow(
      BadGatewayException,
    );
    expect(saved.row?.storeId).toBe('store-1');
    expect(saved.row?.posId).toBeNull();

    await expect(service.createSetup('tenant-id', dto, actor)).resolves.toEqual(
      {
        configured: true,
        storeId: 'store-1',
        posId: 'pos-1',
      },
    );
    await service.createSetup('tenant-id', dto, actor);
    expect(findStoreByExternalId).toHaveBeenCalledTimes(1);
    expect(createStore).toHaveBeenCalledTimes(1);
    expect(createPos).toHaveBeenCalledTimes(2);
    expect(auditRecord).toHaveBeenCalledTimes(1);
  });

  it('rejects when Mercado Pago cannot validate the connected token', async () => {
    const prisma = {
      mercadoPagoAccount: {
        findUnique: jest.fn().mockResolvedValue({ mpUserId: null }),
      },
    } as unknown as PrismaService;
    const account = {
      getDecryptedAccessToken: jest.fn().mockResolvedValue('secret'),
    } as unknown as MercadoPagoAccountService;
    const service = new MercadoPagoQrService(
      prisma,
      {} as AuditService,
      account,
      {} as HttpMpQrAdapter,
      {
        validateAccessToken: jest.fn().mockRejectedValue(new Error()),
      } as unknown as MpAccountPort,
    );
    await expect(
      service.createSetup('tenant-id', {} as CreateMercadoPagoQrSetupDto, {
        profileType: 'STAFF',
        userId: 'staff',
      }),
    ).rejects.toThrow(BadRequestException);
  });
});
