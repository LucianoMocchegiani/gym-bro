import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { isRuntimeAnonymousToken } from './public-chat-token.ts';

describe('isRuntimeAnonymousToken', () => {
  it('accepts valid Runtime anonymous UUID tokens', () => {
    assert.equal(isRuntimeAnonymousToken('anon:123e4567-e89b-42d3-a456-426614174000'), true);
  });

  it('rejects malformed or non-anonymous tokens', () => {
    assert.equal(isRuntimeAnonymousToken('anon:'), false);
    assert.equal(isRuntimeAnonymousToken('anon:staff-token'), false);
    assert.equal(isRuntimeAnonymousToken('Bearer anon:123e4567-e89b-42d3-a456-426614174000'), false);
  });
});
