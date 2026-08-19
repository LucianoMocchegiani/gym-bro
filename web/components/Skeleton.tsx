import type { CSSProperties } from 'react';

/**
 * Primitiva de skeleton (shimmer) para estados de carga async.
 *
 * @remarks Cada variante de alto nivel reproduce la forma del contenido
 * real (tabla, form, panel, cards) para minimizar el salto de layout.
 */
export function Skeleton({
  className = '',
  style,
}: {
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <div
      className={`skeleton${className ? ` ${className}` : ''}`}
      style={style}
      aria-hidden="true"
    />
  );
}

/** Filas de tabular shape: header + filas de celdas. */
export function SkeletonTable({
  rows = 6,
  cols = 5,
}: {
  rows?: number;
  cols?: number;
}) {
  const gridStyle: CSSProperties = {
    gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
  };
  return (
    <div className="skeleton-table" role="status" aria-label="Cargando">
      <div className="skeleton-table-row" style={gridStyle}>
        {Array.from({ length: cols }).map((_, c) => (
          <Skeleton key={c} className="skeleton-cell" style={{ width: '100%' }} />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div className="skeleton-table-row" style={gridStyle} key={r}>
          {Array.from({ length: cols }).map((_, c) => (
            <Skeleton
              key={c}
              className="skeleton-cell"
              style={{ width: `${78 - (c % 3) * 14}%` }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

/** Form shape: labels + inputs + botón. */
export function SkeletonForm({ fields = 3 }: { fields?: number }) {
  return (
    <div className="skeleton-form" role="status" aria-label="Cargando">
      {Array.from({ length: fields }).map((_, i) => (
        <div className="skeleton-field" key={i}>
          <Skeleton className="skeleton-label" />
          <Skeleton className="skeleton-input" />
        </div>
      ))}
      <Skeleton className="skeleton-button" />
    </div>
  );
}

/** Panel shape: header + líneas de cuerpo. */
export function SkeletonPanel({ lines = 4 }: { lines?: number }) {
  return (
    <div className="admin-panel" role="status" aria-label="Cargando">
      <header className="admin-panel-head">
        <Skeleton className="skeleton-title" />
        <Skeleton className="skeleton-subtitle" />
      </header>
      <div className="skeleton-panel-body">
        {Array.from({ length: lines }).map((_, i) => (
          <Skeleton key={i} style={{ width: `${95 - (i % 4) * 12}%` }} />
        ))}
      </div>
    </div>
  );
}

/** Fila de stat-cards (reportes, caja, KPIs). */
export function SkeletonCards({ count = 4 }: { count?: number }) {
  return (
    <div className="stat-row" role="status" aria-label="Cargando">
      {Array.from({ length: count }).map((_, i) => (
        <div className="admin-panel stat-card" key={i}>
          <Skeleton className="skeleton-card-label" />
          <Skeleton className="skeleton-card-value" />
        </div>
      ))}
    </div>
  );
}

/** Fallback genérico de página (Suspense). */
export function PageSkeleton() {
  return (
    <div className="admin-stack" role="status" aria-label="Cargando página">
      <SkeletonTable rows={5} cols={5} />
      <SkeletonPanel lines={3} />
    </div>
  );
}