import { findPendingProposalApproval } from './agent-runtime-approvals.ts';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

const pending = {
  id: 'approval-1',
  role: 'tool',
  toolName: 'gymbro__confirm_proposal',
  toolArgs: { proposalId: 'p-1', decision: 'confirm' },
  toolResult: { state: 'approval_pending' },
};

it('matches only the pending approval for the selected proposal and decision', () => {
  assert.equal(findPendingProposalApproval([pending], 'p-1', 'confirm')?.id, 'approval-1');
  assert.equal(findPendingProposalApproval([pending], 'p-2', 'confirm'), undefined);
  assert.equal(findPendingProposalApproval([pending], 'p-1', 'cancel'), undefined);
});
