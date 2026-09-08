import { ADMIN_NAV_PERMISSIONS } from '@/lib/nav-permissions';

export type ChatNavLink = { href: string; label: string };

const ADMIN_HREF = new Set(ADMIN_NAV_PERMISSIONS.map((item) => item.href));

const MD_LINK = /\[([^\]]+)\]\((\/[^)\s]+)\)/g;


function asRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

/**
 * Solo rutas relativas del Admin. Evita `//host` y URLs absolutas.
 */
export function isSafeAdminHref(href: string): boolean {
  return href.startsWith('/') && !href.startsWith('//') && !href.includes('://');
}

function uniqueLinks(items: ChatNavLink[]): ChatNavLink[] {
  const seen = new Set<string>();
  const out: ChatNavLink[] = [];
  for (const item of items) {
    if (seen.has(item.href)) {
      continue;
    }
    seen.add(item.href);
    out.push(item);
  }
  return out;
}

function linksFromRecord(record: Record<string, unknown>): ChatNavLink[] {
  const raw = record.links;
  if (!Array.isArray(raw)) {
    return [];
  }
  const out: ChatNavLink[] = [];
  for (const item of raw) {
    const row = asRecord(item);
    if (!row) {
      continue;
    }
    const href = typeof row.href === 'string' ? row.href.trim() : '';
    if (!href || !isSafeAdminHref(href)) {
      continue;
    }
    const label =
      typeof row.label === 'string' && row.label.trim()
        ? row.label.trim()
        : href;
    out.push({ href, label });
  }
  return uniqueLinks(out);
}

/**
 * Extrae `links: [{ href, label }]` del JSON de una tool MCP (objeto, string o content blocks).
 */
export function parseToolLinks(value: unknown): ChatNavLink[] {
  if (value == null) {
    return [];
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) {
      return [];
    }
    try {
      return parseToolLinks(JSON.parse(trimmed) as unknown);
    } catch {
      return [];
    }
  }
  if (Array.isArray(value)) {
    const fromBlocks: ChatNavLink[] = [];
    for (const block of value) {
      const rec = asRecord(block);
      if (rec && rec.type === 'text' && typeof rec.text === 'string') {
        fromBlocks.push(...parseToolLinks(rec.text));
      }
    }
    return uniqueLinks(fromBlocks);
  }
  const rec = asRecord(value);
  if (!rec) {
    return [];
  }
  const direct = linksFromRecord(rec);
  if (direct.length > 0) {
    return direct;
  }
  if (Array.isArray(rec.content)) {
    return parseToolLinks(rec.content);
  }
  if (rec.output !== undefined) {
    return parseToolLinks(rec.output);
  }
  if (rec.result !== undefined) {
    return parseToolLinks(rec.result);
  }
  return [];
}

export function mergeLinks(
  current: ChatNavLink[],
  extra: ChatNavLink[],
): ChatNavLink[] {
  return uniqueLinks([...current, ...extra]);
}

function labelForHref(href: string, fallback?: string): string {
  if (fallback?.trim()) {
    return fallback.trim();
  }
  if (href === '/') {
    return 'Inicio';
  }
  const slug = href.replace(/^\//, '').split('/')[0] ?? href;
  if (!slug) {
    return href;
  }
  return slug.charAt(0).toUpperCase() + slug.slice(1);
}

/**
 * Rutas Admin escritas en el texto del asistente (`/afiliados` o `[Afiliados](/afiliados)`).
 */
export function parseLinksFromAssistantText(text: string): ChatNavLink[] {
  if (!text.trim()) {
    return [];
  }
  const found: ChatNavLink[] = [];
  const markdown = text.matchAll(new RegExp(MD_LINK.source, 'g'));
  for (const match of markdown) {
    const href = match[2]?.trim() ?? '';
    if (!ADMIN_HREF.has(href) || !isSafeAdminHref(href)) {
      continue;
    }
    found.push({ href, label: labelForHref(href, match[1]) });
  }
  for (const href of ADMIN_HREF) {
    if (href === '/') {
      continue;
    }
    const escaped = href.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const bare = new RegExp(`(^|[^\\w])${escaped}(?=$|[^\\w/-])`, 'i');
    if (bare.test(text)) {
      found.push({ href, label: labelForHref(href) });
    }
  }
  return uniqueLinks(found);
}
