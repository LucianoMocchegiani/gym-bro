'use client';

import { useEffect, type ReactNode } from 'react';

/**
 * Modal estándar Admin (overlay + panel centrado).
 *
 * @remarks Escape y click en el backdrop cierran. Bloquea scroll del body.
 */
export function AdminModal({
  open,
  onClose,
  title,
  description,
  showCloseButton = true,
  children,
  footer,
  size = 'default',
  elevated = false,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  description?: ReactNode;
  footer?: ReactNode;
  /** Si `false`, no se muestra el botón de cerrar. */
  showCloseButton?: boolean;
  /** `comfortable` = más aire para fichas / estado de cuenta. */
  size?: 'default' | 'wide' | 'comfortable';
  /** z-index por encima de otro AdminModal (confirmaciones anidadas). */
  elevated?: boolean;
}) {
  useEffect(() => {
    if (!open) {
      return;
    }
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onClose?.();
      }
    }
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  const sizeClass =
    size === 'comfortable'
      ? ' admin-modal-comfortable'
      : size === 'wide'
        ? ' admin-modal-wide'
        : '';

  return (
    <div
      className={
        elevated
          ? 'admin-modal-backdrop admin-modal-backdrop-elevated'
          : 'admin-modal-backdrop'
      }
      role="presentation"
      onClick={onClose}
    >
      <div
        className={`admin-modal${sizeClass}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="admin-modal-head">
          <div>
            <h2 id="admin-modal-title">{title}</h2>
            {description ? (
              <p className="muted small">{description}</p>
            ) : null}
          </div>
          {showCloseButton ? (
          <button
            type="button"
            className="btn ghost"
            aria-label="Cerrar"
            onClick={onClose}
          >
            x 
          </button>
          ) : null}
        </header>
        <div className="admin-modal-body">{children}</div>
        {footer ? <footer className="admin-modal-footer">{footer}</footer> : null}
      </div>
    </div>
  );
}
