import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { MemberSignupService } from './member-signup.service';

describe('MemberSignupService', () => {
  it('does not start a public Club signup for ecommerce-only tenants', async () => {
    const createSignupPreference = jest.fn();
    const service = new MemberSignupService(
      {} as never,
      { assertCanSelfJoin: jest.fn().mockResolvedValue({ tenantId: 'shop', email: 'buyer@example.test' }) } as never,
      { createSignupPreference } as never,
      {} as never,
      { getTenantModules: jest.fn().mockResolvedValue(['ecommerce']) } as never,
    );

    await expect(service.start('identity-1', {
      tenantSlug: 'shop',
      document: '123',
      packId: 'pack-1',
      name: 'Buyer',
    } as never)).rejects.toBeInstanceOf(NotFoundException);
    expect(createSignupPreference).not.toHaveBeenCalled();
  });
});
