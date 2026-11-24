import assert from 'node:assert/strict';
import test from 'node:test';
import { DOCS_PAGES, loadGuidePage } from './guide.ts';

test('publica guías independientes de Config y Web del tenant', () => {
  assert.ok(DOCS_PAGES.some((page) => page.slug === 'config'));
  assert.ok(DOCS_PAGES.some((page) => page.slug === 'web-tenant'));
  assert.ok(loadGuidePage('config').blocks.some((block) =>
    block.type === 'h2' && block.text === 'Conectar Mercado Pago por OAuth',
  ));
  assert.ok(loadGuidePage('web-tenant').blocks.some((block) =>
    block.type === 'h2' && block.text === 'Publicar y volver al diseño por defecto',
  ));
});
