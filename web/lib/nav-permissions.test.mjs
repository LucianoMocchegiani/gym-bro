import assert from 'node:assert/strict';
import test from 'node:test';
import { canAccessNavHref } from './nav-permissions.ts';

test('ecommerce-only navigation hides Club modules and exposes Products', () => {
  assert.equal(
    canAccessNavHref('/dashboard/afiliados', null, 'ok', ['ecommerce']),
    false,
  );
  assert.equal(
    canAccessNavHref('/dashboard/caja', null, 'ok', ['ecommerce']),
    true,
  );
  assert.equal(
    canAccessNavHref(
      '/dashboard/productos',
      ['products.read'],
      'ok',
      ['ecommerce'],
    ),
    true,
  );
  assert.equal(
    canAccessNavHref(
      '/dashboard/productos',
      ['products.read'],
      'ok',
      ['club'],
    ),
    false,
  );
  assert.equal(
    canAccessNavHref(
      '/dashboard/devoluciones',
      ['transaction_items.refund'],
      'ok',
      ['ecommerce'],
    ),
    true,
  );
  assert.equal(
    canAccessNavHref(
      '/dashboard/config',
      ['tenant.settings.read'],
      'ok',
      ['ecommerce'],
    ),
    true,
  );
  assert.equal(
    canAccessNavHref(
      '/dashboard/web',
      ['tenant.settings.read'],
      'ok',
      ['ecommerce'],
    ),
    true,
  );
});

test('Club plans retain Club navigation', () => {
  assert.equal(
    canAccessNavHref('/dashboard/servicios', ['catalog.write'], 'ok', ['club']),
    true,
  );
  assert.equal(
    canAccessNavHref(
      '/dashboard/devoluciones',
      ['transaction_items.refund'],
      'ok',
      ['club'],
    ),
    true,
  );
});

test('Club navigation stays hidden until the plan modules are loaded', () => {
  assert.equal(
    canAccessNavHref('/dashboard/servicios', ['catalog.write'], 'ok', null),
    false,
  );
});

test('only staff with platform read permission see the plan editor link', () => {
  assert.equal(canAccessNavHref('/dashboard/planes', [], 'ok', ['club']), false);
  assert.equal(
    canAccessNavHref(
      '/dashboard/planes',
      ['platform.tenants.read'],
      'ok',
      ['club'],
    ),
    true,
  );
});
