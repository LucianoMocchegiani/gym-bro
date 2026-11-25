'use client';

import { useEffect, useState } from 'react';
import { apiRequest } from '@/lib/api/client';

type ModuleState = { tenantId: string; modules: string[] };

export function usePlatformModules(tenantId: string | null | undefined) {
  const [state, setState] = useState<ModuleState | null>(null);

  useEffect(() => {
    let current = true;
    if (!tenantId) return () => { current = false; };
    apiRequest<{ modules: string[] }>('/tenant/platform-modules')
      .then(({ modules }) => {
        if (current) setState({ tenantId, modules });
      })
      .catch(() => {
        if (current) setState({ tenantId, modules: [] });
      });
    return () => { current = false; };
  }, [tenantId]);

  return state && state.tenantId === tenantId ? state.modules : null;
}
