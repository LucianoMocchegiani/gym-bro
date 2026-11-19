import type { PrismaService } from '../prisma/prisma.service';
import type { AuditService } from '../audit/audit.service';
import type { UploadService } from '../upload/upload.service';
import type { PutTenantSiteDto } from './dto/tenant-site.dto';
import { TenantSiteService } from './tenant-site.service';
import { SITE_DEFAULT_PRIMARY_COLOR } from './tenant-site.types';

const visualColors = {
  light: { tone: 'DARK', accent: null, overlay: 'MEDIUM' },
  dark: { tone: 'LIGHT', accent: null, overlay: 'MEDIUM' },
} as const;

function setup(savedContent: Record<string, unknown>) {
  const now = new Date();
  const prisma = {
    tenantSite: {
      findUnique: jest.fn().mockResolvedValue({ content: savedContent, updatedAt: now }),
      upsert: jest.fn().mockResolvedValue({ updatedAt: now }),
    },
  } as unknown as PrismaService;
  const audit = { record: jest.fn() } as unknown as AuditService;
  const upload = {} as UploadService;
  return { service: new TenantSiteService(prisma, audit, upload), prisma };
}

function dtoWithoutThemeColor(): PutTenantSiteDto {
  return {
    hero: { ...visualColors, image: null, title: 'Existing gym title', subtitle: null },
    sliders: [],
  } as PutTenantSiteDto;
}

describe('TenantSiteService brand color compatibility', () => {
  it('defaults legacy saved sites to Faciliter green', async () => {
    const legacy = {
      hero: { ...visualColors, image: null, title: 'Existing gym title', subtitle: null },
      sliders: [],
    };
    const { service } = setup(legacy);

    await expect(service.get('tenant-id')).resolves.toMatchObject({
      content: { themeColor: SITE_DEFAULT_PRIMARY_COLOR },
    });
  });

  it('keeps a saved color when an older client omits themeColor', async () => {
    const { service, prisma } = setup({
      themeColor: '#8855cc',
      hero: { ...visualColors, image: null, title: 'Existing gym title', subtitle: null },
      sliders: [],
    });

    await service.put('tenant-id', dtoWithoutThemeColor(), {
      profileType: 'STAFF',
      userId: 'staff-id',
    });

    expect(prisma.tenantSite.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({
          content: expect.objectContaining({ themeColor: '#8855cc' }),
        }),
      }),
    );
  });
});
