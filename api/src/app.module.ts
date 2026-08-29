import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AccessModule } from './access/access.module';
import { AuditModule } from './audit/audit.module';
import { AuthModule } from './auth/auth.module';
import { PaymentRegisterModule } from './payment-register/payment-register.module';
import { ContractsModule } from './contracts/contracts.module';
import { HealthModule } from './health/health.module';
import { MembersModule } from './members/members.module';
import { MemberCatalogModule } from './member-catalog/member-catalog.module';
import { PaymentModule } from './payment/payment.module';
import { PacksModule } from './packs/packs.module';
import { PrismaModule } from './prisma/prisma.module';
import { KuatiaModule } from './kuatia/kuatia.module';
import { ReceiptsModule } from './receipts/receipts.module';
import { RefundsModule } from './refunds/refunds.module';
import { ReportsModule } from './reports/reports.module';
import { RolesModule } from './roles/roles.module';
import { ServicesModule } from './services/services.module';
import { SessionsModule } from './sessions/sessions.module';
import { ReservationsModule } from './reservations/reservations.module';
import { StaffModule } from './staff/staff.module';
import { TenantModule } from './tenant/tenant.module';
import { TenantSettingsModule } from './tenant-settings/tenant-settings.module';
import { TenantsModule } from './tenants/tenants.module';
import { WaitlistModule } from './waitlist/waitlist.module';
import { FileStorageModule } from './file-storage/file-storage.module';
import { UploadModule } from './upload/upload.module';

/**
 * Módulo raíz del monolito modular GymBro.
 *
 * @remarks Infraestructura: config, Prisma, auth JWT, tenant guard y health.
 */
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    TenantModule,
    TenantSettingsModule,
    RolesModule,
    StaffModule,
    MembersModule,
    MemberCatalogModule,
    ServicesModule,
    PacksModule,
    ContractsModule,
    KuatiaModule,
    SessionsModule,
    ReservationsModule,
    WaitlistModule,
    PaymentRegisterModule,
    ReceiptsModule,
    PaymentModule,
    RefundsModule,
    ReportsModule,
    AccessModule,
    TenantsModule,
    AuditModule,
    HealthModule,
    FileStorageModule,
    UploadModule,
  ],
})
export class AppModule {}
