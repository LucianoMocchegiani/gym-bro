'use client';

import { useState } from 'react';
import { Panel } from '@/components/AdminUi';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { uploadImageToApi } from '@/components/ImageUpload';
import { SiteHeroView, SiteSlideView } from '@/components/gym-site/site/SiteViews';
import { ApiClientError } from '@/lib/api/client';
import type { PackSummary } from '@/lib/api/packs';
import {
  putTenantSite,
  resetTenantSite,
  SITE_IMAGE_FOLDER,
  SITE_LIMITS,
  type SiteButtonTarget,
  type SiteTheme,
  type TenantSiteDetail,
} from '@/lib/api/tenant-site';
import { CountedField, SiteVisualFields } from './SiteFields';
import {
  draftFromContent,
  draftIssues,
  draftToContent,
  mapDraftImages,
  newSlide,
  newSlider,
  pendingImages,
  previewUrl,
  SITE_THEME_LABELS,
  type DraftButton,
  type DraftHero,
  type DraftImage,
  type DraftSlide,
  type DraftSlider,
  type SiteDraft,
} from './site-draft';

type Selection = { slider: number; slide: number } | null;

function move<T>(items: T[], from: number, to: number): T[] {
  if (to < 0 || to >= items.length) {
    return items;
  }
  const next = [...items];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

function errorMessage(err: unknown, fallback: string): string {
  return err instanceof ApiClientError || err instanceof Error
    ? err.message
    : fallback;
}

const NEW_BUTTON: DraftButton = {
  label: 'Ver planes',
  target: 'PLANS',
  packId: '',
  url: '',
};

/**
 * Sistema → Web del gym: portada y sliders con vista previa (RN-CTA-010).
 *
 * @remarks Publicar sube las imágenes nuevas a R2 y después hace el PUT: lo
 * guardado se ve al instante en la web del gym. El padre remonta el editor
 * (`key`) con lo que devuelve la API.
 */
export function SiteEditor({
  detail,
  packs,
  canWrite,
  onSaved,
}: {
  detail: TenantSiteDetail;
  packs: PackSummary[];
  canWrite: boolean;
  onSaved: (detail: TenantSiteDetail, message: string) => void;
}) {
  const [draft, setDraft] = useState<SiteDraft>(() =>
    draftFromContent(detail.content),
  );
  const [selected, setSelected] = useState<Selection>(null);
  const [theme, setTheme] = useState<SiteTheme>('dark');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);

  const disabled = !canWrite || busy;
  const issues = draftIssues(draft);
  const preview = draftToContent(draft, previewUrl);
  const previewSlide = selected
    ? preview.sliders[selected.slider]?.slides[selected.slide]
    : undefined;

  function setHero(patch: Partial<DraftHero>) {
    setDraft((d) => ({ ...d, hero: { ...d.hero, ...patch } }));
  }

  function setSliders(fn: (sliders: DraftSlider[]) => DraftSlider[]) {
    setDraft((d) => ({ ...d, sliders: fn(d.sliders) }));
  }

  function updateSlider(si: number, fn: (s: DraftSlider) => DraftSlider) {
    setSliders((list) => list.map((s, i) => (i === si ? fn(s) : s)));
  }

  function updateSlide(
    si: number,
    index: number,
    fn: (s: DraftSlide) => DraftSlide,
  ) {
    updateSlider(si, (s) => ({
      ...s,
      slides: s.slides.map((slide, i) => (i === index ? fn(slide) : slide)),
    }));
  }

  function addSlider() {
    setSliders((list) => [...list, newSlider()]);
    setSelected({ slider: draft.sliders.length, slide: 0 });
  }

  function removeSlider(si: number) {
    setSliders((list) => list.filter((_, i) => i !== si));
    setSelected(null);
  }

  function moveSlider(si: number, to: number) {
    setSliders((list) => move(list, si, to));
    setSelected(null);
  }

  function addSlide(si: number) {
    const count = draft.sliders[si].slides.length;
    updateSlider(si, (s) => ({ ...s, slides: [...s.slides, newSlide()] }));
    setSelected({ slider: si, slide: count });
  }

  function removeSlide(si: number, index: number) {
    updateSlider(si, (s) => ({
      ...s,
      slides: s.slides.filter((_, i) => i !== index),
    }));
    setSelected({ slider: si, slide: Math.max(0, index - 1) });
  }

  function moveSlide(si: number, index: number, to: number) {
    const count = draft.sliders[si].slides.length;
    if (to < 0 || to >= count) {
      return;
    }
    updateSlider(si, (s) => ({ ...s, slides: move(s.slides, index, to) }));
    setSelected({ slider: si, slide: to });
  }

  async function publish() {
    setBusy(true);
    setError(null);
    try {
      const uploaded = new Map<DraftImage, string>();
      for (const image of pendingImages(draft)) {
        uploaded.set(
          image,
          await uploadImageToApi(image.file as File, SITE_IMAGE_FOLDER),
        );
      }
      const ready = mapDraftImages(draft, (image) => {
        const url = uploaded.get(image);
        return url ? { ...image, url, file: null } : image;
      });
      setDraft(ready);
      const saved = await putTenantSite(
        draftToContent(ready, (image) => image.url),
      );
      onSaved(saved, 'Publicado: ya se ve en la web del gym.');
    } catch (err) {
      setError(errorMessage(err, 'No se pudo publicar la web'));
      setBusy(false);
    }
  }

  async function reset() {
    setBusy(true);
    setError(null);
    try {
      const saved = await resetTenantSite();
      onSaved(saved, 'Listo: la web volvió a la vidriera por defecto.');
    } catch (err) {
      setError(errorMessage(err, 'No se pudo restablecer la web'));
      setBusy(false);
      setConfirmReset(false);
    }
  }

  return (
    <div className="site-editor">
      <div className="admin-stack">
        <Panel
          title="Portada"
          description="Lo primero que ve quien entra a la web del gym."
        >
          <div className="admin-form" onFocus={() => setSelected(null)}>
            <CountedField
              label="Título"
              value={draft.hero.title}
              min={SITE_LIMITS.heroTitle.min}
              max={SITE_LIMITS.heroTitle.max}
              disabled={disabled}
              onChange={(title) => setHero({ title })}
            />
            <CountedField
              label="Subtítulo (opcional)"
              value={draft.hero.subtitle}
              max={SITE_LIMITS.heroSubtitle.max}
              multiline
              disabled={disabled}
              onChange={(subtitle) => setHero({ subtitle })}
            />
            <SiteVisualFields
              value={draft.hero}
              disabled={disabled}
              theme={theme}
              onThemeChange={setTheme}
              onImageError={setError}
              onChange={(visual) => setHero(visual)}
            />
          </div>
        </Panel>

        {draft.sliders.map((slider, si) => (
          <Panel
            key={slider.id}
            title={`Slider ${si + 1}`}
            description="Rota solo cada 6 segundos. Hasta 10 slides."
          >
            <div className="admin-form">
              <div className="site-row-actions">
                <button
                  type="button"
                  className="btn ghost"
                  disabled={disabled || si === 0}
                  onClick={() => moveSlider(si, si - 1)}
                >
                  Subir
                </button>
                <button
                  type="button"
                  className="btn ghost"
                  disabled={disabled || si === draft.sliders.length - 1}
                  onClick={() => moveSlider(si, si + 1)}
                >
                  Bajar
                </button>
                <button
                  type="button"
                  className="btn danger"
                  disabled={disabled}
                  onClick={() => removeSlider(si)}
                >
                  Quitar slider
                </button>
              </div>
              <CountedField
                label="Título de la sección (opcional)"
                value={slider.title}
                max={SITE_LIMITS.sliderTitle.max}
                disabled={disabled}
                onChange={(title) => updateSlider(si, (s) => ({ ...s, title }))}
              />

              <div className="site-slide-tabs" role="group" aria-label="Slides">
                {slider.slides.map((slide, i) => (
                  <button
                    key={slide.id}
                    type="button"
                    className="site-slide-tab"
                    aria-pressed={
                      selected?.slider === si && selected.slide === i
                    }
                    onClick={() => setSelected({ slider: si, slide: i })}
                  >
                    {i + 1}. {slide.title.trim() || 'Sin título'}
                  </button>
                ))}
                {slider.slides.length < SITE_LIMITS.slides.max ? (
                  <button
                    type="button"
                    className="site-slide-tab is-add"
                    disabled={disabled}
                    onClick={() => addSlide(si)}
                  >
                    + Slide
                  </button>
                ) : null}
              </div>

              {selected?.slider === si && slider.slides[selected.slide] ? (
                <SlideForm
                  slide={slider.slides[selected.slide]}
                  index={selected.slide}
                  count={slider.slides.length}
                  packs={packs}
                  disabled={disabled}
                  theme={theme}
                  onThemeChange={setTheme}
                  onImageError={setError}
                  onChange={(fn) => updateSlide(si, selected.slide, fn)}
                  onMove={(to) => moveSlide(si, selected.slide, to)}
                  onRemove={() => removeSlide(si, selected.slide)}
                />
              ) : (
                <p className="muted small">
                  Elegí un slide para editarlo y verlo en la vista previa.
                </p>
              )}
            </div>
          </Panel>
        ))}

        {draft.sliders.length < SITE_LIMITS.sliders.max ? (
          <button
            type="button"
            className="btn ghost"
            disabled={disabled}
            onClick={addSlider}
          >
            + Agregar slider ({draft.sliders.length}/{SITE_LIMITS.sliders.max})
          </button>
        ) : null}
      </div>

      <div className="site-editor-side">
        <Panel title="Vista previa">
          <div className="site-slide-tabs" role="group" aria-label="Tema de la vista previa">
            {(['light', 'dark'] as const).map((t) => (
              <button
                key={t}
                type="button"
                className="site-slide-tab"
                aria-pressed={t === theme}
                onClick={() => setTheme(t)}
              >
                {SITE_THEME_LABELS[t]}
              </button>
            ))}
          </div>
          <div className="site-preview" data-theme={theme} data-site-theme={theme}>
            <SiteHeroView
              hero={preview.hero}
              actions={
                <>
                  <span className="mkt-btn-primary">Ver planes</span>
                  <span className="mkt-btn-ghost">Ya soy socio</span>
                </>
              }
            />
            {previewSlide ? (
              <SiteSlideView
                slide={previewSlide}
                button={
                  previewSlide.button ? (
                    <span className="mkt-btn-primary">
                      {previewSlide.button.label || 'Botón'}
                    </span>
                  ) : null
                }
              />
            ) : null}
          </div>
          <p className="muted small">
            Después de la portada siguen los sliders y los planes del gym.
          </p>
        </Panel>

        <Panel title="Publicar">
          {!canWrite ? (
            <p className="muted small">
              Solo lectura: necesitás el permiso de editar la configuración.
            </p>
          ) : null}
          {issues.length > 0 ? (
            <ul className="site-issues">
              {issues.map((issue) => (
                <li key={issue}>{issue}</li>
              ))}
            </ul>
          ) : null}
          {error ? <p className="error">{error}</p> : null}
          <div className="form-actions">
            <button
              type="button"
              className="primary"
              disabled={disabled || issues.length > 0}
              onClick={() => void publish()}
            >
              {busy ? 'Publicando…' : 'Publicar'}
            </button>
            {detail.content ? (
              <button
                type="button"
                className="btn danger"
                disabled={disabled}
                onClick={() => setConfirmReset(true)}
              >
                Volver a la vidriera por defecto
              </button>
            ) : null}
          </div>
          {detail.updatedAt ? (
            <p className="muted small">
              Última publicación:{' '}
              {new Date(detail.updatedAt).toLocaleString('es-AR')}
            </p>
          ) : (
            <p className="muted small">
              Hoy la web muestra la vidriera por defecto (nombre del gym y
              planes).
            </p>
          )}
        </Panel>
      </div>

      <ConfirmDialog
        open={confirmReset}
        title="Volver a la vidriera por defecto"
        description="Se borran la portada, los sliders y sus imágenes. La web vuelve a mostrar el nombre del gym y los planes."
        confirmLabel="Restablecer"
        tone="danger"
        busy={busy}
        onConfirm={() => void reset()}
        onCancel={() => setConfirmReset(false)}
      />
    </div>
  );
}

