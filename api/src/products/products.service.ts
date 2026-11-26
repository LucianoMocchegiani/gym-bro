import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
import {
  normalizeListQuery,
  toListResult,
  type ListResult,
} from '../common/list';
import { PrismaService } from '../prisma/prisma.service';
import { UploadService } from '../upload/upload.service';
import {
  CreateProductDto,
  CreateStockAdjustmentDto,
  ListProductsQueryDto,
  UpdateProductDto,
} from './dto/product.dto';
import { calculateStockAfter } from './stock';

type ProductRow = {
  id: string;
  tenant_id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  stock_quantity: number;
  active: boolean;
  created_at: Date;
  updated_at: Date;
};
type MovementRow = {
  id: string;
  type: 'IN' | 'OUT';
  quantity: number;
  quantity_delta: number;
  quantity_after: number;
  reason: string;
  created_by_staff_id: string | null;
  created_by_name: string | null;
  created_at: Date;
};

/**
 * shortcut: phase-1 inventory tables use parameterized SQL until the schema is reorganized for sales; add Prisma models before expanding the product domain.
 */
@Injectable()
export class ProductsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly upload: UploadService,
  ) {}

  async list(
    tenantId: string,
    query: ListProductsQueryDto,
  ): Promise<ListResult<ReturnType<ProductsService['detail']>>> {
    const n = normalizeListQuery(query);
    const filter = Prisma.sql`
      AND (${n.q ?? null}::text IS NULL OR name ILIKE '%' || ${n.q ?? ''} || '%')
      ${query.active === undefined ? Prisma.empty : Prisma.sql`AND active = ${query.active === 'true'}`}
    `;
    const [rows, count] = await Promise.all([
      this.prisma.$queryRaw<ProductRow[]>`
        SELECT * FROM products WHERE tenant_id = ${tenantId}::uuid ${filter}
        ORDER BY created_at DESC LIMIT ${n.take} OFFSET ${n.skip}`,
      this.prisma.$queryRaw<{ count: bigint }[]>`
        SELECT count(*) AS count FROM products WHERE tenant_id = ${tenantId}::uuid ${filter}`,
    ]);
    return toListResult(
      rows.map((row) => this.detail(row)),
      Number(count[0]?.count ?? 0),
      n.page,
      n.pageSize,
    );
  }

  async get(tenantId: string, productId: string) {
    return this.detail(await this.findProduct(tenantId, productId));
  }

  async create(tenantId: string, dto: CreateProductDto) {
    const name = dto.name.trim();
    if (name.length < 2) {
      throw new BadRequestException('El nombre es demasiado corto.');
    }
    this.assertImage(tenantId, dto.imageUrl);
    const [row] = await this.prisma.$queryRaw<ProductRow[]>`
      INSERT INTO products (id, tenant_id, name, description, price, image_url)
      VALUES (
        ${randomUUID()}::uuid, ${tenantId}::uuid, ${name},
        ${dto.description?.trim() || null}, ${dto.price}, ${dto.imageUrl ?? null}
      ) RETURNING *`;
    return this.detail(row);
  }

  async update(tenantId: string, productId: string, dto: UpdateProductDto) {
    if (Object.values(dto).every((value) => value === undefined)) {
      throw new BadRequestException('Indicá al menos un campo para actualizar.');
    }
    const before = await this.findProduct(tenantId, productId);
    const imageUrl = dto.imageUrl === undefined ? before.image_url : dto.imageUrl;
    this.assertImage(tenantId, imageUrl);
    const sets = [
      dto.name === undefined ? null : Prisma.sql`name = ${dto.name.trim()}`,
      dto.description === undefined
        ? null
        : Prisma.sql`description = ${dto.description?.trim() || null}`,
      dto.price === undefined ? null : Prisma.sql`price = ${dto.price}`,
      dto.imageUrl === undefined ? null : Prisma.sql`image_url = ${dto.imageUrl}`,
      dto.active === undefined ? null : Prisma.sql`active = ${dto.active}`,
    ].filter((part): part is Prisma.Sql => part !== null);
    const [row] = await this.prisma.$queryRaw<ProductRow[]>`
      UPDATE products SET ${Prisma.join(sets)}, updated_at = now()
      WHERE id = ${productId}::uuid AND tenant_id = ${tenantId}::uuid RETURNING *`;
    if (!row) throw new NotFoundException('Producto no encontrado.');
    if (dto.imageUrl !== undefined) {
      await this.upload.replaceOwnedPublicImage(
        tenantId,
        before.image_url,
        dto.imageUrl,
      );
    }
    return this.detail(row);
  }

  async remove(tenantId: string, productId: string): Promise<void> {
    const product = await this.findProduct(tenantId, productId);
    await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`
        SELECT id FROM products
        WHERE id = ${productId}::uuid AND tenant_id = ${tenantId}::uuid FOR UPDATE`;
      const [usage] = await tx.$queryRaw<{ count: bigint }[]>`
        SELECT count(*) AS count FROM product_stock_movements
        WHERE product_id = ${productId}::uuid AND tenant_id = ${tenantId}::uuid`;
      if (Number(usage?.count ?? 0) > 0) {
        throw new ConflictException(
          'El producto tiene historial de stock; archiválo para conservarlo.',
        );
      }
      await tx.$executeRaw`
        DELETE FROM products WHERE id = ${productId}::uuid AND tenant_id = ${tenantId}::uuid`;
    });
    await this.upload.replaceOwnedPublicImage(tenantId, product.image_url, null);
  }

  async adjustStock(
    tenantId: string,
    productId: string,
    dto: CreateStockAdjustmentDto,
    staffUserId: string,
  ) {
    const reason = dto.reason.trim();
    if (!reason) throw new BadRequestException('El motivo es obligatorio.');
    return this.prisma.$transaction(async (tx) => {
      const [product] = await tx.$queryRaw<ProductRow[]>`
        SELECT * FROM products
        WHERE id = ${productId}::uuid AND tenant_id = ${tenantId}::uuid FOR UPDATE`;
      if (!product) throw new NotFoundException('Producto no encontrado.');
      const next = calculateStockAfter(
        product.stock_quantity,
        dto.type,
        dto.quantity,
      );
      if (next === null) {
        throw new BadRequestException(
          'El ajuste no puede dejar el stock por debajo de cero.',
        );
      }
      const delta = dto.type === 'IN' ? dto.quantity : -dto.quantity;
      const [updated] = await tx.$queryRaw<ProductRow[]>`
        UPDATE products SET stock_quantity = ${next}, updated_at = now()
        WHERE id = ${productId}::uuid AND tenant_id = ${tenantId}::uuid RETURNING *`;
      const [movement] = await tx.$queryRaw<MovementRow[]>`
        INSERT INTO product_stock_movements
          (id, tenant_id, product_id, type, quantity, quantity_delta,
           quantity_after, reason, created_by_staff_id)
        VALUES (
          ${randomUUID()}::uuid, ${tenantId}::uuid, ${productId}::uuid,
          ${dto.type}, ${dto.quantity}, ${delta}, ${next}, ${reason},
          ${staffUserId}::uuid
        ) RETURNING *, NULL::text AS created_by_name`;
      return { product: this.detail(updated), movement: this.movement(movement) };
    });
  }

  async listMovements(
    tenantId: string,
    productId: string,
    query: ListProductsQueryDto,
  ) {
    await this.findProduct(tenantId, productId);
    const n = normalizeListQuery(query);
    const [rows, count] = await Promise.all([
      this.prisma.$queryRaw<MovementRow[]>`
        SELECT m.*, COALESCE(s.name, s.email) AS created_by_name
        FROM product_stock_movements m
        LEFT JOIN staff_users s ON s.id = m.created_by_staff_id AND s.tenant_id = m.tenant_id
        WHERE m.tenant_id = ${tenantId}::uuid AND m.product_id = ${productId}::uuid
        ORDER BY m.created_at DESC LIMIT ${n.take} OFFSET ${n.skip}`,
      this.prisma.$queryRaw<{ count: bigint }[]>`
        SELECT count(*) AS count FROM product_stock_movements
        WHERE tenant_id = ${tenantId}::uuid AND product_id = ${productId}::uuid`,
    ]);
    return toListResult(
      rows.map((row) => this.movement(row)),
      Number(count[0]?.count ?? 0),
      n.page,
      n.pageSize,
    );
  }

  async uploadImage(
    tenantId: string,
    file: { mimetype: string; size: number; buffer: Buffer },
  ) {
    return this.upload.uploadImage(file, 'products', tenantId);
  }

  private async findProduct(tenantId: string, productId: string): Promise<ProductRow> {
    const [row] = await this.prisma.$queryRaw<ProductRow[]>`
      SELECT * FROM products WHERE id = ${productId}::uuid AND tenant_id = ${tenantId}::uuid`;
    if (!row) throw new NotFoundException('Producto no encontrado.');
    return row;
  }

  private assertImage(tenantId: string, imageUrl: string | null | undefined): void {
    if (imageUrl && !this.upload.isOwnedPublicImage(tenantId, imageUrl, 'products')) {
      throw new BadRequestException('La imagen no pertenece al catálogo de este tenant.');
    }
  }

  private detail(row: ProductRow) {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      price: row.price,
      imageUrl: row.image_url,
      stockQuantity: row.stock_quantity,
      active: row.active,
      createdAt: row.created_at.toISOString(),
      updatedAt: row.updated_at.toISOString(),
    };
  }

  private movement(row: MovementRow) {
    return {
      id: row.id,
      type: row.type,
      quantity: row.quantity,
      quantityDelta: row.quantity_delta,
      quantityAfter: row.quantity_after,
      reason: row.reason,
      createdBy: row.created_by_name,
      createdAt: row.created_at.toISOString(),
    };
  }
}
