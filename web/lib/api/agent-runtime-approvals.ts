import type { ChatMessage } from './chat.js';

export function findPendingProposalApproval(
  messages: ChatMessage[],
  proposalId: string,
  decision?: unknown,
): ChatMessage | undefined {
  return messages.find((message) => {
    if (
      message.role !== 'tool' ||
      !(message.toolName === 'confirm_proposal' || message.toolName?.endsWith('__confirm_proposal'))
    ) {
      return false;
    }
    const args = message.toolArgs;
    const result = message.toolResult;
    return (
      typeof args === 'object' &&
      args !== null &&
      !Array.isArray(args) &&
      (args as { proposalId?: unknown }).proposalId === proposalId &&
      (decision === undefined || (args as { decision?: unknown }).decision === decision) &&
      typeof result === 'object' &&
      result !== null &&
      !Array.isArray(result) &&
      (result as { state?: unknown }).state === 'approval_pending'
    );
  });
}
