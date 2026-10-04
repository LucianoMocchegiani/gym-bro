'use client';

import { ImageUpload } from '@/components/ImageUpload';
import {
  SITE_LIMITS,
  type SiteFocusX,
  type SiteFocusY,
  type SiteOverlay,
  type SiteTheme,
  type SiteThemeColors,
  type SiteTone,
} from '@/lib/api/tenant-site';
import { isSiteHex } from '@/lib/site-contrast';
import {
  draftContrastIssue,
  previewUrl,
  SITE_THEME_LABELS,
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

const THEMES: SiteTheme[] = ['light', 'dark'];

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
 * Fondo de un bloque: imagen compartida y colores para cada tema de la web
 * (claro u oscuro), con aviso de contraste.
 *
 * @remarks La imagen queda como archivo hasta publicar (se sube a la carpeta
 * `site` de R2 al guardar). La pestaña de tema la comparte todo el editor y
 * también decide qué tema muestra la vista previa.
 */
export function SiteVisualFields({
  value,
  onChange,
  theme,
  onThemeChange,
  onImageError,
  disabled,
}: {
  value: DraftVisual;
  onChange: (next: DraftVisual) => void;
  theme: SiteTheme;
  onThemeChange: (theme: SiteTheme) => void;
  onImageError: (message: string) => void;
  disabled?: boolean;
}) {
  const { image } = value;
  const colors = value[theme];
  const other: SiteTheme = theme === 'light' ? 'dark' : 'light';
  const contrast = draftContrastIssue(value, theme);

  function setColors(patch: Partial<SiteThemeColors>) {
    onChange({ ...value, [theme]: { ...colors, ...patch } });
  }

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
          </div>
        </>
      ) : null}

      <div className="site-theme-box">
        <div className="site-theme-head">
          <div className="site-slide-tabs" role="group" aria-label="Colores por tema">
            {THEMES.map((t) => (
              <button
                key={t}
                type="button"
                className="site-slide-tab"
                aria-pressed={t === theme}
                onClick={() => onThemeChange(t)}
              >
                {SITE_THEME_LABELS[t]}
                {draftContrastIssue(value, t) ? (
                  <span className="site-theme-alert" aria-label="no se lee">
                    {' '}!
                  </span>
                ) : null}
              </button>
            ))}
          </div>
          <button
            type="button"
            className="linkish"
            disabled={disabled}
            onClick={() => onChange({ ...value, [theme]: { ...value[other] } })}
          >
            Copiar del {SITE_THEME_LABELS[other].toLowerCase()}
          </button>
        </div>
        <p className="muted small">
          Cada visitante ve la web en su tema. Elegí los colores para los dos.
        </p>

        <div className="site-field-row">
          <label>
            Texto
            <select
              value={colors.tone}
              disabled={disabled}
              onChange={(e) => setColors({ tone: e.target.value as SiteTone })}
            >
              <option value="LIGHT">Claro (fondo oscuro)</option>
              <option value="DARK">Oscuro (fondo claro)</option>
            </select>
          </label>
          {image ? (
            <label>
              Capa sobre la imagen
              <select
                value={colors.overlay}
                disabled={disabled}
                onChange={(e) =>
                  setColors({ overlay: e.target.value as SiteOverlay })
                }
              >
                <option value="SOFT">Suave</option>
                <option value="MEDIUM">Media</option>
                <option value="STRONG">Fuerte</option>
              </select>
            </label>
          ) : null}
        </div>

        <div className="site-field">
          <span className="site-field-head">Color del título</span>
          <div className="site-swatches">
            <button
              type="button"
              className="site-swatch is-none"
              aria-pressed={colors.accent === null}
              disabled={disabled}
              onClick={() => setColors({ accent: null })}
            >
              Igual al texto
            </button>
            {ACCENTS[colors.tone].map((color) => (
              <button
                key={color}
                type="button"
                className="site-swatch"
                style={{ background: color }}
                aria-label={`Color ${color}`}
                aria-pressed={colors.accent === color}
                disabled={disabled}
                onClick={() => setColors({ accent: color })}
              />
            ))}
            <input
              type="color"
              className="site-swatch-picker"
              aria-label="Otro color"
              value={
                colors.accent && isSiteHex(colors.accent)
                  ? colors.accent
                  : '#ffffff'
              }
              disabled={disabled}
              onChange={(e) =>
                setColors({ accent: e.target.value.toLowerCase() })
              }
            />
          </div>
        </div>

        {contrast ? <p className="error small">{contrast}</p> : null}
      </div>
    </div>
  );
}
