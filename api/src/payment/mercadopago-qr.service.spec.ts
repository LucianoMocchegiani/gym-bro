import { BadGatewayException, BadRequestException } from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { MercadoPagoAccountService } from './mercadopago-account.service';
import { CreateMercadoPagoQrSetupDto } from './dto/create-mercadopago-qr-setup.dto';
import { HttpMpQrAdapter } from './http-mp-qr.adapter';
import { MercadoPagoQrService } from './mercadopago-qr.service';

 describe('MercadoPagoQrService', () => {
  it('reuses a created store after a failed POS call and is idempotent once configured', async () => {
    let row: { tenantId: string; mpUserId: string; storeId: string | null; posId: string | null } | null = null;
    const prisma = {
      mercadoPagoAccount: { findUnique: jest.fn().mockResolvedValue({ mpUserId: 'seller-1' }) },
      mercadoPagoQrSetup: {
        findUnique: jest.fn(() => Promise.resolve(row)),
        upsert: jest.fn(({ create, update }) => {
          row = row ? { ...row, ...update } : create;
          return Promise.resolve(row);
        }),
        update: jest.fn(({ data }) => {
          row = { ...row!, ...data };
          return Promise.resolve(row);
        }),
      },
      tenant: { findUnique: jest.fn().mockResolvedValue({ name: 'Gym' }) },
    } as unknown as PrismaService;
    const account = {
      getDecryptedAccessToken: jest.fn().mockResolvedValue('secret'),
      mp: { validateAccessToken: jest.fn().mockResolvedValue({ userId: 'seller-1' }) },
    } as unknown as MercadoPagoAccountService;
    const mp = {
      createStore: jest.fn().mockResolvedValue('store-1'),
      createPos: jest.fn().mockRejectedValueOnce(new Error('temporary')).mockResolvedValue('pos-1'),
    } as unknown as HttpMpQrAdapter;
    const audit = { record: jest.fn().mockResolvedValue(undefined) } as unknown as AuditService;
    const service = new MercadoPagoQrService(prisma, audit, account, mp);
    const dto = {
      streetName: 'Calle 1', streetNumber: '10', cityName: 'Ciudad', stateName: 'Provincia', latitude: -34, longitude: -58,
    } as CreateMercadoPagoQrSetupDto;
    const actor = { profileType: 'STAFF' as const, userId: 'staff' };

    await expect(service.createSetup('tenant-id', dto, actor)).rejects.toThrow(BadGatewayException);
    expect(row?.storeId).toBe('store-1');
    expect(row?.posId).toBeNull();

    await expect(service.createSetup('tenant-id', dto, actor)).resolves.toEqual({
      configured: true, storeId: 'store-1', posId: 'pos-1',
    });
    await service.createSetup('tenant-id', dto, actor);
    expect(mp.createStore).toHaveBeenCalledTimes(1);
    expect(mp.createPos).toHaveBeenCalledTimes(2);
    expect(audit.record).toHaveBeenCalledTimes(1);
  });

  it('rejects without a usable connected MP token', async () => {
    const prisma = {
      mercadoPagoAccount: { findUnique: jest.fn().mockResolvedValue({ mpUserId: null }) },
      tenant: { findUnique: jest.fn() },
    } as unknown as PrismaService;
    const account = { getDecryptedAccessToken: jest.fn().mockResolvedValue('secret'), mp: { validateAccessToken: jest.fn().mockRejectedValue(new Error()) } } as unknown as MercadoPagoAccountService;
    const service = new MercadoPagoQrService(prisma, {} as AuditService, account, {} as HttpMpQrAdapter);
    await expect(service.createSetup('tenant-id', {} as CreateMercadoPagoQrSetupDto, { profileType: 'STAFF', userId: 'staff' })).rejects.toThrow(BadRequestException);
  });
});
