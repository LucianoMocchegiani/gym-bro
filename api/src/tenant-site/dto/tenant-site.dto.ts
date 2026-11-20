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

export class SiteThemeColorsDto {
  @IsIn(SITE_TONES)
  tone!: SiteTone;

  @IsOptional()
  @Matches(HEX_COLOR, { message: 'accent must be #rrggbb' })
  accent?: string | null;

  @IsIn(SITE_OVERLAYS)
  overlay!: SiteOverlay;
}

class SiteVisualDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => SiteImageDto)
  image?: SiteImageDto | null;

  @ValidateNested()
  @Type(() => SiteThemeColorsDto)
  light!: SiteThemeColorsDto;

  @ValidateNested()
  @Type(() => SiteThemeColorsDto)
  dark!: SiteThemeColorsDto;
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

/** El servicio limita cada enlace al dominio de la red correspondiente. */
export class SiteSocialLinksDto {
  @IsOptional()
  @IsUrl({ protocols: ['https'], require_protocol: true })
  @MaxLength(SITE_LIMITS.url.max)
  facebook?: string | null;

  @IsOptional()
  @IsUrl({ protocols: ['https'], require_protocol: true })
  @MaxLength(SITE_LIMITS.url.max)
  x?: string | null;

  @IsOptional()
  @IsUrl({ protocols: ['https'], require_protocol: true })
  @MaxLength(SITE_LIMITS.url.max)
  tiktok?: string | null;

  @IsOptional()
  @IsUrl({ protocols: ['https'], require_protocol: true })
  @MaxLength(SITE_LIMITS.url.max)
  instagram?: string | null;

  @IsOptional()
  @IsUrl({ protocols: ['https'], require_protocol: true })
  @MaxLength(SITE_LIMITS.url.max)
  whatsapp?: string | null;
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

export class PutTenantSiteDto {
  @IsOptional()
  @IsString()
  @Matches(HEX_COLOR, { message: 'themeColor must be #rrggbb' })
  themeColor?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(SITE_LIMITS.url.max)
  brandIcon?: string | null;

  /** Si se omite, conserva las redes ya configuradas. */
  @IsOptional()
  @ValidateNested()
  @Type(() => SiteSocialLinksDto)
  socialLinks?: SiteSocialLinksDto;

  @ValidateNested()
  @Type(() => SiteHeroDto)
  hero!: SiteHeroDto;

  @IsArray()
  @ArrayMaxSize(SITE_LIMITS.sliders.max)
  @ValidateNested({ each: true })
  @Type(() => SiteSliderDto)
  sliders!: SiteSliderDto[];
}
