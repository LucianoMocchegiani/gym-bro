import { BadRequestException } from '@nestjs/common';

/**
 * Slugs reservados (no usables como tenant).
 */
export const RESERVED_TENANT_SLUGS = new Set([
  'www',
  'app',
  'api',
  'super',
  'admin',
  'localhost',
  'mail',
  'cdn',
  'static',
  'assets',
  'status',
]);

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * Normaliza un slug de tenant (trim + lowercase).
 */
export function normalizeTenantSlug(raw: string): string {
  return raw.trim().toLowerCase();
}

/**
 * Valida formato y reservas de slug de tenant.
 *
 * @throws {BadRequestException} Si el slug no es válido.
 */
export function assertValidTenantSlug(slug: string): void {
  if (slug.length < 2 || slug.length > 40) {
    throw new BadRequestException('slug must be between 2 and 40 characters');
  }
  if (!SLUG_PATTERN.test(slug)) {
    throw new BadRequestException(
      'slug must be lowercase letters, numbers and single hyphens',
    );
  }
  if (RESERVED_TENANT_SLUGS.has(slug)) {
    throw new BadRequestException(`slug "${slug}" is reserved`);
  }
}
