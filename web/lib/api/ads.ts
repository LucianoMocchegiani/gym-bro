import { apiRequest } from './client';
import { toSearchParams } from './list';
import type { ListParams, ListResult } from './list';

export const AD_PLACEMENTS = ['MEMBER_PORTAL', 'DASHBOARD', 'GYM_SITE'] as const;
export type AdPlacement = (typeof AD_PLACEMENTS)[number];
export type AdEventType = 'IMPRESSION' | 'CLICK';
export type AdCampaign = {
  id: string;
  name: string;
  body: string;
  imageUrl: string;
  targetUrl: string;
  placements: AdPlacement[];
  startsAt: string;
  endsAt: string;
  active: boolean;
  impressions: number;
  clicks: number;
};
export type AdCreative = Pick<AdCampaign, 'id' | 'name' | 'body' | 'imageUrl' | 'targetUrl'>;
export type SaveAdCampaign = Omit<AdCampaign, 'id' | 'impressions' | 'clicks'>;

export function listAdCampaigns(input?: ListParams): Promise<ListResult<AdCampaign>> {
  const qs = toSearchParams(input);
  return apiRequest<ListResult<AdCampaign>>(`/ads/campaigns${qs ? `?${qs}` : ''}`);
}
export function saveAdCampaign(data: SaveAdCampaign, id?: string) {
  return apiRequest<AdCampaign>(id ? `/ads/campaigns/${id}` : '/ads/campaigns', {
    method: id ? 'PATCH' : 'POST', body: data,
  });
}
export async function getAds(tenantSlug: string, placement: AdPlacement): Promise<AdCreative[]> {
  const base = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '');
  if (!base) throw new Error('NEXT_PUBLIC_API_URL no está configurada');
  const response = await fetch(`${base}/api/ads/serve/${encodeURIComponent(tenantSlug)}/${placement}`, { cache: 'no-store' });
  if (!response.ok) throw new Error('No se pudieron cargar los anuncios');
  return response.json() as Promise<AdCreative[]>;
}
export async function trackAd(tenantSlug: string, campaignId: string, placement: AdPlacement, type: AdEventType) {
  const base = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '');
  if (!base) return;
  await fetch(`${base}/api/ads/events`, {
    method: 'POST', keepalive: true,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tenantSlug, campaignId, placement, type }),
  });
}
