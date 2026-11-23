import { BadRequestException } from '@nestjs/common';
import { assertValidTenantSlug } from './tenant-slug';

describe('assertValidTenantSlug', () => {
  it('reserves the Agent Runtime subdomain', () => {
    expect(() => assertValidTenantSlug('agent-runtime')).toThrow(
      BadRequestException,
    );
  });

  it('continues to accept normal tenant slugs', () => {
    expect(() => assertValidTenantSlug('mi-gimnasio')).not.toThrow();
  });
});
