import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

export type DocsSlug = 'que-es' | 'primeros-pasos' | 'modulos';

export type DocsPageMeta = {
  slug: DocsSlug;
  title: string;
  description: string;
};

export const DOCS_PAGES: readonly DocsPageMeta[] = [
  {
    slug: 'que-es',
    title: 'Qué es y cómo funciona',
    description: 'Panel, app y para qué sirve Faciliter Brain.',
  },
  {
    slug: 'primeros-pasos',
    title: 'Primeros pasos',
    description: 'Orden para arrancar un local: config, catálogo, gente y cobro.',
  },
  {
    slug: 'modulos',
    title: 'Módulos',
    description: 'Config, caja, puerta, app y el resto, con más pantallas.',
  },
];

export type GuideInline =
  | { type: 'text'; text: string }
  | { type: 'strong'; text: string }
  | { type: 'em'; text: string }
  | { type: 'code'; text: string };

export type GuideListItem = {
  parts: GuideInline[];
  children?: GuideListItem[];
};

export type GuideBlock =
  | { type: 'h2'; text: string }
  | { type: 'h3'; text: string }
  | { type: 'p'; parts: GuideInline[] }
  | { type: 'ul' | 'ol'; items: GuideListItem[] }
  | { type: 'table'; headers: GuideInline[][]; rows: GuideInline[][][] }
  | { type: 'figure'; src: string; alt: string; caption: GuideInline[] };

const GUIDE_PATH = path.join(process.cwd(), 'content', 'docs', 'guia.md');
const PUBLIC_DOCS = path.join(process.cwd(), 'public', 'docs');

/**
 * Lista PNG publicadas. Si falta el archivo, el artículo no muestra la figura.
 */
function publishedImages(): Set<string> {
  if (!existsSync(PUBLIC_DOCS)) {
    return new Set();
  }
  return new Set(
    readdirSync(PUBLIC_DOCS).filter((name) => name.toLowerCase().endsWith('.png')),
  );
}

function parseInline(text: string): GuideInline[] {
  const parts: GuideInline[] = [];
  const re = /(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*)/g;
  let last = 0;
  let match: RegExpExecArray | null = re.exec(text);
  while (match) {
    if (match.index > last) {
      parts.push({ type: 'text', text: text.slice(last, match.index) });
    }
    const token = match[0];
    if (token.startsWith('**')) {
      parts.push({ type: 'strong', text: token.slice(2, -2) });
    } else if (token.startsWith('`')) {
      parts.push({ type: 'code', text: token.slice(1, -1) });
    } else {
      parts.push({ type: 'em', text: token.slice(1, -1) });
    }
    last = match.index + token.length;
    match = re.exec(text);
  }
  if (last < text.length) {
    parts.push({ type: 'text', text: text.slice(last) });
  }
  return parts.length ? parts : [{ type: 'text', text }];
}

function splitTableRow(line: string): string[] {
  return line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((cell) => cell.trim());
}

function isTableSeparator(cells: string[]): boolean {
  return (
    cells.length > 0 &&
    cells.every((cell) => /^:?-{3,}:?$/.test(cell.replace(/\s/g, '')))
  );
}

function isTableLine(line: string): boolean {
  const trimmed = line.trim();
  return trimmed.startsWith('|') && /\|/.test(trimmed.slice(1));
}

function isIndentedBullet(line: string): boolean {
  return /^[ \t]{2,}[-*] /.test(line);
}

function consumeNestedBullets(
  lines: string[],
  start: number,
): { items: GuideListItem[]; next: number } {
  const items: GuideListItem[] = [];
  let i = start;
  while (i < lines.length && isIndentedBullet(lines[i] ?? '')) {
    items.push({
      parts: parseInline((lines[i] ?? '').trim().replace(/^[-*] /, '')),
    });
    i += 1;
  }
  return { items, next: i };
}

function isMetaLine(line: string): boolean {
  return (
    /^\*\*Dónde:\*\*/.test(line) ||
    /^\*\*Para qué:\*\*/.test(line) ||
    /^\*\*Por qué rehacer:\*\*/.test(line) ||
    /^\*\*Qué debe verse:\*\*/.test(line) ||
    /^\*\*Qué se ve:\*\*/.test(line)
  );
}

