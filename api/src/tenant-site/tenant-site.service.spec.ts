import { BadRequestException } from '@nestjs/common';
import type { AuditService } from '../audit/audit.service';
import type { PrismaService } from '../prisma/prisma.service';
import type { UploadService } from '../upload/upload.service';
import type { PutTenantSiteDto } from './dto/tenant-site.dto';
import { TenantSiteService } from './tenant-site.service';
import { SITE_DEFAULT_PRIMARY_COLOR } from './tenant-site.types';

const visualColors = {
  light: { tone: 'DARK', accent: null, overlay: 'MEDIUM' },
  dark: { tone: 'LIGHT', accent: null, overlay: 'MEDIUM' },
} as const;

function siteContent(extra: Record<string, unknown> = {}) {
  return {
    hero: {
      ...visualColors,
      image: null,
      title: 'Existing gym title',
      subtitle: null,
    },
    sliders: [],
    ...extra,
  };
}

function setup(savedContent: Record<string, unknown> | null, ownsIcon = true) {
  const now = new Date();
  let upsertedContent: unknown;
  const upsert = jest.fn((args: { update: { content: unknown } }) => {
    upsertedContent = args.update.content;
    return Promise.resolve({ updatedAt: now });
  });
  const prisma = {
    tenantSite: {
      findUnique: jest
        .fn()
        .mockResolvedValue(
          savedContent ? { content: savedContent, updatedAt: now } : null,
        ),
      upsert,
    },
  } as unknown as PrismaService;
  const audit = { record: jest.fn() } as unknown as AuditService;
  const upload = {
    isOwnedPublicImage: jest.fn().mockReturnValue(ownsIcon),
    replaceOwnedPublicImage: jest.fn().mockResolvedValue(undefined),
  } as unknown as UploadService;
  return {
    service: new TenantSiteService(prisma, audit, upload),
    upsert,
    getUpsertedContent: () => upsertedContent,
  };
}

function dtoWithoutThemeColor(): PutTenantSiteDto {
  return {
    hero: {
      ...visualColors,
      image: null,
      title: 'Existing gym title',
      subtitle: null,
    },
    sliders: [],
  };
}

describe('TenantSiteService brand configuration compatibility', () => {
  it('defaults legacy saved sites to Faciliter green', async () => {
    const { service } = setup(siteContent());

    await expect(service.get('tenant-id')).resolves.toMatchObject({
      content: { themeColor: SITE_DEFAULT_PRIMARY_COLOR },
    });
  });

  it('keeps saved brand settings when an older client omits them', async () => {
    const brandIcon = 'https://storage.test/tenants/tenant-id/site/icon.png';
    const { service, upsert, getUpsertedContent } = setup(
      siteContent({ themeColor: '#8855cc', brandIcon }),
    );

    await service.put('tenant-id', dtoWithoutThemeColor(), {
      profileType: 'STAFF',
      userId: 'staff-id',
    });

    expect(upsert).toHaveBeenCalled();
    expect(getUpsertedContent()).toEqual(
      expect.objectContaining({ themeColor: '#8855cc', brandIcon }),
    );
  });

  it('preserves contact email when a client omits it', async () => {
    const contactEmail = 'hola@example.com';
    const { service, getUpsertedContent } = setup(siteContent({ contactEmail }));

    await service.put('tenant-id', dtoWithoutThemeColor(), {
      profileType: 'STAFF',
      userId: 'staff-id',
    });

    expect(getUpsertedContent()).toEqual(
      expect.objectContaining({ contactEmail }),
    );
  });

  it('saves and trims an explicitly configured contact email', async () => {
    const { service, getUpsertedContent } = setup(null);

    await service.put(
      'tenant-id',
      { ...dtoWithoutThemeColor(), contactEmail: '  hola@example.com  ' },
      { profileType: 'STAFF', userId: 'staff-id' },
    );

    expect(getUpsertedContent()).toEqual(
      expect.objectContaining({ contactEmail: 'hola@example.com' }),
    );
  });

  it('preserves social links when an older client omits them', async () => {
    const socialLinks = {
      facebook: 'https://facebook.com/example',
      x: null,
      tiktok: null,
      instagram: null,
      whatsapp: null,
    };
    const { service, getUpsertedContent } = setup(siteContent({ socialLinks }));

    await service.put('tenant-id', dtoWithoutThemeColor(), {
      profileType: 'STAFF',
      userId: 'staff-id',
    });

    expect(getUpsertedContent()).toEqual(
      expect.objectContaining({ socialLinks }),
    );
  });

  it('keeps the default landing when saving only social links', async () => {
    const { service, getUpsertedContent } = setup(null);

    await service.put(
      'tenant-id',
      {
        ...dtoWithoutThemeColor(),
        socialLinks: { instagram: 'https://instagram.com/example' },
      },
      { profileType: 'STAFF', userId: 'staff-id' },
    );

    expect(getUpsertedContent()).toEqual(
      expect.objectContaining({ landingCustomized: false }),
    );
  });

  it('rejects social links outside their corresponding network', async () => {
    const { service } = setup(siteContent());

    await expect(
      service.put(
        'tenant-id',
        {
          ...dtoWithoutThemeColor(),
          socialLinks: { facebook: 'https://evil.example' },
        },
        { profileType: 'STAFF', userId: 'staff-id' },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects an icon not uploaded by this tenant', async () => {
    const { service } = setup(siteContent(), false);

    await expect(
      service.put(
        'tenant-id',
        {
          ...dtoWithoutThemeColor(),
          brandIcon: 'https://other.example/icon.png',
        },
        { profileType: 'STAFF', userId: 'staff-id' },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
