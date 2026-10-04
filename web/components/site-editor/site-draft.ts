import {
  SITE_LIMITS,
  type SiteButtonTarget,
  type SiteFocusX,
  type SiteFocusY,
  type SiteImage,
  type SiteTheme,
  type SiteThemeColors,
  type SiteVisual,
  type TenantSiteContent,
} from '@/lib/api/tenant-site';
import { siteContrastIssue } from '@/lib/site-contrast';

/**
 * Borrador del editor «Web del gym»: textos como string (inputs) e imágenes
 * que pueden estar sin subir (`file`) hasta publicar.
 */
export type DraftImage = {
  /** URL ya publicada en R2; null si todavía es solo `file`. */
  url: string | null;
  file: File | null;
  /** Object URL del archivo elegido, para la vista previa. */
  previewUrl: string | null;
  alt: string;
  focusX: SiteFocusX;
  focusY: SiteFocusY;
};

export type DraftVisual = {
  image: DraftImage | null;
  light: SiteThemeColors;
  dark: SiteThemeColors;
};

export const SITE_THEME_LABELS: Record<SiteTheme, string> = {
  light: 'Tema claro',
  dark: 'Tema oscuro',
};

export type DraftButton = {
  label: string;
  target: SiteButtonTarget;
  packId: string;
  url: string;
};

export type DraftHero = DraftVisual & { title: string; subtitle: string };

export type DraftSlide = DraftVisual & {
  id: string;
  title: string;
  body: string;
  button: DraftButton | null;
};

export type DraftSlider = { id: string; title: string; slides: DraftSlide[] };

export type SiteDraft = { hero: DraftHero; sliders: DraftSlider[] };

/** Cada tema arranca con el texto que pega con su página. */
const DEFAULT_VISUAL: DraftVisual = {
  image: null,
  light: { tone: 'DARK', accent: null, overlay: 'MEDIUM' },
  dark: { tone: 'LIGHT', accent: null, overlay: 'MEDIUM' },
};

export function newId(): string {
  return crypto.randomUUID();
}

export function newSlide(): DraftSlide {
  return { ...DEFAULT_VISUAL, id: newId(), title: '', body: '', button: null };
}

export function newSlider(): DraftSlider {
  return { id: newId(), title: '', slides: [newSlide()] };
}

function imageFromContent(image: SiteImage | null): DraftImage | null {
  return image
    ? {
        url: image.url,
        file: null,
        previewUrl: null,
        alt: image.alt ?? '',
        focusX: image.focusX,
        focusY: image.focusY,
      }
    : null;
}

function visualFromContent(v: SiteVisual): DraftVisual {
  return {
    image: imageFromContent(v.image),
    light: { ...v.light },
    dark: { ...v.dark },
  };
}

/** Borrador inicial: lo publicado o una portada base para empezar. */
export function draftFromContent(content: TenantSiteContent | null): SiteDraft {
  if (!content) {
    return {
      hero: {
        ...DEFAULT_VISUAL,
        title: 'Entrená a tu ritmo con nosotros',
        subtitle: '',
      },
      sliders: [],
    };
  }
  return {
    hero: {
      ...visualFromContent(content.hero),
      title: content.hero.title,
      subtitle: content.hero.subtitle ?? '',
    },
    sliders: content.sliders.map((slider) => ({
      id: slider.id,
      title: slider.title ?? '',
      slides: slider.slides.map((slide) => ({
        ...visualFromContent(slide),
        id: slide.id,
        title: slide.title,
        body: slide.body ?? '',
        button: slide.button
          ? {
              label: slide.button.label,
              target: slide.button.target,
              packId: slide.button.packId ?? '',
              url: slide.button.url ?? '',
            }
          : null,
      })),
    })),
  };
}

function orNull(text: string): string | null {
  const trimmed = text.trim();
  return trimmed ? trimmed : null;
}

/**
 * Contenido listo para dibujar o publicar.
 *
 * @param resolveUrl - URL de cada imagen: la de R2 al publicar, la previa en
 * la vista previa. Si devuelve null, la imagen se omite.
 */
