import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { RolesModule } from '../roles/roles.module';
import { ReceiptsController } from './receipts.controller';
import { ReceiptsService } from './receipts.service';
import { SuperReceiptsController } from './super-receipts.controller';

/**
 * Comprobantes internos (RN-PAG-009).
 */
@Module({
  imports: [AuthModule, RolesModule],
  controllers: [ReceiptsController, SuperReceiptsController],
  providers: [ReceiptsService],
  exports: [ReceiptsService],
})
export class ReceiptsModule {}
