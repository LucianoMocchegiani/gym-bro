import { ForbiddenException } from '@nestjs/common';
import { IdentityPlanCancellationService } from './identity-plan-cancellation.service';
import { TenantPlanActionsController } from './tenant-plan-actions.controller';

const plans = {
  cancelAutomaticDebitForStaff: jest.fn(),
  finalizePlanForStaff: jest.fn(),
};

describe('TenantPlanActionsController', () => {
  let controller: TenantPlanActionsController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new TenantPlanActionsController(
      plans as unknown as IdentityPlanCancellationService,
    );
  });

  it('does not allow billing actions during impersonation', () => {
    const user = {
      userId: 'staff-1',
      email: 'staff@example.test',
      profileType: 'STAFF' as const,
      impersonatedBy: 'platform-staff-1',
    };

    expect(() => controller.finalizePlan('tenant-1', user)).toThrow(
      ForbiddenException,
    );
    expect(plans.finalizePlanForStaff).not.toHaveBeenCalled();
  });

  it('passes tenant and staff ids to the cancellation service', () => {
    const user = {
      userId: 'staff-1',
      email: 'staff@example.test',
      profileType: 'STAFF' as const,
    };

    controller.cancelAutomaticDebit('tenant-1', user);

    expect(plans.cancelAutomaticDebitForStaff).toHaveBeenCalledWith(
      'staff-1',
      'tenant-1',
    );
  });
});
