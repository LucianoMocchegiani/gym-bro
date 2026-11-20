import assert from 'node:assert/strict';
import { test } from 'node:test';
import { shouldShowFreePlanNotice } from './free-plan-notice.ts';

const week = 7 * 24 * 60 * 60 * 1000;

test('shows for a first visit or invalid stored timestamp', () => {
  assert.equal(shouldShowFreePlanNotice(null, 1000), true);
  assert.equal(shouldShowFreePlanNotice('invalid', 1000), true);
});

test('shows again after seven days, but not before', () => {
  assert.equal(shouldShowFreePlanNotice('1000', 1000 + week - 1), false);
  assert.equal(shouldShowFreePlanNotice('1000', 1000 + week), true);
});
