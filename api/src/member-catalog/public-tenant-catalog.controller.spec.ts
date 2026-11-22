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
    );

    await expect(controller.listPacks('gym')).resolves.toMatchObject({
      packs: [{ id: 'visible' }],
    });
  });
});
