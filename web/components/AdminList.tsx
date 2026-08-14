'use client';

import type { FormEvent, ReactNode } from 'react';
import { Panel } from '@/components/AdminUi';

/**
 * Barra superior de filtros / búsqueda de listados Admin.
 *
 * @remarks Misma superficie (`Panel.toolbar`) en todos los catálogos.
 */
export function ListToolbar({
  children,
  hint,
}: {
  children: ReactNode;
  hint?: ReactNode;
}) {
  return (
    <Panel className="toolbar">
      {children}
      {hint ? <p className="muted small toolbar-hint">{hint}</p> : null}
    </Panel>
  );
}

/**
 * Campo de búsqueda con submit (filtro `q` aplicado al enviar).
 */
export function ListSearchField({
  label = 'Buscar',
  value,
  onChange,
  onSubmit,
  placeholder,
}: {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  placeholder?: string;
}) {
  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    onSubmit();
  }

  return (
    <form className="toolbar-field search-form" onSubmit={handleSubmit}>
      <label>
        {label}
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete="off"
        />
      </label>
      <button type="submit" className="btn ghost">
        Buscar
      </button>
    </form>
  );
}

/**
 * Select de filtro en toolbar.
 */
export function ListFilterField({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
}) {
  return (
    <label className="toolbar-field">
      {label}
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        {children}
      </select>
    </label>
  );
}

/**
 * Paginación Anterior / Siguiente alineada a `ListResult.hasMore`.
 */
export function ListPagination({
  page,
  hasMore,
  onPageChange,
}: {
  page: number;
  hasMore: boolean;
  onPageChange: (page: number) => void;
}) {
  return (
    <div className="pager">
      <button
        type="button"
        className="btn ghost"
        disabled={page <= 1}
        onClick={() => onPageChange(Math.max(1, page - 1))}
      >
        Anterior
      </button>
      <span className="muted small">Página {page}</span>
      <button
        type="button"
        className="btn ghost"
        disabled={!hasMore}
        onClick={() => onPageChange(page + 1)}
      >
        Siguiente
      </button>
    </div>
  );
}

type DataTableProps = {
  title?: string;
  /** Ej. `12 afiliados · página 1`. */
  description?: ReactNode;
  loading: boolean;
  error: string | null;
  isEmpty: boolean;
  emptyText?: string;
  /** Fila de `<th>…</th>`. */
  header: ReactNode;
  /** Filas `<tr>…</tr>`. */
  children: ReactNode;
  page: number;
  hasMore: boolean;
  onPageChange: (page: number) => void;
};

/**
 * Panel tabular estándar: loading / error / vacío / tabla / paginación.
 *
 * @remarks Unifica el “idioma” de grillas Admin y Super.
 */
export function DataTable({
  title = 'Listado',
  description,
  loading,
  error,
  isEmpty,
  emptyText = 'No hay resultados.',
  header,
  children,
  page,
  hasMore,
  onPageChange,
}: DataTableProps) {
  if (loading) {
    return <p className="muted">Cargando…</p>;
  }
  if (error) {
    return <p className="error">{error}</p>;
  }

  return (
    <Panel title={title} description={description} className="table-wrap">
      {isEmpty ? (
        <p className="muted">{emptyText}</p>
      ) : (
        <table className="data-table">
          <thead>
            <tr>{header}</tr>
          </thead>
          <tbody>{children}</tbody>
        </table>
      )}
      <ListPagination
        page={page}
        hasMore={hasMore}
        onPageChange={onPageChange}
      />
    </Panel>
  );
}

/**
 * Descripción corta de conteo + página para `DataTable`.
 */
export function listCountDescription(
  total: number,
  page: number,
  singular: string,
  plural: string,
): string {
  const noun = total === 1 ? singular : plural;
  return `${total} ${noun} · página ${page}`;
}
