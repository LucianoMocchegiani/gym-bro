import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { AuthUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequirePermission } from '../roles/decorators/require-permission.decorator';
import { CurrentTenant } from '../tenant/decorators/current-tenant.decorator';
import { RequirePlatformModule } from '../tenant/decorators/require-platform-module.decorator';
import { RequireTenantAuth } from '../tenant/decorators/require-tenant-auth.decorator';
import {
  CreateProductDto,
  CreateStockAdjustmentDto,
  ListProductsQueryDto,
  UpdateProductDto,
} from './dto/product.dto';
import { ProductsService } from './products.service';

@Controller('products')
@RequireTenantAuth()
@RequirePlatformModule('ecommerce')
export class ProductsController {
  constructor(private readonly products: ProductsService) {}

  @Get()
  @RequirePermission('products.read')
  list(@CurrentTenant() tenantId: string, @Query() query: ListProductsQueryDto) {
    return this.products.list(tenantId, query);
  }

  @Get(':productId/stock-movements')
  @RequirePermission('products.read')
  movements(
    @CurrentTenant() tenantId: string,
    @Param('productId', ParseUUIDPipe) productId: string,
    @Query() query: ListProductsQueryDto,
  ) {
    return this.products.listMovements(tenantId, productId, query);
  }

  @Get(':productId')
  @RequirePermission('products.read')
  get(
    @CurrentTenant() tenantId: string,
    @Param('productId', ParseUUIDPipe) productId: string,
  ) {
    return this.products.get(tenantId, productId);
  }

  @Post()
  @RequirePermission('products.write')
  create(@CurrentTenant() tenantId: string, @Body() dto: CreateProductDto) {
    return this.products.create(tenantId, dto);
  }

  @Patch(':productId')
  @RequirePermission('products.write')
  update(
    @CurrentTenant() tenantId: string,
    @Param('productId', ParseUUIDPipe) productId: string,
    @Body() dto: UpdateProductDto,
  ) {
    return this.products.update(tenantId, productId, dto);
  }

  @Delete(':productId')
  @RequirePermission('products.write')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @CurrentTenant() tenantId: string,
    @Param('productId', ParseUUIDPipe) productId: string,
  ): Promise<void> {
    return this.products.remove(tenantId, productId);
  }

  @Post(':productId/stock-adjustments')
  @RequirePermission('products.write')
  adjustStock(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: AuthUser,
    @Param('productId', ParseUUIDPipe) productId: string,
    @Body() dto: CreateStockAdjustmentDto,
  ) {
    return this.products.adjustStock(tenantId, productId, dto, user.userId);
  }

  @Post('image')
  @RequirePermission('products.write')
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: 5 * 1024 * 1024 } }),
  )
  uploadImage(
    @CurrentTenant() tenantId: string,
    @UploadedFile()
    file: { mimetype: string; size: number; buffer: Buffer } | undefined,
  ) {
    if (!file) throw new BadRequestException('No se envió ningún archivo.');
    return this.products.uploadImage(tenantId, file);
  }
}
