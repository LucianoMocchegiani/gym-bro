import { ForbiddenException } from '@nestjs/common';

type CartLine = { kind: 'PACK' | 'DROP_IN' | 'PRODUCT' };

export function assertMemberCartModules(
  modules: string[],
  items: CartLine[],
): void {
  if (
    items.some((item) => item.kind === 'PRODUCT') &&
    !modules.includes('ecommerce')
  ) {
    throw new ForbiddenException('El plan contratado no incluye E-commerce.');
  }
  if (
    items.some((item) => item.kind !== 'PRODUCT') &&
    !modules.includes('club')
  ) {
    throw new ForbiddenException('El plan contratado no incluye Club.');
  }
}
