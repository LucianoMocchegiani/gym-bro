import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  Length,
  Matches,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { SITE_LIMITS } from '../tenant-site.constants';
import {
  SITE_BUTTON_TARGETS,
  SITE_FOCUS_X,
  SITE_FOCUS_Y,
  SITE_OVERLAYS,
  SITE_TONES,
  type SiteButtonTarget,
  type SiteFocusX,
  type SiteFocusY,
  type SiteOverlay,
  type SiteTone,
} from '../tenant-site.types';

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

export class SiteImageDto {
  /** URL pública del R2 del tenant (la valida el servicio). */
  @IsString()
  @MaxLength(SITE_LIMITS.url.max)
  url!: string;

  @IsOptional()
  @IsString()
  @MaxLength(SITE_LIMITS.imageAlt.max)
  alt?: string | null;

  @IsIn(SITE_FOCUS_X)
  focusX!: SiteFocusX;

  @IsIn(SITE_FOCUS_Y)
  focusY!: SiteFocusY;
}

/** Fondo y colores comunes a hero y slide. */
class SiteVisualDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => SiteImageDto)
  image?: SiteImageDto | null;

  @IsIn(SITE_TONES)
  tone!: SiteTone;

  @IsOptional()
  @Matches(HEX_COLOR, { message: 'accent must be #rrggbb' })
  accent?: string | null;

  @IsIn(SITE_OVERLAYS)
  overlay!: SiteOverlay;
}

export class SiteButtonDto {
  @IsString()
  @Length(SITE_LIMITS.buttonLabel.min, SITE_LIMITS.buttonLabel.max)
  label!: string;

  @IsIn(SITE_BUTTON_TARGETS)
  target!: SiteButtonTarget;

  @IsOptional()
  @IsUUID()
  packId?: string | null;

  @IsOptional()
  @IsUrl({ protocols: ['https'], require_protocol: true })
  @MaxLength(SITE_LIMITS.url.max)
  url?: string | null;
}

export class SiteHeroDto extends SiteVisualDto {
  @IsString()
  @Length(SITE_LIMITS.heroTitle.min, SITE_LIMITS.heroTitle.max)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(SITE_LIMITS.heroSubtitle.max)
  subtitle?: string | null;
}

export class SiteSlideDto extends SiteVisualDto {
  @IsString()
  @Length(1, SITE_LIMITS.id.max)
  id!: string;

  @IsString()
  @Length(SITE_LIMITS.slideTitle.min, SITE_LIMITS.slideTitle.max)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(SITE_LIMITS.slideBody.max)
  body?: string | null;

  @IsOptional()
  @ValidateNested()
  @Type(() => SiteButtonDto)
  button?: SiteButtonDto | null;
}

export class SiteSliderDto {
  @IsString()
  @Length(1, SITE_LIMITS.id.max)
  id!: string;

  @IsOptional()
  @IsString()
  @MaxLength(SITE_LIMITS.sliderTitle.max)
  title?: string | null;

  @IsArray()
  @ArrayMinSize(SITE_LIMITS.slides.min)
  @ArrayMaxSize(SITE_LIMITS.slides.max)
  @ValidateNested({ each: true })
  @Type(() => SiteSlideDto)
  slides!: SiteSlideDto[];
}

/**
 * `PUT /tenant-site`: reemplaza todo el contenido (guardar = publicar).
 *
 * @remarks Aquí solo forma y largos; contraste, imágenes del tenant y destinos
 * de botón los valida {@link TenantSiteService}.
 */
export class PutTenantSiteDto {
  @ValidateNested()
  @Type(() => SiteHeroDto)
  hero!: SiteHeroDto;

  @IsArray()
  @ArrayMaxSize(SITE_LIMITS.sliders.max)
  @ValidateNested({ each: true })
  @Type(() => SiteSliderDto)
  sliders!: SiteSliderDto[];
}
