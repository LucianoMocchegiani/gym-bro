/** Límites del contenido editable de la web del gym (RN-CTA-010). */
export const SITE_LIMITS = {
  heroTitle: { min: 10, max: 80 },
  heroSubtitle: { max: 200 },
  sliders: { max: 5 },
  sliderTitle: { max: 60 },
  slides: { min: 1, max: 10 },
  slideTitle: { min: 3, max: 60 },
  slideBody: { max: 180 },
  buttonLabel: { min: 2, max: 24 },
  imageAlt: { max: 120 },
  url: { max: 500 },
  id: { max: 40 },
} as const;
