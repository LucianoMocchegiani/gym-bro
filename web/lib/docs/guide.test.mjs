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

test('renderiza capturas listadas en plural y por categoría', () => {
  const imageSources = (slug) =>
    loadGuidePage(slug).blocks
      .filter((block) => block.type === 'figure')
      .map((block) => block.src);

  assert.deepEqual(imageSources('web-tenant'), [
    '/docs/editor-web-tennant.png',
    '/docs/editor-web-tennant-2.png',
    '/docs/web-tennant.png',
    '/docs/web-tennant-2.png',
  ]);
  assert.ok(imageSources('primeros-pasos').includes('/docs/dashboard-config.png'));
  assert.ok(imageSources('primeros-pasos').includes('/docs/dashboard-config-2.png'));
  assert.ok(imageSources('modulos').includes('/docs/editor-web-tennant.png'));
});
