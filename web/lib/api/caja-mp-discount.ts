export function getCajaMpDiscountPercent(medio: 'qr' | 'link'): number | undefined {
  if (typeof window === 'undefined' || window.location.pathname !== '/dashboard/caja') {
    return undefined;
  }
  try {
    const raw = sessionStorage.getItem(`caja-mp-${medio}-discount`);
    if (raw === null || raw.trim() === '') return undefined;
    const percent = Number(raw);
    return Number.isFinite(percent) ? percent : undefined;
  } catch {
    return undefined;
  }
}
