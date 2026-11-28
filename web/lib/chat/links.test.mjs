import assert from 'node:assert/strict';
import test from 'node:test';
import { parseLinksFromAssistantText } from './links.ts';

test('Markdown links stay inline instead of being repeated as chat chips', () => {
  assert.deepEqual(
    parseLinksFromAssistantText('Abrí [Afiliados](/dashboard/afiliados)'),
    [],
  );
});

test('bare admin routes still produce a chat chip', () => {
  assert.deepEqual(parseLinksFromAssistantText('Abrí /dashboard/afiliados'), [
    { href: '/dashboard/afiliados', label: 'Afiliados' },
  ]);
});
