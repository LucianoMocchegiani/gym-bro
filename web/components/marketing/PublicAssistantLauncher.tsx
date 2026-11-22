'use client';

import { useEffect } from 'react';
import { AssistantLauncher } from '@/components/assistant/AssistantDrawer';
import { setChatAccessTokenOverride } from '@/lib/api/chat';

export function PublicAssistantLauncher() {
  useEffect(() => () => setChatAccessTokenOverride(null), []);
  return <AssistantLauncher variant="public" />;
}
