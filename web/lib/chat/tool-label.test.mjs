import assert from 'node:assert/strict';
import test from 'node:test';
import { toolLineLabel } from './tool-label.ts';

test('report tools have distinct user-facing labels', () => {
  assert.equal(toolLineLabel('get_reports_summary', false), 'Consultó reportes generales');
  assert.equal(toolLineLabel('get_sumari_report', false), 'Consultó reportes generales');
  assert.equal(
    toolLineLabel('get_member_reports_summary', false),
    'Consultó reportes de un afiliado',
  );
  assert.equal(
    toolLineLabel('gymbro__get_member_reports_summary', true),
    'Consultando reporte del afiliado…',
  );
});
