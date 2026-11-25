import { ForbiddenException } from '@nestjs/common';
import { PlatformModuleGuard } from './platform-module.guard';

describe('PlatformModuleGuard', () => {
  const reflector = { getAllAndOverride: jest.fn() };
  const plans = { getTenantModules: jest.fn() };
  const guard = new PlatformModuleGuard(reflector as never, plans as never);
  const user = { tenantId: 'tenant-1' };
  const context = {
    getHandler: jest.fn(),
    getClass: jest.fn(),
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  } as never;

  beforeEach(() => jest.clearAllMocks());

  it('allows routes without a required module', async () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(plans.getTenantModules).not.toHaveBeenCalled();
  });

  it('allows a tenant whose plan includes the required module', async () => {
    reflector.getAllAndOverride.mockReturnValue('club');
    plans.getTenantModules.mockResolvedValue(['club']);

    await expect(guard.canActivate(context)).resolves.toBe(true);
  });

  it('denies a tenant whose plan does not include the required module', async () => {
    reflector.getAllAndOverride.mockReturnValue('club');
    plans.getTenantModules.mockResolvedValue(['ecommerce']);

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });
});
