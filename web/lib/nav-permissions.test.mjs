import assert from 'node:assert/strict';
import test from 'node:test';
import { canAccessNavHref } from './nav-permissions.ts';

test('ecommerce-only navigation hides Club modules even before permissions load', () => {
  assert.equal(
    canAccessNavHref('/dashboard/afiliados', null, 'ok', ['ecommerce']),
    false,
  );
  assert.equal(
    canAccessNavHref('/dashboard/caja', null, 'ok', ['ecommerce']),
    true,
  );
});

test('Club plans retain Club navigation', () => {
  assert.equal(
    canAccessNavHref('/dashboard/servicios', ['catalog.write'], 'ok', ['club']),
    true,
  );
});
