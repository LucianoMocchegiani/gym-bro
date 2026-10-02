import {
  BRAND_IMAGE_ALT,
  BRAND_IMAGE_SIZE,
  renderBrandImage,
} from '@/lib/brand-image';

export const alt = BRAND_IMAGE_ALT;
export const size = BRAND_IMAGE_SIZE;
export const contentType = 'image/png';

export default function OpenGraphImage() {
  return renderBrandImage();
}
