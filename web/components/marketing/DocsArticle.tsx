import type { ReactNode } from 'react';
import type {
  GuideBlock,
  GuideInline,
  GuideListItem,
} from '@/lib/docs/guide';
import { DocsFigure } from '@/components/marketing/DocsFigure';

function Inline({ parts }: { parts: GuideInline[] }) {
  return parts.map((part, index) => {
    if (part.type === 'strong') {
      return <strong key={index}>{part.text}</strong>;
    }
    if (part.type === 'em') {
      return <em key={index}>{part.text}</em>;
    }
    if (part.type === 'code') {
      return <code key={index}>{part.text}</code>;
    }
    return <span key={index}>{part.text}</span>;
  });
}

function ListItems({ items }: { items: GuideListItem[] }) {
  return items.map((item, itemIndex) => (
    <li key={itemIndex}>
      <Inline parts={item.parts} />
      {item.children?.length ? (
        <ul className="mkt-docs-list-nested">
          {item.children.map((child, childIndex) => (
            <li key={childIndex}>
              <Inline parts={child.parts} />
            </li>
          ))}
        </ul>
      ) : null}
    </li>
  ));
}

/**
 * Artículo de la guía pública (markdown ya recortado a bloques).
 */
export function DocsArticle({ blocks }: { blocks: GuideBlock[] }) {
  const nodes: ReactNode[] = [];
  for (const [index, block] of blocks.entries()) {
    if (block.type === 'h2') {
      nodes.push(
        <h2 key={index} className="mkt-docs-h2">
          {block.text}
        </h2>,
      );
      continue;
    }
    if (block.type === 'h3') {
      nodes.push(
        <h3 key={index} className="mkt-docs-h3">
          {block.text}
        </h3>,
      );
      continue;
    }
    if (block.type === 'p') {
      nodes.push(
        <p key={index}>
          <Inline parts={block.parts} />
        </p>,
      );
      continue;
    }
    if (block.type === 'ul' || block.type === 'ol') {
      const List = block.type === 'ul' ? 'ul' : 'ol';
      nodes.push(
        <List key={index} className="mkt-docs-list">
          <ListItems items={block.items} />
        </List>,
      );
      continue;
    }
    if (block.type === 'table') {
      nodes.push(
        <div key={index} className="mkt-docs-table-wrap">
          <table>
            <thead>
              <tr>
                {block.headers.map((cell, cellIndex) => (
                  <th key={cellIndex}>
                    <Inline parts={cell} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row, rowIndex) => (
                <tr key={rowIndex}>
                  {row.map((cell, cellIndex) => (
                    <td key={cellIndex}>
                      <Inline parts={cell} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>,
      );
      continue;
    }
    if (block.type === 'figure') {
      nodes.push(
        <DocsFigure key={index} src={block.src} alt={block.alt}>
          {block.caption.length ? <Inline parts={block.caption} /> : null}
        </DocsFigure>,
      );
    }
  }
  return <div className="mkt-docs-body">{nodes}</div>;
}