function extractPngs(line: string): string[] {
  const names: string[] = [];
  const re = /`([^`]+\.png)`/gi;
  let match: RegExpExecArray | null = re.exec(line);
  while (match) {
    names.push(match[1]);
    match = re.exec(line);
  }
  return names;
}

function captionFromMeta(lines: string[]): string {
  const keys = ['Qué se ve', 'Para qué', 'Qué debe verse'] as const;
  for (const key of keys) {
    const re = new RegExp(`^\\*\\*${key}:\\*\\*\\s*(.+)$`);
    for (const line of lines) {
      const match = line.match(re);
      if (match?.[1]) return stripPlaybookMarks(match[1]);
    }
  }
  return '';
}

/**
 * Notas del playbook de fotos: no son copy para el lector de `/docs`.
 */
function isPlaybookOnlyLine(line: string): boolean {
  const trimmed = line.trim();
  return (
    /^Ya cubierto en §\d+\.\s*Extra si hace falta:?$/i.test(trimmed) ||
    /^Extra si hace falta:?$/i.test(trimmed) ||
    /^\(reusa/i.test(trimmed) ||
    /^Misma lógica:/i.test(trimmed) ||
    /se reusan; acá solo las que falten/i.test(trimmed) ||
    /^No documentar rutinas/i.test(trimmed) ||
    /^Este archivo es el \*\*playbook/i.test(trimmed)
  );
}

function stripPlaybookMarks(text: string): string {
  return text
    .replace(/^\(reusa\)\s*/i, '')
    .replace(/\s*\(reusa(?:\s+en)?\s*§\d+\)/gi, '')
    .replace(/\s*\(también §\d+\)/gi, '')
    .replace(/\s*\(reusa\)/gi, '')
    .replace(/§\d+/g, '')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

function toReaderParagraph(text: string): string | null {
  const trimmed = text.trim();
  if (!trimmed || isPlaybookOnlyLine(trimmed)) {
    return null;
  }
  const extra = trimmed.match(/^Ya cubierto en §\d+\.\s*Extra:\s*(.+)$/i);
  if (extra?.[1]) {
    return stripPlaybookMarks(extra[1]);
  }
  return stripPlaybookMarks(trimmed) || null;
}

function splitPublishedMarkdown(raw: string): Record<DocsSlug, string> {
  const withoutChecklist = raw.split(/\n## Lista corta para ir disparando fotos\n/)[0] ?? raw;
  const parte1Start = withoutChecklist.search(/^# Parte 1/m);
  const fromParte1 =
    parte1Start >= 0 ? withoutChecklist.slice(parte1Start) : withoutChecklist;
  const parte2Start = fromParte1.search(/^# Parte 2/m);
  const parte3Start = fromParte1.search(/^# Parte 3/m);
  const parte1 =
    parte2Start >= 0 ? fromParte1.slice(0, parte2Start) : fromParte1;
  const parte2 =
    parte2Start >= 0
      ? fromParte1.slice(
          parte2Start,
          parte3Start >= 0 ? parte3Start : undefined,
        )
      : '';
  const parte3 = parte3Start >= 0 ? fromParte1.slice(parte3Start) : '';
  const dropParteLine = (chunk: string) =>
    chunk.replace(/^# Parte[^\n]*\n+/, '');
  return {
    'que-es': dropParteLine(parte1),
    'primeros-pasos': dropParteLine(parte2),
    modulos: dropParteLine(parte3),
  };
}

function parseBlocks(markdown: string, images: Set<string>): GuideBlock[] {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n');
  const blocks: GuideBlock[] = [];
  let i = 0;

  const flushParagraph = (buf: string[]) => {
    const text = toReaderParagraph(buf.join(' '));
    if (text) {
      blocks.push({ type: 'p', parts: parseInline(text) });
    }
    buf.length = 0;
  };

  let lastHeading = 'Captura';

  while (i < lines.length) {
    const line = lines[i] ?? '';
    const trimmed = line.trim();

    if (!trimmed || trimmed === '---' || isPlaybookOnlyLine(trimmed)) {
      i += 1;
      continue;
    }

    if (trimmed.startsWith('# Parte')) {
      i += 1;
      continue;
    }

    if (trimmed.startsWith('### ')) {
      const text = trimmed.slice(4);
      lastHeading = text;
      blocks.push({ type: 'h3', text });
      i += 1;
      continue;
    }

    if (trimmed.startsWith('## ')) {
      const text = trimmed.slice(3);
      lastHeading = text;
      blocks.push({ type: 'h2', text });
      i += 1;
      continue;
    }

    if (trimmed.startsWith('**Captura:**')) {
      const skipShot =
        /falta/i.test(trimmed) || /rehacer/i.test(trimmed);
      const meta: string[] = [];
      i += 1;
      while (i < lines.length && isMetaLine((lines[i] ?? '').trim())) {
        meta.push((lines[i] ?? '').trim());
        i += 1;
      }
      if (!skipShot) {
        const captionText = captionFromMeta(meta);
        const caption = captionText ? parseInline(captionText) : [];
        const alt =
          caption.map((part) => part.text).join('') || lastHeading;
        for (const file of extractPngs(trimmed)) {
          if (images.has(file)) {
            blocks.push({ type: 'figure', src: `/docs/${file}`, alt, caption });
          }
        }
      }
      continue;
    }

    if (isTableLine(line)) {
      const table: string[][] = [];
      while (i < lines.length && isTableLine(lines[i] ?? '')) {
        table.push(splitTableRow(lines[i] ?? ''));
        i += 1;
      }
      if (table.length >= 2 && isTableSeparator(table[1] ?? [])) {
        blocks.push({
          type: 'table',
          headers: (table[0] ?? []).map(parseInline),
          rows: table.slice(2).map((row) => row.map(parseInline)),
        });
      } else {
        for (const row of table) {
          flushParagraph([row.join(' ')]);
        }
      }
      continue;
    }

    if (/^[-*] /.test(trimmed)) {
      const items: GuideListItem[] = [];
      while (i < lines.length && /^[-*] /.test((lines[i] ?? '').trim())) {
        items.push({
          parts: parseInline((lines[i] ?? '').trim().replace(/^[-*] /, '')),
        });
        i += 1;
      }
      blocks.push({ type: 'ul', items });
      continue;
    }

    if (/^\d+\. /.test(trimmed)) {
      const items: GuideListItem[] = [];
      while (i < lines.length && /^\d+\. /.test((lines[i] ?? '').trim())) {
        const parts = parseInline(
          (lines[i] ?? '').trim().replace(/^\d+\. /, ''),
        );
        i += 1;
        const nested = consumeNestedBullets(lines, i);
        i = nested.next;
        items.push({
          parts,
          children: nested.items.length ? nested.items : undefined,
        });
      }
      blocks.push({ type: 'ol', items });
      continue;
    }

    const para: string[] = [];
    const start = i;
    while (
      i < lines.length &&
      (lines[i] ?? '').trim() &&
      (lines[i] ?? '').trim() !== '---' &&
      !(lines[i] ?? '').trim().startsWith('#') &&
      !(lines[i] ?? '').trim().startsWith('**Captura:') &&
      !isTableLine(lines[i] ?? '') &&
      !/^[-*] /.test((lines[i] ?? '').trim()) &&
      !/^\d+\. /.test((lines[i] ?? '').trim())
    ) {
      para.push((lines[i] ?? '').trim());
      i += 1;
    }
    flushParagraph(para);
    if (i === start) {
      i += 1;
    }
  }

  return blocks;
}

/**
 * Carga la guía publicada y recorta el playbook de capturas.
 */
export function loadGuidePage(slug: DocsSlug): {
  meta: DocsPageMeta;
  blocks: GuideBlock[];
} {
  const meta = DOCS_PAGES.find((page) => page.slug === slug);
  if (!meta) {
    throw new Error(`Docs slug desconocido: ${slug}`);
  }
  const raw = readFileSync(GUIDE_PATH, 'utf8');
  const chunks = splitPublishedMarkdown(raw);
  return {
    meta,
    blocks: parseBlocks(chunks[slug], publishedImages()),
  };
}
