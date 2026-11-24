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

test('renderiza las capturas disponibles en todos los módulos', () => {
  const imageSources = (slug) =>
    loadGuidePage(slug).blocks
      .filter((block) => block.type === 'figure')
      .map((block) => block.src);

  assert.deepEqual(imageSources('que-es'), ['/docs/web-inicio-dashboard.png']);
  assert.deepEqual(imageSources('primeros-pasos'), [
    '/docs/web-login-staff.png',
    '/docs/dashboard-config.png',
    '/docs/dashboard-config-2.png',
    '/docs/web-servicios-alta.png',
    '/docs/web-packs-lista.png',
    '/docs/web-sesiones-calendario.png',
    '/docs/web-staff-lista.png',
    '/docs/web-afiliados-lista.png',
    '/docs/caja-carrito-con-opciones-mp.png',
  ]);
  assert.deepEqual(imageSources('modulos'), [
    '/docs/web-caja-debitos.png',
    '/docs/editor-web-tennant.png',
    '/docs/editor-web-tennant-2.png',
  ]);
  assert.deepEqual(imageSources('portal-afiliados'), [
    '/docs/inico-portal-2.png',
    '/docs/portal-tienda.png',
    '/docs/portal-carrito.png',
    '/docs/portal-clases.png',
    '/docs/portal-mis-clases.png',
    '/docs/portal-historial.png',
    '/docs/portal-acceso.png',
    '/docs/portal-avisos.png',
  ]);
  assert.deepEqual(imageSources('cuenta'), []);
  assert.deepEqual(imageSources('config'), []);
  assert.deepEqual(imageSources('web-tenant'), [
    '/docs/editor-web-tennant.png',
    '/docs/editor-web-tennant-2.png',
    '/docs/web-tennant.png',
    '/docs/web-tennant-2.png',
  ]);
});
