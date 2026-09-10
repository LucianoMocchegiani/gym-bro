'use client';

import { useEffect, useRef, type ReactNode } from 'react';

type DocsFigureProps = {
  src: string;
  alt: string;
  children: ReactNode;
};

function setPageScrollLocked(locked: boolean) {
  document.documentElement.classList.toggle('mkt-docs-lightbox-open', locked);
}

/**
 * Miniatura de captura en la guía: click abre el PNG a tamaño original.
 */
export function DocsFigure({ src, alt, children }: DocsFigureProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const syncLock = () => setPageScrollLocked(dialog.open);
    const preventScroll = (event: Event) => {
      if (dialog.open) {
        event.preventDefault();
      }
    };

    dialog.addEventListener('close', syncLock);
    document.addEventListener('wheel', preventScroll, { passive: false });
    document.addEventListener('touchmove', preventScroll, { passive: false });
    return () => {
      dialog.removeEventListener('close', syncLock);
      document.removeEventListener('wheel', preventScroll);
      document.removeEventListener('touchmove', preventScroll);
      setPageScrollLocked(false);
    };
  }, []);

  function openLightbox() {
    dialogRef.current?.showModal();
    setPageScrollLocked(true);
  }

  function closeLightbox() {
    dialogRef.current?.close();
    setPageScrollLocked(false);
  }

  return (
    <figure className="mkt-docs-figure">
      <button
        type="button"
        className="mkt-docs-zoom"
        onClick={openLightbox}
        aria-haspopup="dialog"
        title="Ver tamaño original"
        aria-label={`Ver captura a tamaño original: ${alt}`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt="" className="mkt-docs-img" />
      </button>
      {children ? <figcaption>{children}</figcaption> : null}
      <dialog
        ref={dialogRef}
        className="mkt-docs-lightbox"
        aria-label={alt}
        onClick={(event) => {
          if (event.target === event.currentTarget) {
            closeLightbox();
          }
        }}
      >
        <button
          type="button"
          className="mkt-docs-lightbox-close"
          onClick={closeLightbox}
          aria-label="Cerrar"
        >
          <span aria-hidden="true">×</span>
        </button>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={alt} />
      </dialog>
    </figure>
  );
}
