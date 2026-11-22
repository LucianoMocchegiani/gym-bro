import { findPendingProposalApproval } from './agent-runtime-approvals.ts';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

const pending = {
  id: 'approval-1',
  conversationId: 'conversation-1',
  role: 'tool',
  content: 'Esperando confirmación',
  toolName: 'gymbro__confirm_proposal',
  toolArgs: { proposalId: 'p-1', decision: 'confirm' },
  toolResult: { state: 'approval_pending' },
  createdAt: '2026-01-01T00:00:00.000Z',
};

describe('findPendingProposalApproval', () => {
  it('matches only the pending approval for the selected proposal and decision', () => {
    assert.equal(findPendingProposalApproval([pending], 'p-1', 'confirm')?.id, 'approval-1');
    assert.equal(findPendingProposalApproval([pending], 'p-2', 'confirm'), undefined);
    assert.equal(findPendingProposalApproval([pending], 'p-1', 'cancel'), undefined);
  });
});
