import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';
import { RolesModule } from '../roles/roles.module';
import { TenantSettingsModule } from '../tenant-settings/tenant-settings.module';
import { ACCESS_IDENTITY_PROVIDER } from './access-identity.port';
import { AccessCredentialsController } from './access-credentials.controller';
import { AccessCredentialsService } from './access-credentials.service';
import { AccessVerifyController } from './access-verify.controller';
import { AccessVerifyService } from './access-verify.service';
import { StubAccessIdentityProvider } from './stub-access-identity.provider';

/**
 * Acceso QR / SSI: puerto + stub + credenciales + verify (E6).
 *
 * @remarks `ACCESS_PROVIDER=stub` (único soportado por ahora).
 */
@Module({
  imports: [
    ConfigModule,
    AuthModule,
    RolesModule,
    AuditModule,
    TenantSettingsModule,
  ],
  controllers: [AccessCredentialsController, AccessVerifyController],
  providers: [
    AccessCredentialsService,
    AccessVerifyService,
    StubAccessIdentityProvider,
    {
      provide: ACCESS_IDENTITY_PROVIDER,
      useFactory: (
        config: ConfigService,
        stub: StubAccessIdentityProvider,
      ): StubAccessIdentityProvider => {
        const mode =
          config.get<string>('ACCESS_PROVIDER')?.trim().toLowerCase() ?? 'stub';
        if (mode !== 'stub') {
          throw new Error(
            `ACCESS_PROVIDER=${mode} is not supported yet (use stub)`,
          );
        }
        return stub;
      },
      inject: [ConfigService, StubAccessIdentityProvider],
    },
  ],
  exports: [
    AccessCredentialsService,
    AccessVerifyService,
    ACCESS_IDENTITY_PROVIDER,
  ],
})
export class AccessModule {}
