import { Module } from '@nestjs/common';
import { KuatiaModule } from '../kuatia/kuatia.module';
import { TenantSettingsModule } from '../tenant-settings/tenant-settings.module';
import { CredentialIssuerPort } from './credential-issuer.port';
import { DoorActuatorPort } from './door-actuator.port';
import { LogDoorActuatorAdapter } from './log-door-actuator.adapter';
import { TenantCredentialIssuer } from './tenant-credential-issuer';

/**
 * Contrato de sistemas de puerta: emisión de credenciales y apertura.
 *
 * @remarks Kuatia es un adapter más; ZKTeco no emite. Las reglas de ingreso
 * siguen en `AccessVerifyService` (un solo evaluate).
 */
@Module({
  imports: [KuatiaModule, TenantSettingsModule],
  providers: [
    TenantCredentialIssuer,
    { provide: CredentialIssuerPort, useExisting: TenantCredentialIssuer },
    LogDoorActuatorAdapter,
    { provide: DoorActuatorPort, useExisting: LogDoorActuatorAdapter },
  ],
  exports: [CredentialIssuerPort, DoorActuatorPort],
})
export class AccessProvidersModule {}
