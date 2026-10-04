import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AUDIT_ACTIONS, AuditActor } from '../audit/audit.types';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { UploadService } from '../upload/upload.service';
import type {
  PutTenantSiteDto,
  SiteButtonDto,
  SiteImageDto,
  SiteThemeColorsDto,
} from './dto/tenant-site.dto';
import { siteContrastIssue } from './site-contrast';
import { SITE_LIMITS } from './tenant-site.constants';
import type {
  SiteButton,
  SiteImage,
  SiteThemeColors,
  SiteVisual,
  TenantSiteContent,
  TenantSiteDetail,
} from './tenant-site.types';

/** Carpeta de `POST /upload` para las imágenes de la web. */
export const SITE_IMAGE_FOLDER = 'site';

function clean(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

/** Formato guardado antes de los colores por tema: un solo juego. */
type StoredVisual = Partial<SiteVisual> & Partial<SiteThemeColors>;

function upgradeVisual<T extends StoredVisual>(v: T): T & SiteVisual {
  if (v.light && v.dark) {
    return v as T & SiteVisual;
  }
  const colors: SiteThemeColors = {
    tone: v.tone ?? 'LIGHT',
    accent: v.accent ?? null,
    overlay: v.overlay ?? 'MEDIUM',
  };
  const upgraded: StoredVisual = {
    ...v,
    image: v.image ?? null,
    light: colors,
    dark: { ...colors },
  };
  delete upgraded.tone;
  delete upgraded.accent;
  delete upgraded.overlay;
  return upgraded as T & SiteVisual;
}

/** Contenido de `tenant_sites.content`, llevado al formato actual. */
function fromStored(raw: Prisma.JsonValue): TenantSiteContent {
  const content = raw as unknown as TenantSiteContent;
  return {
    hero: upgradeVisual(content.hero),
    sliders: content.sliders.map((slider) => ({
      ...slider,
      slides: slider.slides.map((slide) => upgradeVisual(slide)),
    })),
  };
}

function imageUrls(content: TenantSiteContent | null): Set<string> {
  const urls = new Set<string>();
  if (!content) {
    return urls;
  }
  if (content.hero.image) {
    urls.add(content.hero.image.url);
  }
  for (const slider of content.sliders) {
    for (const slide of slider.slides) {
      if (slide.image) {
        urls.add(slide.image.url);
      }
    }
  }
  return urls;
}

/**
 * Web pública del gym editable: hero y sliders (RN-CTA-010, CU-CTA-010).
 *
 * @remarks Guardar publica al instante. El tenant sale del JWT. Las imágenes
 * tienen que ser del R2 del tenant (`POST /upload` carpeta `site`); las que
 * dejan de usarse se borran de R2.
 */
@Injectable()
export class TenantSiteService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly upload: UploadService,
  ) {}

  /** Contenido actual (null si el gym no configuró nada). */
  async get(tenantId: string): Promise<TenantSiteDetail> {
    const row = await this.prisma.tenantSite.findUnique({
      where: { tenantId },
    });
    return {
      content: row ? fromStored(row.content) : null,
      updatedAt: row?.updatedAt ?? null,
    };
  }

  /** Solo el contenido, para la web pública (sin auth). */
  async getPublicContent(tenantId: string): Promise<TenantSiteContent | null> {
    return (await this.get(tenantId)).content;
  }

  /**
   * Reemplaza el contenido y lo publica.
   *
   * @throws {BadRequestException} Texto vacío, título ilegible, imagen ajena
   * o botón con destino inválido.
   */
  async put(
    tenantId: string,
    dto: PutTenantSiteDto,
    actor: AuditActor,
  ): Promise<TenantSiteDetail> {
    const content = await this.normalize(tenantId, dto);
    const before = await this.get(tenantId);
    const json = content as unknown as Prisma.InputJsonValue;
    const row = await this.prisma.tenantSite.upsert({
      where: { tenantId },
      create: { tenantId, content: json, updatedByStaffId: actor.userId },
      update: { content: json, updatedByStaffId: actor.userId },
    });
    await this.deleteUnusedImages(tenantId, before.content, content);
    await this.audit.record({
      tenantId,
      actor,
      action: AUDIT_ACTIONS.tenantSiteUpdate,
      entityType: 'tenant_site',
      entityId: tenantId,
      before: this.auditSnapshot(before.content),
      after: this.auditSnapshot(content),
    });
    return { content, updatedAt: row.updatedAt };
  }

  /** Vuelve a la vidriera por defecto y borra las imágenes de la web. */
  async reset(tenantId: string, actor: AuditActor): Promise<TenantSiteDetail> {
    const before = await this.get(tenantId);
    if (!before.content) {
      return before;
    }
    await this.prisma.tenantSite.delete({ where: { tenantId } });
    await this.deleteUnusedImages(tenantId, before.content, null);
    await this.audit.record({
      tenantId,
      actor,
      action: AUDIT_ACTIONS.tenantSiteReset,
      entityType: 'tenant_site',
      entityId: tenantId,
      before: this.auditSnapshot(before.content),
      after: null,
    });
    return { content: null, updatedAt: null };
  }

  private async normalize(
    tenantId: string,
    dto: PutTenantSiteDto,
  ): Promise<TenantSiteContent> {
    const heroTitle = this.requireText(
      dto.hero.title,
      SITE_LIMITS.heroTitle.min,
      'El título principal',
    );
    const hero = {
      ...this.visual(tenantId, dto.hero, 'Portada'),
      title: heroTitle,
      subtitle: clean(dto.hero.subtitle),
    };

    const sliderIds = new Set<string>();
    const slideIds = new Set<string>();
    const sliders = dto.sliders.map((slider, si) => {
      this.assertUniqueId(sliderIds, slider.id);
      return {
        id: slider.id,
        title: clean(slider.title),
        slides: slider.slides.map((slide, i) => {
          this.assertUniqueId(slideIds, slide.id);
          const where = `Slider ${si + 1}, slide ${i + 1}`;
          return {
            ...this.visual(tenantId, slide, where),
            id: slide.id,
            title: this.requireText(
              slide.title,
              SITE_LIMITS.slideTitle.min,
              `${where}: el título`,
            ),
            body: clean(slide.body),
            button: slide.button ? this.button(slide.button, where) : null,
          };
        }),
      };
    });

    await this.assertPacksExist(tenantId, sliders);
    return { hero, sliders };
  }

  private visual(
    tenantId: string,
    dto: {
      image?: SiteImageDto | null;
      light: SiteThemeColorsDto;
      dark: SiteThemeColorsDto;
    },
    where: string,
  ): SiteVisual {
    const image = dto.image ? this.image(tenantId, dto.image, where) : null;
    return {
      image,
      light: this.themeColors(
        dto.light,
        image !== null,
        `${where} (tema claro)`,
      ),
      dark: this.themeColors(
        dto.dark,
        image !== null,
        `${where} (tema oscuro)`,
      ),
    };
  }

  /** El título tiene que leerse en cada tema (RN-CTA-010). */
  private themeColors(
    dto: SiteThemeColorsDto,
    hasImage: boolean,
    where: string,
  ): SiteThemeColors {
    const colors: SiteThemeColors = {
      tone: dto.tone,
      accent: dto.accent ? dto.accent.toLowerCase() : null,
      overlay: dto.overlay,
    };
    const issue = siteContrastIssue(colors, hasImage);
    if (issue) {
      throw new BadRequestException(`${where}: ${issue}`);
    }
    return colors;
  }

  private image(tenantId: string, dto: SiteImageDto, where: string): SiteImage {
    const url = dto.url.trim();
    if (!this.upload.isOwnedPublicImage(tenantId, url, SITE_IMAGE_FOLDER)) {
      throw new BadRequestException(
        `${where}: la imagen tiene que subirse desde el panel`,
      );
    }
    return {
      url,
      alt: clean(dto.alt),
      focusX: dto.focusX,
      focusY: dto.focusY,
    };
  }

  private button(dto: SiteButtonDto, where: string): SiteButton {
    const label = this.requireText(
      dto.label,
      SITE_LIMITS.buttonLabel.min,
      `${where}: el texto del botón`,
    );
    if (dto.target === 'PACK' && !dto.packId) {
      throw new BadRequestException(`${where}: elegí el pack del botón`);
    }
    if (dto.target === 'URL' && !dto.url) {
      throw new BadRequestException(`${where}: falta el link del botón`);
    }
    return {
      label,
      target: dto.target,
      packId: dto.target === 'PACK' ? (dto.packId ?? null) : null,
      url: dto.target === 'URL' ? (dto.url?.trim() ?? null) : null,
    };
  }

  private requireText(value: string, min: number, label: string): string {
    const text = value.trim();
    if (text.length < min) {
      throw new BadRequestException(
        `${label} necesita al menos ${min} caracteres`,
      );
    }
    return text;
  }

  private assertUniqueId(seen: Set<string>, id: string): void {
    if (seen.has(id)) {
      throw new BadRequestException(`Id repetido en la web: ${id}`);
    }
    seen.add(id);
  }

  /** Los botones «Comprar» apuntan a packs del tenant (activos al guardar). */
  private async assertPacksExist(
    tenantId: string,
    sliders: TenantSiteContent['sliders'],
  ): Promise<void> {
    const ids = [
      ...new Set(
        sliders.flatMap((s) =>
          s.slides.flatMap((slide) =>
            slide.button?.packId ? [slide.button.packId] : [],
          ),
        ),
      ),
    ];
    if (ids.length === 0) {
      return;
    }
    const found = await this.prisma.pack.count({
      where: { tenantId, id: { in: ids }, active: true, originServiceId: null },
    });
    if (found !== ids.length) {
      throw new BadRequestException(
        'Un botón apunta a un pack que no existe o no está activo',
      );
    }
  }

  private async deleteUnusedImages(
    tenantId: string,
    before: TenantSiteContent | null,
    after: TenantSiteContent | null,
  ): Promise<void> {
    const keep = imageUrls(after);
    for (const url of imageUrls(before)) {
      if (!keep.has(url)) {
        await this.upload.replaceOwnedPublicImage(tenantId, url, null);
      }
    }
  }

  /** Auditoría liviana: textos y cantidades, sin URLs. */
  private auditSnapshot(
    content: TenantSiteContent | null,
  ): Prisma.InputJsonValue | null {
    if (!content) {
      return null;
    }
    return {
      heroTitle: content.hero.title,
      sliders: content.sliders.map((s) => ({
        title: s.title,
        slides: s.slides.map((slide) => slide.title),
      })),
      images: imageUrls(content).size,
    };
  }
}
