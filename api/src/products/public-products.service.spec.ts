import { PublicProductsService } from './public-products.service';

describe('PublicProductsService', () => {
  it('returns only active storefront fields in the standard paginated shape', async () => {
    const queries: string[] = [];
    const prisma = {
      $queryRaw: (strings: TemplateStringsArray) => {
        const sql = strings.join('');
        queries.push(sql);
        return sql.includes('SELECT id, name')
          ? Promise.resolve([
              {
                id: 'product-1',
                name: 'Botella',
                description: 'Acero',
                price: 1200,
                image_url: null,
                stock_quantity: 25,
              },
            ])
          : Promise.resolve([{ count: 1n }]);
      },
    } as never;
    const service = new PublicProductsService(prisma);

    await expect(service.list('tenant-id', { page: 1, pageSize: 1 })).resolves.toEqual({
      items: [
        {
          id: 'product-1',
          name: 'Botella',
          description: 'Acero',
          price: 1200,
          imageUrl: null,
        },
      ],
      page: 1,
      pageSize: 1,
      total: 1,
      hasMore: false,
    });
    expect(queries.every((query) => query.includes('active = true'))).toBe(true);
    expect(queries[1]).not.toContain('stock_quantity');
  });

  it('clamps requests beyond the last page before querying products', async () => {
    const pages: number[] = [];
    let productQuery = false;
    const prisma = {
      $queryRaw: (strings: TemplateStringsArray, ...values: unknown[]) => {
        const sql = strings.join('');
        if (sql.includes('SELECT id, name')) {
          productQuery = true;
          pages.push(Number(values[1]));
          return Promise.resolve([]);
        }
        return Promise.resolve([{ count: 3n }]);
      },
    } as never;
    const service = new PublicProductsService(prisma);
    const result = await service.list('tenant-id', { page: 9, pageSize: 2 });

    expect(result.page).toBe(2);
    expect(productQuery).toBe(true);
    expect(pages).toEqual([2]);
  });
});
