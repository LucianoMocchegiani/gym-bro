/**
 * Packs API (módulo `packs`).
 */

import { apiRequest } from '@/lib/api/client';

export type PackSummary = {
  id: string;
  name: string;
  price: number;
  active: boolean;
  kind: string;
};

/**
 * Packs activos (`catalog.write`).
 */
export function listActivePacks(): Promise<PackSummary[]> {
  return apiRequest<PackSummary[]>('/packs?active=true');
}
