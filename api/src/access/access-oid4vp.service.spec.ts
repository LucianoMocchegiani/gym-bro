import { AccessProvider } from '@prisma/client';
import { KuatiaAdminPort } from '../kuatia/kuatia-admin.port';
import { KuatiaEnvService } from '../kuatia/kuatia-env.service';
import { PrismaService } from '../prisma/prisma.service';
import { TenantSettingsService } from '../tenant-settings/tenant-settings.service';
import { AccessOid4VpService } from './access-oid4vp.service';

describe('AccessOid4VpService.createRequest', () => {
  it('lets the holder choose either member or staff credentials', async () => {
    const prisma = {
      pack: { findMany: jest.fn().mockResolvedValue([{ id: 'pack-1' }]) },
    } as unknown as PrismaService;
    const kuatia = {
      createPresentationRequest: jest.fn().mockResolvedValue({
        requestUri: 'openid4vp://request',
        verificationSessionId: 'session-1',
      }),
    } as unknown as KuatiaAdminPort;
    const kuatiaEnv = {
      requireSharedVerifierWalletId: jest.fn().mockReturnValue('verifier-1'),
    } as unknown as KuatiaEnvService;
    const tenantSettings = {
      getAccessProvider: jest.fn().mockResolvedValue(AccessProvider.KUATIA),
    } as unknown as TenantSettingsService;
    const service = new AccessOid4VpService(
      prisma,
      kuatia,
      kuatiaEnv,
      {} as never,
      tenantSettings,
    );

    await service.createRequest('tenant-1');

    expect(kuatia.createPresentationRequest).toHaveBeenCalledWith(
      'verifier-1',
      {
        dcqlQuery: {
          credentials: [
            {
              id: 'member_access',
              format: 'dc+sd-jwt',
              meta: { vct_values: ['urn:faciliter:pack:pack-1'] },
              claims: [
                { path: ['memberId'] },
                { path: ['tenantId'], values: ['tenant-1'] },
              ],
            },
            {
              id: 'staff_access',
              format: 'dc+sd-jwt',
              meta: { vct_values: ['urn:faciliter:staff:tenant-1'] },
              claims: [
                { path: ['staffId'] },
                { path: ['tenantId'], values: ['tenant-1'] },
              ],
            },
          ],
          credential_sets: [
            { options: [['member_access'], ['staff_access']] },
          ],
        },
        responseMode: 'direct_post',
        requestSignerMethod: 'did',
      },
    );
  });
});