function SlideForm({
  slide,
  index,
  count,
  packs,
  disabled,
  theme,
  onThemeChange,
  onImageError,
  onChange,
  onMove,
  onRemove,
}: {
  slide: DraftSlide;
  index: number;
  count: number;
  packs: PackSummary[];
  disabled: boolean;
  theme: SiteTheme;
  onThemeChange: (theme: SiteTheme) => void;
  onImageError: (message: string) => void;
  onChange: (fn: (s: DraftSlide) => DraftSlide) => void;
  onMove: (to: number) => void;
  onRemove: () => void;
}) {
  const { button } = slide;

  function setButton(patch: Partial<DraftButton>) {
    onChange((s) => (s.button ? { ...s, button: { ...s.button, ...patch } } : s));
  }

  return (
    <div className="site-slide-form">
      <div className="site-row-actions">
        <button
          type="button"
          className="btn ghost"
          disabled={disabled || index === 0}
          onClick={() => onMove(index - 1)}
        >
          ← Antes
        </button>
        <button
          type="button"
          className="btn ghost"
          disabled={disabled || index === count - 1}
          onClick={() => onMove(index + 1)}
        >
          Después →
        </button>
        <button
          type="button"
          className="btn danger"
          disabled={disabled || count <= SITE_LIMITS.slides.min}
          onClick={onRemove}
        >
          Quitar slide
        </button>
      </div>
      <CountedField
        label="Título"
        value={slide.title}
        min={SITE_LIMITS.slideTitle.min}
        max={SITE_LIMITS.slideTitle.max}
        disabled={disabled}
        onChange={(title) => onChange((s) => ({ ...s, title }))}
      />
      <CountedField
        label="Texto (opcional)"
        value={slide.body}
        max={SITE_LIMITS.slideBody.max}
        multiline
        disabled={disabled}
        onChange={(body) => onChange((s) => ({ ...s, body }))}
      />
      <SiteVisualFields
        value={slide}
        disabled={disabled}
        theme={theme}
        onThemeChange={onThemeChange}
        onImageError={onImageError}
        onChange={(visual) => onChange((s) => ({ ...s, ...visual }))}
      />

      <label className="checkbox-row">
        <input
          type="checkbox"
          checked={button !== null}
          disabled={disabled}
          onChange={(e) =>
            onChange((s) => ({
              ...s,
              button: e.target.checked ? { ...NEW_BUTTON } : null,
            }))
          }
        />
        Con botón
      </label>
      {button ? (
        <>
          <label>
            Lleva a
            <select
              value={button.target}
              disabled={disabled}
              onChange={(e) =>
                setButton({ target: e.target.value as SiteButtonTarget })
              }
            >
              <option value="PLANS">Los planes de la web</option>
              <option value="BOOK">Reservar clases (portal del socio)</option>
              <option value="PACK">Comprar un pack</option>
              <option value="URL">Un link externo</option>
            </select>
          </label>
          <CountedField
            label="Texto del botón"
            value={button.label}
            min={SITE_LIMITS.buttonLabel.min}
            max={SITE_LIMITS.buttonLabel.max}
            disabled={disabled}
            onChange={(label) => setButton({ label })}
          />
          {button.target === 'PACK' ? (
            <label>
              Pack
              <select
                value={button.packId}
                disabled={disabled}
                onChange={(e) => setButton({ packId: e.target.value })}
              >
                <option value="">Elegí un pack</option>
                {packs.map((pack) => (
                  <option key={pack.id} value={pack.id}>
                    {pack.name}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          {button.target === 'URL' ? (
            <label>
              Link (https://…)
              <input
                type="url"
                value={button.url}
                maxLength={SITE_LIMITS.url.max}
                placeholder="https://instagram.com/tugym"
                disabled={disabled}
                onChange={(e) => setButton({ url: e.target.value })}
              />
            </label>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
