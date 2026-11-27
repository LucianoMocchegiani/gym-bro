import assert from 'node:assert/strict';
import test from 'node:test';
import { isEcommerceOnly, packsForCaja } from './caja-catalog.ts';

test('E-commerce-only Caja excludes Club services and monthly packs', () => {
  assert.equal(isEcommerceOnly(['ecommerce']), true);
  assert.equal(isEcommerceOnly(['club', 'ecommerce']), false);
  assert.equal(isEcommerceOnly(['club']), false);
  assert.equal(isEcommerceOnly(null), false);

  const packs = [
    { billingPeriod: 'ONE_TIME' },
    { billingPeriod: 'MONTHLY' },
  ];
  assert.deepEqual(packsForCaja(packs, true), [packs[0]]);
  assert.deepEqual(packsForCaja(packs, false), packs);
});