export function draftToContent(
  draft: SiteDraft,
  resolveUrl: (image: DraftImage) => string | null,
): TenantSiteContent {
  const visual = (v: DraftVisual): SiteVisual => {
    const url = v.image ? resolveUrl(v.image) : null;
    return {
      image:
        v.image && url
          ? {
              url,
              alt: orNull(v.image.alt),
              focusX: v.image.focusX,
              focusY: v.image.focusY,
            }
          : null,
      light: v.light,
      dark: v.dark,
    };
  };
  return {
    hero: {
      ...visual(draft.hero),
      title: draft.hero.title.trim(),
      subtitle: orNull(draft.hero.subtitle),
    },
    sliders: draft.sliders.map((slider) => ({
      id: slider.id,
      title: orNull(slider.title),
      slides: slider.slides.map((slide) => ({
        ...visual(slide),
        id: slide.id,
        title: slide.title.trim(),
        body: orNull(slide.body),
        button: slide.button
          ? {
              label: slide.button.label.trim(),
              target: slide.button.target,
              packId:
                slide.button.target === 'PACK' ? slide.button.packId : null,
              url:
                slide.button.target === 'URL' ? slide.button.url.trim() : null,
            }
          : null,
      })),
    })),
  };
}

/** Aplica `fn` a cada imagen del borrador (portada y slides). */
export function mapDraftImages(
  draft: SiteDraft,
  fn: (image: DraftImage) => DraftImage,
): SiteDraft {
  const visual = <T extends DraftVisual>(v: T): T =>
    v.image ? { ...v, image: fn(v.image) } : v;
  return {
    hero: visual(draft.hero),
    sliders: draft.sliders.map((slider) => ({
      ...slider,
      slides: slider.slides.map(visual),
    })),
  };
}

/** Imágenes elegidas que todavía no se subieron a R2. */
export function pendingImages(draft: SiteDraft): DraftImage[] {
  const pending: DraftImage[] = [];
  mapDraftImages(draft, (image) => {
    if (image.file && !image.url) {
      pending.push(image);
    }
    return image;
  });
  return pending;
}

/** Imagen a mostrar en la vista previa (archivo recién elegido o la de R2). */
export function previewUrl(image: DraftImage): string | null {
  return image.previewUrl ?? image.url;
}

/** Problema de contraste de un fondo en un tema (null = se lee bien). */
export function draftContrastIssue(
  v: DraftVisual,
  theme: SiteTheme,
): string | null {
  return siteContrastIssue(v[theme], v.image !== null);
}

function pushContrastIssues(
  issues: string[],
  v: DraftVisual,
  where: string,
): void {
  for (const theme of ['light', 'dark'] as const) {
    const issue = draftContrastIssue(v, theme);
    if (issue) {
      issues.push(`${where} (${SITE_THEME_LABELS[theme].toLowerCase()}): ${issue}`);
    }
  }
}

/**
 * Lo mismo que rechaza la API, para avisar antes de publicar.
 *
 * @returns Mensajes con ubicación («Slider 1, slide 2: …»); vacío = ok.
 */
export function draftIssues(draft: SiteDraft): string[] {
  const issues: string[] = [];
  const L = SITE_LIMITS;
  if (draft.hero.title.trim().length < L.heroTitle.min) {
    issues.push(
      `Portada: el título necesita al menos ${L.heroTitle.min} caracteres`,
    );
  }
  pushContrastIssues(issues, draft.hero, 'Portada');
  draft.sliders.forEach((slider, si) => {
    slider.slides.forEach((slide, i) => {
      const where = `Slider ${si + 1}, slide ${i + 1}`;
      if (slide.title.trim().length < L.slideTitle.min) {
        issues.push(
          `${where}: el título necesita al menos ${L.slideTitle.min} caracteres`,
        );
      }
      pushContrastIssues(issues, slide, where);
      const button = slide.button;
      if (!button) {
        return;
      }
      if (button.label.trim().length < L.buttonLabel.min) {
        issues.push(`${where}: falta el texto del botón`);
      }
      if (button.target === 'PACK' && !button.packId) {
        issues.push(`${where}: elegí el pack del botón`);
      }
      if (button.target === 'URL' && !/^https:\/\/\S+\.\S+/.test(button.url.trim())) {
        issues.push(`${where}: el link tiene que empezar con https://`);
      }
    });
  });
  return issues;
}
