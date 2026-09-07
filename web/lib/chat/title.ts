/**
 * Título automático: primer mensaje, una línea, recortado (espejo de chat-api).
 */
const AUTO_TITLE_MAX = 60;

export function titleFromFirstMessage(text: string): string {
  const oneLine = text.replace(/\s+/g, ' ').trim();
  if (oneLine.length === 0) {
    return 'Nuevo chat';
  }
  if (oneLine.length <= AUTO_TITLE_MAX) {
    return oneLine;
  }
  const cut = oneLine.slice(0, AUTO_TITLE_MAX);
  const space = cut.lastIndexOf(' ');
  const base = space > 24 ? cut.slice(0, space) : cut;
  return `${base.trimEnd()}…`;
}
