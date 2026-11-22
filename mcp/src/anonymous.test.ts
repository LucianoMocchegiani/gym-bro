import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { isAnonymousRuntimeToken } from './anonymous.js';

describe('isAnonymousRuntimeToken', () => {
  it('accepts Runtime anonymous UUID bearers only', () => {
    assert.equal(isAnonymousRuntimeToken('anon:123e4567-e89b-42d3-a456-426614174000'), true);
    assert.equal(isAnonymousRuntimeToken('anon:'), false);
    assert.equal(isAnonymousRuntimeToken('anon:staff-token'), false);
    assert.equal(isAnonymousRuntimeToken('Bearer anon:123e4567-e89b-42d3-a456-426614174000'), false);
  });
});
