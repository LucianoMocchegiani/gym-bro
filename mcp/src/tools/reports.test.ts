import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { reportSummaryQuery } from './reports.js';

describe('reportSummaryQuery', () => {
  it('keeps general reports unfiltered and applies only an explicit member id', () => {
    const range = { from: '2026-09-01', to: '2026-09-30' };
    assert.deepEqual(reportSummaryQuery(range), range);
    assert.deepEqual(reportSummaryQuery(range, '123e4567-e89b-42d3-a456-426614174000'), {
      ...range,
      memberId: '123e4567-e89b-42d3-a456-426614174000',
    });
  });
});
