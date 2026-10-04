'use client';

import { ImageUpload } from '@/components/ImageUpload';
import {
  SITE_LIMITS,
  type SiteFocusX,
  type SiteFocusY,
  type SiteOverlay,
  type SiteTone,
} from '@/lib/api/tenant-site';
import { isSiteHex } from '@/lib/site-contrast';
import {
  draftContrastIssue,
  previewUrl,
  type DraftVisual,
} from './site-draft';

/** Formatos que acepta la web del gym (sin GIF: pesa y distrae). */
const SITE_IMAGE_ACCEPT = 'image/jpeg,image/png,image/webp';
/** Ancho mínimo para que el fondo no se vea pixelado a pantalla completa. */
const SITE_IMAGE_MIN_WIDTH = 1200;

const ACCENTS: Record<SiteTone, string[]> = {
  LIGHT: ['#ffe600', '#7ee081', '#5ec8ff', '#ff9f5b', '#ff7aa8'],
  DARK: ['#b00020', '#0b5394', '#1b5e20', '#6a1b9a', '#8a4b00'],
};

/** Input o textarea con contador de caracteres. */
export function CountedField({
  label,
  value,
  onChange,
  max,
  min,
  multiline,
  placeholder,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  max: number;
  min?: number;
  multiline?: boolean;
  placeholder?: string;
  disabled?: boolean;
}) {
  const length = value.trim().length;
  const short = min !== undefined && length < min;
  return (
    <label className="site-field">
      <span className="site-field-head">
        {label}
        <span className={`site-field-count${short ? ' is-short' : ''}`}>
          {min !== undefined ? `mín. ${min} · ` : ''}
          {value.length}/{max}
        </span>
      </span>
      {multiline ? (
        <textarea
          rows={3}
          value={value}
          maxLength={max}
          placeholder={placeholder}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <input
          value={value}
          maxLength={max}
          placeholder={placeholder}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </label>
  );
}

/**
 * Fondo (imagen o color liso) y colores del texto, con aviso de contraste.
 *
 * @remarks La imagen queda como archivo hasta publicar (se sube a la carpeta
 * `site` de R2 al guardar).
 */
export function SiteVisualFields({
  value,
  onChange,
  onImageError,
  disabled,
}: {
  value: DraftVisual;
  onChange: (next: DraftVisual) => void;
  onImageError: (message: string) => void;
  disabled?: boolean;
}) {
  const { image } = value;
  const contrast = draftContrastIssue(value);

  function selectFile(file: File | null) {
    if (image?.previewUrl) {
      URL.revokeObjectURL(image.previewUrl);
    }
    onChange({
      ...value,
      image: file
        ? {
            url: null,
            file,
            previewUrl: URL.createObjectURL(file),
            alt: image?.alt ?? '',
            focusX: image?.focusX ?? 'CENTER',
            focusY: image?.focusY ?? 'CENTER',
          }
        : null,
    });
  }

  return (
    <div className="site-visual-fields">
      <ImageUpload
        label={`Imagen de fondo (opcional · JPG, PNG o WebP · mín. ${SITE_IMAGE_MIN_WIDTH} px de ancho)`}
        value={image ? previewUrl(image) : null}
        accept={SITE_IMAGE_ACCEPT}
        minWidth={SITE_IMAGE_MIN_WIDTH}
        onReject={onImageError}
        onFileSelect={selectFile}
        disabled={disabled}
      />
      {image ? (
        <>
          <CountedField
            label="Descripción de la imagen (para quien no la ve)"
            value={image.alt}
            max={SITE_LIMITS.imageAlt.max}
            placeholder="Ej.: sala de musculación con máquinas"
            disabled={disabled}
            onChange={(alt) => onChange({ ...value, image: { ...image, alt } })}
          />
          <div className="site-field-row">
            <label>
              Enfoque horizontal
              <select
                value={image.focusX}
                disabled={disabled}
                onChange={(e) =>
                  onChange({
                    ...value,
                    image: { ...image, focusX: e.target.value as SiteFocusX },
                  })
                }
              >
                <option value="LEFT">Izquierda</option>
                <option value="CENTER">Centro</option>
                <option value="RIGHT">Derecha</option>
              </select>
            </label>
            <label>
              Enfoque vertical
              <select
                value={image.focusY}
                disabled={disabled}
                onChange={(e) =>
                  onChange({
                    ...value,
                    image: { ...image, focusY: e.target.value as SiteFocusY },
                  })
                }
              >
                <option value="TOP">Arriba</option>
                <option value="CENTER">Centro</option>
                <option value="BOTTOM">Abajo</option>
              </select>
            </label>
            <label>
              Capa sobre la imagen
              <select
                value={value.overlay}
                disabled={disabled}
                onChange={(e) =>
                  onChange({ ...value, overlay: e.target.value as SiteOverlay })
                }
              >
                <option value="SOFT">Suave</option>
                <option value="MEDIUM">Media</option>
                <option value="STRONG">Fuerte</option>
              </select>
            </label>
          </div>
        </>
      ) : null}

      <label>
        Texto
        <select
          value={value.tone}
          disabled={disabled}
          onChange={(e) =>
            onChange({ ...value, tone: e.target.value as SiteTone })
          }
        >
          <option value="LIGHT">Claro (fondo oscuro)</option>
          <option value="DARK">Oscuro (fondo claro)</option>
        </select>
      </label>

      <div className="site-field">
        <span className="site-field-head">Color del título</span>
        <div className="site-swatches">
          <button
            type="button"
            className="site-swatch is-none"
            aria-pressed={value.accent === null}
            disabled={disabled}
            onClick={() => onChange({ ...value, accent: null })}
          >
            Igual al texto
          </button>
          {ACCENTS[value.tone].map((color) => (
            <button
              key={color}
              type="button"
              className="site-swatch"
              style={{ background: color }}
              aria-label={`Color ${color}`}
              aria-pressed={value.accent === color}
              disabled={disabled}
              onClick={() => onChange({ ...value, accent: color })}
            />
          ))}
          <input
            type="color"
            className="site-swatch-picker"
            aria-label="Otro color"
            value={value.accent && isSiteHex(value.accent) ? value.accent : '#ffffff'}
            disabled={disabled}
            onChange={(e) =>
              onChange({ ...value, accent: e.target.value.toLowerCase() })
            }
          />
        </div>
      </div>

      {contrast ? <p className="error small">{contrast}</p> : null}
    </div>
  );
}
