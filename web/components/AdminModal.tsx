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
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}) {
  useEffect(() => {
    if (!open) {
      return;
    }
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onClose();
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

  return (
    <div
      className="admin-modal-backdrop"
      role="presentation"
      onClick={onClose}
    >
      <div
        className="admin-modal"
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
          <button
            type="button"
            className="btn ghost"
            aria-label="Cerrar"
            onClick={onClose}
          >
            Cerrar
          </button>
        </header>
        <div className="admin-modal-body">{children}</div>
        {footer ? <footer className="admin-modal-footer">{footer}</footer> : null}
      </div>
    </div>
  );
}
