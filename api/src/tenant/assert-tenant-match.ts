import { BadRequestException } from '@nestjs/common';

/**
 * Asegura que un id de recurso/ruta coincida con el tenant del JWT.
 *
 * @param authTenantId Tenant del access token.
 * @param candidate Tenant recibido por path/query (nunca confiar en body suelto).
 * @throws {BadRequestException} Si difieren (intento de cross-tenant).
 */
export function assertTenantMatch(
  authTenantId: string,
  candidate: string,
): void {
  if (authTenantId !== candidate) {
    throw new BadRequestException('Tenant mismatch');
  }
}
