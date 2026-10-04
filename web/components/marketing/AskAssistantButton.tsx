'use client';

import type { ReactNode } from 'react';
import { askAssistant } from '@/lib/assistant-ask';

/** Abre el asistente público con `message` ya enviado. */
export function AskAssistantButton({
  message,
  className = 'mkt-btn-ghost',
  children,
}: {
  message: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      className={className}
      onClick={() => askAssistant(message)}
    >
      {children}
    </button>
  );
}
