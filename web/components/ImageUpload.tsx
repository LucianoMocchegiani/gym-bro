'use client';

import { useRef, useState } from 'react';

type ImageUploadProps = {
  value?: string | null;
  onFileSelect?: (file: File | null) => void;
  onClear?: () => void;
  label?: string;
  disabled?: boolean;
  /** Tipos MIME del selector. */
  accept?: string;
  /** Ancho mínimo en px; si no llega, no se toma el archivo. */
  minWidth?: number;
  /** Archivo descartado por tipo o ancho (mensaje para el staff). */
  onReject?: (message: string) => void;
};

const DEFAULT_ACCEPT = 'image/jpeg,image/png,image/webp,image/gif';

function readImageWidth(url: string): Promise<number> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img.naturalWidth);
    img.onerror = () => resolve(0);
    img.src = url;
  });
}

export function ImageUpload({
  value,
  onFileSelect,
  onClear,
  label = 'Imagen',
  disabled,
  accept = DEFAULT_ACCEPT,
  minWidth,
  onReject,
}: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const input = e.target;
    const file = input.files?.[0];
    if (!file) return;
    if (!accept.split(',').includes(file.type)) {
      input.value = '';
      onReject?.('Ese formato de imagen no está permitido acá');
      return;
    }
    const url = URL.createObjectURL(file);
    if (minWidth) {
      const width = await readImageWidth(url);
      if (width < minWidth) {
        URL.revokeObjectURL(url);
        input.value = '';
        onReject?.(
          width
            ? `La imagen mide ${width} px de ancho: necesita al menos ${minWidth} px`
            : 'No se pudo leer la imagen',
        );
        return;
      }
    }
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(url);
    onFileSelect?.(file);
  }

  function handleClear(e: React.MouseEvent) {
    e.stopPropagation();
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    onFileSelect?.(null);
    onClear?.();
    if (inputRef.current) inputRef.current.value = '';
  }

  function handleReplace(e: React.MouseEvent) {
    e.stopPropagation();
    inputRef.current?.click();
  }

  const displayUrl = previewUrl ?? value;

  return (
    <div className="image-upload">
      <span className="muted small">{label}</span>

      {displayUrl ? (
        <div
          className="image-upload-preview"
          onClick={() => inputRef.current?.click()}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={displayUrl} alt="" className="image-upload-thumb" />
          <div className="image-upload-overlay">
            <button
              type="button"
              className="image-upload-icon-btn"
              onClick={handleReplace}
              disabled={disabled}
              title="Cambiar imagen"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"/>
                <path d="m15 5 4 4"/>
              </svg>
            </button>
            <button
              type="button"
              className="image-upload-icon-btn danger"
              onClick={handleClear}
              disabled={disabled}
              title="Quitar imagen"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 6h18"/>
                <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
                <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
                <path d="M10 11v6"/>
                <path d="M14 11v6"/>
              </svg>
            </button>
          </div>
        </div>
      ) : (
        <div
          className="image-upload-empty"
          onClick={() => inputRef.current?.click()}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14"/>
            <path d="M12 5v14"/>
          </svg>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={(e) => void handleChange(e)}
        disabled={disabled}
        hidden
      />
    </div>
  );
}

export async function uploadImageToApi(
  file: File,
  folder: string,
): Promise<string> {
  const base = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') ?? '';
  const url = `${base}/api/upload`;

  const formData = new FormData();
  formData.append('file', file);
  formData.append('folder', folder);

  let token: string | null = null;
  try {
    const raw = localStorage.getItem('gymbro.staff.session');
    if (raw) {
      const session = JSON.parse(raw) as { accessToken?: string };
      token = session.accessToken ?? null;
    }
  } catch { /* ignore */ }

  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(url, { method: 'POST', headers, body: formData });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.message ?? 'Error al subir imagen');
  }

  const { url: imageUrl } = await res.json();
  return imageUrl;
}
