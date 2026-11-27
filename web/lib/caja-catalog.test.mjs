import assert from 'node:assert/strict';
import test from 'node:test';
import { cajaCatalogTypes } from './caja-catalog.ts';

test('Caja only shows products for E-commerce and preserves the Club catalogs', () => {
  assert.deepEqual(cajaCatalogTypes(['ecommerce'], false), ['PRODUCTOS']);
  assert.deepEqual(cajaCatalogTypes(['club'], false), ['SERVICIOS', 'PACKS']);
  assert.deepEqual(cajaCatalogTypes(['club', 'ecommerce'], false), [
    'SERVICIOS',
    'PACKS',
    'PRODUCTOS',
  ]);
  assert.deepEqual(cajaCatalogTypes([], true), ['PACKS']);
});
