'use client';

import { useSyncExternalStore } from 'react';
import type { MpCheckoutKind } from '@/lib/api/mercadopago';
import type { MemberSessionSlot } from '@/lib/api/member-portal';
import {
  storeComponentLabel,
  type PublicProduct,
  type StorePack,
} from '@/lib/api/public-tenant-catalog';
import { formatSessionWhen } from '@/lib/format-session';
import { createLocalStore } from '@/lib/local-store';

/** Pack, drop-in o producto (una unidad por defecto). */
export type MemberCartLine = {
  kind: MpCheckoutKind;
  /** `packId`, `sessionId` o `productId`. */
  id: string;
  label: string;
  sub: string;
  price: number;
  quantity?: number;
};

type StoredCart = {
  /** `tenantId:memberId`: un carrito de otro socio cuenta como vacío. */
  owner: string;
  lines: MemberCartLine[];
};

const store = createLocalStore<StoredCart>({
  storageKey: 'gymbro.member.cart',
  eventName: 'gymbro-member-cart',
  parse(raw) {
    const cart = raw as StoredCart | null;
    return cart && typeof cart.owner === 'string' && Array.isArray(cart.lines)
      ? cart
      : null;
  },
});

const NO_LINES: MemberCartLine[] = [];

function linesOf(owner: string): MemberCartLine[] {
  const stored = store.read();
  return stored?.owner === owner ? stored.lines : NO_LINES;
}

/** Vacía el carrito (salir del gym o checkout iniciado). */
export const clearMemberCart = store.clear;

/** Agrega una línea; acumula unidades del mismo producto. */
export function addToMemberCart(owner: string, line: MemberCartLine): boolean {
  const lines = linesOf(owner);
  const existing = lines.find((item) => item.kind === line.kind && item.id === line.id);
  if (existing && line.kind !== 'PRODUCT') return false;
  store.write({
    owner,
    lines: existing
      ? lines.map((item) =>
          item === existing
            ? { ...item, quantity: (item.quantity ?? 1) + (line.quantity ?? 1) }
            : item,
        )
      : [...lines, line],
  });
  return true;
}

export function removeFromMemberCart(
  owner: string,
  kind: MpCheckoutKind,
  id: string,
): void {
  store.write({
    owner,
    lines: linesOf(owner).filter((l) => !(l.kind === kind && l.id === id)),
  });
}

export function cartLineKey(line: Pick<MemberCartLine, 'kind' | 'id'>): string {
  return `${line.kind}:${line.id}`;
}

export function packCartLine(pack: StorePack): MemberCartLine {
  return {
    kind: 'PACK',
    id: pack.id,
    label: pack.name,
    sub: pack.components.map(storeComponentLabel).join(' · '),
    price: pack.price,
  };
}

export function productCartLine(product: PublicProduct): MemberCartLine {
  return {
    kind: 'PRODUCT',
    id: product.id,
    label: product.name,
    sub: product.description ?? '',
    price: product.price,
    quantity: 1,
  };
}

export function dropInCartLine(
  session: MemberSessionSlot,
  price: number,
): MemberCartLine {
  return {
    kind: 'DROP_IN',
    id: session.id,
    label: `Clase suelta · ${session.serviceName}`,
    sub: [formatSessionWhen(session.startsAt), session.branchName]
      .filter(Boolean)
      .join(' · '),
    price,
  };
}

/**
 * Carrito del socio en la web del gym (CU-PAG-001), como `MemberCartController`
 * de la app: un pack o drop-in por línea, sin repetir `kind` + `id`.
 *
 * @remarks Vive en localStorage para sobrevivir la recarga y la ida a Mercado
 * Pago. `owner` = sesión del socio (`tenantId:memberId`); sin sesión no hay carrito.
 */
export function useMemberCart(owner: string | null) {
  const stored = useSyncExternalStore(
    store.subscribe,
    store.read,
    store.serverSnapshot,
  );
  const lines = owner && stored?.owner === owner ? stored.lines : NO_LINES;

  return {
    lines,
    count: lines.reduce((sum, line) => sum + (line.quantity ?? 1), 0),
    total: lines.reduce((sum, line) => sum + line.price * (line.quantity ?? 1), 0),
    has: (kind: MpCheckoutKind, id: string) =>
      lines.some((l) => l.kind === kind && l.id === id),
    add: (line: MemberCartLine) =>
      owner ? addToMemberCart(owner, line) : false,
    remove: (kind: MpCheckoutKind, id: string) => {
      if (owner) removeFromMemberCart(owner, kind, id);
    },
    clear: clearMemberCart,
  };
}

export type MemberCart = ReturnType<typeof useMemberCart>;
