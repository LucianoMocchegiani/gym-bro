import { NotFoundException } from '@nestjs/common';
import { PlatformPlansService } from '../platform-plans/platform-plans.service';
import { PublicTenantCatalogController } from './public-tenant-catalog.controller';

describe('PublicTenantCatalogController', () => {
  it('omits hidden packs only from the public landing catalog', async () => {
    const controller = new PublicTenantCatalogController(
      {
        findPublicBySlug: jest
          .fn()
          .mockResolvedValue({ id: 'tenant-id', name: 'Gym', slug: 'gym' }),
      } as never,
      {
        listForMember: jest
          .fn()
          .mockResolvedValue([{ id: 'visible' }, { id: 'hidden' }]),
      } as never,
      {
        visiblePackIds: jest.fn().mockResolvedValue(new Set(['visible'])),
      } as never,
      { getStatus: jest.fn().mockResolvedValue({ connected: false }) } as never,
      { getPublicContent: jest.fn().mockResolvedValue(null) } as never,
      {
        getTenantModules: jest.fn().mockResolvedValue(['club']),
      } as unknown as PlatformPlansService,
    );

    await expect(controller.listPacks('gym')).resolves.toMatchObject({
      packs: [{ id: 'visible' }],
    });
  });

  it('does not expose the Club catalog on an ecommerce-only tenant', async () => {
    const listForMember = jest.fn();
    const controller = new PublicTenantCatalogController(
      {
        findPublicBySlug: jest
          .fn()
          .mockResolvedValue({ id: 'tenant-id', name: 'Shop', slug: 'shop' }),
      } as never,
      { listForMember } as never,
      {} as never,
      {} as never,
      {} as never,
      {
        getTenantModules: jest.fn().mockResolvedValue(['ecommerce']),
      } as unknown as PlatformPlansService,
    );

    await expect(controller.listPacks('shop')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(listForMember).not.toHaveBeenCalled();
  });
});
