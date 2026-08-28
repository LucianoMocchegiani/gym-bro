'use client';

import type { MouseEvent, ReactNode } from 'react';

/**
 * Botón de acción en fila de grilla (icono + tooltip nativo).
 */
export function RowIconButton({
  label,
  onClick,
  href,
  children,
  disabled,
}: {
  label: string;
  onClick?: (e: MouseEvent<HTMLButtonElement>) => void;
  href?: string;
  children: ReactNode;
  disabled?: boolean;
}) {
  if (href && !disabled) {
    return (
      <a
        href={href}
        className="row-icon-btn"
        title={label}
        aria-label={label}
      >
        {children}
      </a>
    );
  }
  return (
    <button
      type="button"
      className="row-icon-btn"
      title={label}
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}

/**
 * Contenedor de acciones de fila (iconos alineados).
 */
export function RowActions({ children }: { children: ReactNode }) {
  return <div className="row-actions row-actions-icons">{children}</div>;
}

/** Icono lápiz — ficha / editar. */
export function IconEdit() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zm2.92 2.33H5v-.92l9.06-9.06.92.92L5.92 19.58zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"
      />
    </svg>
  );
}

/** Icono cartera / cuenta. */
export function IconAccount() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M21 7.28V5c0-1.1-.9-2-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14c1.1 0 2-.9 2-2v-2.28A2 2 0 0 0 22 15V9a2 2 0 0 0-1-1.72zM20 9v6h-2V9h2zM5 19V5h14v2H7v10h12v2H5z"
      />
    </svg>
  );
}

/** Icono ojo — ver detalle. */
export function IconView() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M12 5c-7 0-10 7-10 7s3 7 10 7 10-7 10-7-3-7-10-7zm0 12a5 5 0 1 1 0-10 5 5 0 0 1 0 10zm0-8a3 3 0 1 0 0 6 3 3 0 0 0 0-6z"
      />
    </svg>
  );
}

/** Icono engranaje / roles. */
export function IconRoles() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M19.14 12.94c.04-.31.06-.63.06-.94s-.02-.63-.06-.94l2.03-1.58a.5.5 0 0 0 .12-.64l-1.92-3.32a.5.5 0 0 0-.6-.22l-2.39.96a7.1 7.1 0 0 0-1.63-.94l-.36-2.54A.5.5 0 0 0 14 2h-4a.5.5 0 0 0-.5.42l-.36 2.54c-.59.22-1.14.53-1.63.94l-2.39-.96a.5.5 0 0 0-.6.22L2.7 8.48a.5.5 0 0 0 .12.64l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94L2.82 14.7a.5.5 0 0 0-.12.64l1.92 3.32c.13.23.4.32.6.22l2.39-.96c.5.41 1.04.72 1.63.94l.36 2.54c.05.24.26.42.5.42h4c.24 0 .45-.18.5-.42l.36-2.54c.59-.22 1.14-.53 1.63-.94l2.39.96c.23.1.47 0 .6-.22l1.92-3.32a.5.5 0 0 0-.12-.64l-2.03-1.58zM12 15.5A3.5 3.5 0 1 1 12 8a3.5 3.5 0 0 1 0 7.5z"
      />
    </svg>
  );
}

/** Icono llave — credencial de acceso. */
export function IconCredential() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M12.65 10A5.99 5.99 0 0 0 7 6c-3.31 0-6 2.69-6 6s2.69 6 6 6a5.99 5.99 0 0 0 5.65-4H17v4h4v-4h2v-4H12.65zM7 14c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z"
      />
    </svg>
  );
}

/** Icono personas — roster de sesión. */
export function IconRoster() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5s-3 1.34-3 3 1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5C15 14.17 10.33 13 8 13zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"
      />
    </svg>
  );
}

/** Icono lista — waitlist. */
export function IconWaitlist() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M4 6h16v2H4V6zm0 5h16v2H4v-2zm0 5h10v2H4v-2z"
      />
    </svg>
  );
}

/** Icono comprobante / recibo. */
export function IconReceipt() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M19.5 3.5 18 2l-1.5 1.5L15 2l-1.5 1.5L12 2l-1.5 1.5L9 2 7.5 3.5 6 2v14H3v3c0 1.66 3.34 3 7.5 3s7.5-1.34 7.5-3V2l-1.5 1.5zM19 19c0 .55-2.24 1-5 1s-5-.45-5-1v-1.5c0 1.38 2.24 2.5 5 2.5s5-1.12 5-2.5V19zM17 7H7V5h10v2zm-3.5 4H7V9h6.5v2zm3.5 4H7v-2h10v2z"
      />
    </svg>
  );
}

/** Icono basura — eliminar (destructivo). */
export function IconTrash() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M6 19a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7H6v12zM8 9h8v10H8V9zm.5-5 1-1h5l1 1H20v2H4V4h4.5z"
      />
    </svg>
  );
}

/** Icono puntos verticales — más acciones. */
export function IconDots() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M12 8a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm0 6a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm0 6a2 2 0 1 0 0-4 2 2 0 0 0 0 4z"
      />
    </svg>
  );
}
