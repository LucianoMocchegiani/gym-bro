import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { RolesModule } from '../roles/roles.module';
import { UploadModule } from '../upload/upload.module';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';
import { PublicProductsService } from './public-products.service';

@Module({
  imports: [AuthModule, RolesModule, UploadModule],
  controllers: [ProductsController],
  providers: [ProductsService, PublicProductsService],
  exports: [PublicProductsService],
})
export class ProductsModule {}
