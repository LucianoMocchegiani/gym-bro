type PreviewKind = 'member' | 'door' | 'cash';

const COPY: Record<PreviewKind, { kicker: string; title: string; meta: string }> = {
  member: {
    kicker: 'Socio',
    title: 'Ana López',
    meta: 'Al día · mensualidad activa',
  },
  door: { kicker: 'Puerta', title: 'Permitido', meta: 'Pilates 14:02' },
  cash: {
    kicker: 'Caja',
    title: 'Cobro en mostrador',
    meta: 'Mensualidad',
  },
};

/**
 * Mini tarjeta de producto (casos de uso), análogo a la credencial de Kuatia.
 */
export function ProductPreviewCard({ kind }: { kind: PreviewKind }) {
  const item = COPY[kind];
  return (
    <div className={`mkt-preview mkt-preview-${kind}`}>
      <p className="muted small">{item.kicker}</p>
      <p className="mkt-preview-title">{item.title}</p>
      <p className="muted">{item.meta}</p>
    </div>
  );
}
