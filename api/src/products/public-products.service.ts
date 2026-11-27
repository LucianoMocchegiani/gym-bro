import { Injectable } from '@nestjs/common';
import { normalizeListQuery, toListResult } from '../common/list';
import type { ListQueryDto } from '../common/list';
import { PrismaService } from '../prisma/prisma.service';

type PublicProductRow = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
};

@Injectable()
export class PublicProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(tenantId: string, query: ListQueryDto) {
    const n = normalizeListQuery(query);
    const [count] = await this.prisma.$queryRaw<{ count: bigint }[]>`
      SELECT count(*) AS count FROM products
      WHERE tenant_id = ${tenantId}::uuid AND active = true`;
    const total = Number(count?.count ?? 0);
    const page = Math.min(n.page, Math.max(1, Math.ceil(total / n.pageSize)));
    const rows = await this.prisma.$queryRaw<PublicProductRow[]>`
      SELECT id, name, description, price, image_url FROM products
      WHERE tenant_id = ${tenantId}::uuid AND active = true
      ORDER BY created_at DESC LIMIT ${n.take} OFFSET ${(page - 1) * n.pageSize}`;
    return toListResult(
      rows.map(({ id, name, description, price, image_url }) => ({
        id,
        name,
        description,
        price,
        imageUrl: image_url,
      })),
      total,
      page,
      n.pageSize,
    );
  }
}
