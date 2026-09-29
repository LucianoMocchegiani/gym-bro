import { SetMetadata } from '@nestjs/common';

export const ALLOW_WHEN_LIMITED_KEY = 'allowWhenLimited';

/**
 * Ruta usable con plan Faciliter caído (Plan / Uso, permisos de nav).
 */
export function AllowWhenLimited() {
  return SetMetadata(ALLOW_WHEN_LIMITED_KEY, true);
}
