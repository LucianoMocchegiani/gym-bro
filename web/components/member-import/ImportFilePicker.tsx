'use client';

import { useRef } from 'react';

/**
 * Selector de planilla o zip con el mismo look que la carpeta de afiliados.
 */
export function ImportFilePicker({
  file,
  accept,
  hint,
  disabled,
  onPick,
}: {
  file: File | null;
  accept: string;
  hint: string;
  disabled?: boolean;
  onPick: (file: File | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  function open() {
    if (!disabled) {
      inputRef.current?.click();
    }
  }

  return (
    <div className="image-upload">
      {file ? (
        <div
          className="folder-file-pdf"
          onClick={open}
          aria-disabled={disabled}
          title="Cambiar archivo"
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
            <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
            <path d="M14 2v4a2 2 0 0 0 2 2h4" />
          </svg>
          <span className="folder-file-pdf-name">{file.name}</span>
          <span className="muted small">Click para elegir otro</span>
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
          <strong>Elegir archivo</strong>
          <span className="muted small">{hint}</span>
        </div>
      )}
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        disabled={disabled}
        hidden
        onChange={(e) => {
          onPick(e.target.files?.[0] ?? null);
          e.target.value = '';
        }}
      />
    </div>
  );
}
