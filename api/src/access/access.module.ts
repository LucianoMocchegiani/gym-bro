import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';
import { RolesModule } from '../roles/roles.module';
import { ACCESS_IDENTITY_PROVIDER } from './access-identity.port';
import { AccessCredentialsController } from './access-credentials.controller';
import { AccessCredentialsService } from './access-credentials.service';
import { StubAccessIdentityProvider } from './stub-access-identity.provider';

/**
 * Acceso QR / SSI: puerto + stub + credenciales de vínculo (E6).
 *
 * @remarks `ACCESS_PROVIDER=stub` (único soportado por ahora).
 */
@Module({
  imports: [ConfigModule, AuthModule, RolesModule, AuditModule],
  controllers: [AccessCredentialsController],
  providers: [
    AccessCredentialsService,
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
  exports: [AccessCredentialsService, ACCESS_IDENTITY_PROVIDER],
})
export class AccessModule {}
