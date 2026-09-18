import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { RolesModule } from '../roles/roles.module';
import { ExpirationsController } from './expirations.controller';
import { ExpirationsService } from './expirations.service';

/**
 * Cola operativa de vencimientos (Admin `/vencimientos`).
 */
@Module({
  imports: [AuthModule, RolesModule],
  controllers: [ExpirationsController],
  providers: [ExpirationsService],
})
export class ExpirationsModule {}
