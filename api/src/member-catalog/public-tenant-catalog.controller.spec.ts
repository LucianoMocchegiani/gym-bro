import { PublicTenantCatalogController } from './public-tenant-catalog.controller';

describe('PublicTenantCatalogController', () => {
  const tenant = { id: 'tenant-id', name: 'Shop', slug: 'shop' };
  const tenants = { findPublicBySlug: jest.fn().mockResolvedValue(tenant) };
  const packs = { listForMember: jest.fn().mockResolvedValue([]) };
  const visibility = {
    visiblePackIds: jest.fn().mockResolvedValue(new Set()),
  };
  const mp = { getStatus: jest.fn().mockResolvedValue({ connected: false }) };
  const site = { getPublicContent: jest.fn().mockResolvedValue(null) };
  const products = { list: jest.fn().mockResolvedValue({ items: [] }) };

  function create(modules: string[]) {
    return new PublicTenantCatalogController(
      tenants as never,
      packs as never,
      visibility as never,
      mp as never,
      site as never,
      products as never,
      { getTenantModules: jest.fn().mockResolvedValue(modules) } as never,
    );
  }

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('omits hidden packs from the public landing catalog', async () => {
    packs.listForMember.mockResolvedValue([
      { id: 'visible' },
      { id: 'hidden' },
    ]);
    visibility.visiblePackIds.mockResolvedValue(new Set(['visible']));
    const result = await create(['club']).listPacks('shop');
    expect(result.packs).toEqual([{ id: 'visible' }]);
    expect(result.hasPlans).toBe(true);
    expect(result.hasProducts).toBe(false);
  });

  it('allows an ecommerce-only tenant to load its public storefront without exposing Club packs',
    async () => {
      const result = await create(['ecommerce']).listPacks('shop');
      expect(result).toMatchObject({
        packs: [],
        hasPlans: false,
        hasProducts: true,
        onlineCheckout: false,
        site: null,
      });
      expect(packs.listForMember).not.toHaveBeenCalled();
    });

  it('serves products only when the tenant has E-commerce', async () => {
    const controller = create(['ecommerce']);
    const query = { page: 2, pageSize: 6 };
    await controller.listProducts('shop', query);
    expect(products.list).toHaveBeenCalledWith(tenant.id, query);
    await expect(create(['club']).listProducts('shop', query)).rejects.toThrow();
  });
});
