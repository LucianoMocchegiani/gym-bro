'use client';

import { useEffect, useRef } from 'react';

export type PickedSource = { name: string; detail?: string };

/**
 * Selector de planilla, zip o carpeta con el mismo look que la carpeta de afiliados.
 */
export function ImportFilePicker({
  selected,
  accept,
  label = 'Elegir archivo',
  hint,
  directory,
  disabled,
  onPick,
}: {
  selected: PickedSource | null;
  accept?: string;
  label?: string;
  hint: string;
  /** Elige una carpeta entera (con subcarpetas). */
  directory?: boolean;
  disabled?: boolean;
  onPick: (files: File[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const input = inputRef.current;
    if (!input) return;
    if (directory) {
      input.setAttribute('webkitdirectory', '');
    } else {
      input.removeAttribute('webkitdirectory');
    }
  }, [directory]);

  function open() {
    if (!disabled) {
      inputRef.current?.click();
    }
  }

  return (
    <div className="image-upload">
      {selected ? (
        <div
          className="folder-file-pdf"
          onClick={open}
          aria-disabled={disabled}
          title="Cambiar"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {directory ? (
              <path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z" />
            ) : (
              <>
                <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
                <path d="M14 2v4a2 2 0 0 0 2 2h4" />
              </>
            )}
          </svg>
          <span className="folder-file-pdf-name">{selected.name}</span>
          <span className="muted small">
            {selected.detail ? `${selected.detail} · ` : ''}Click para elegir
            otro
          </span>
        </div>
      ) : (
        <div
          className="folder-file-empty"
          onClick={open}
          aria-disabled={disabled}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M5 12h14" />
            <path d="M12 5v14" />
          </svg>
          <strong>{label}</strong>
          <span className="muted small">{hint}</span>
        </div>
      )}
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={directory}
        disabled={disabled}
        hidden
        onChange={(e) => {
          onPick(Array.from(e.target.files ?? []));
          e.target.value = '';
        }}
      />
    </div>
  );
}
