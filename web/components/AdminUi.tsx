import type { HTMLAttributes, ReactNode } from 'react';

type PanelProps = HTMLAttributes<HTMLElement> & {
  title?: string;
  description?: ReactNode;
  children: ReactNode;
};

/**
 * Superficie estándar del panel Admin.
 *
 * @remarks Unifica formularios, listados y estados entre los módulos.
 */
export function Panel({
  title,
  description,
  children,
  className = '',
  ...props
}: PanelProps) {
  const classes = ['admin-panel', className].filter(Boolean).join(' ');

  return (
    <section className={classes} {...props}>
      {title || description ? (
        <header className="admin-panel-head">
          {title ? <h2>{title}</h2> : null}
          {description ? <p className="muted">{description}</p> : null}
        </header>
      ) : null}
      {children}
    </section>
  );
}

/**
 * Contenedor de dos columnas responsivo para vistas Admin.
 */
export function AdminGrid({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={['admin-grid', className].filter(Boolean).join(' ')}>
      {children}
    </div>
  );
}
