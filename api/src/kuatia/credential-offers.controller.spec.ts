import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { AccessProvider } from '@prisma/client';
import type { AuthUser } from '../auth/auth.types';
import type { TenantSettingsService } from '../tenant-settings/tenant-settings.service';
import { CredentialOffersController } from './credential-offers.controller';
import type {
  CredentialOfferListItem,
  KuatiaOfferService,
} from './kuatia-offer.service';
import type {
  KuatiaStaffOfferService,
  StaffCredentialOfferListItem,
} from './kuatia-staff-offer.service';

describe('CredentialOffersController.issueMine', () => {
  let controller: CredentialOffersController;
  let ensureOfferForCurrentContract: jest.Mock;
  let getAccessProvider: jest.Mock;

  beforeEach(() => {
    ensureOfferForCurrentContract = jest.fn();
    getAccessProvider = jest.fn().mockResolvedValue(AccessProvider.KUATIA);
    controller = new CredentialOffersController(
      { ensureOfferForCurrentContract } as unknown as KuatiaOfferService,
      {} as unknown as KuatiaStaffOfferService,
      { getAccessProvider } as unknown as TenantSettingsService,
    );
  });

  it('only allows the authenticated member and derives their id from auth', async () => {
    const offer = { id: 'offer-1' } as CredentialOfferListItem;
    ensureOfferForCurrentContract.mockResolvedValue(offer);

    await expect(
      controller.issueMine('tenant-1', {
        userId: 'member-1',
        profileType: 'MEMBER',
      } as AuthUser),
    ).resolves.toBe(offer);

    expect(getAccessProvider).toHaveBeenCalledWith('tenant-1');
    expect(ensureOfferForCurrentContract).toHaveBeenCalledWith(
      'tenant-1',
      'member-1',
    );
  });

  it('rejects non-member identities', async () => {
    await expect(
      controller.issueMine('tenant-1', {
        userId: 'staff-1',
        profileType: 'STAFF',
      } as AuthUser),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(ensureOfferForCurrentContract).not.toHaveBeenCalled();
    expect(getAccessProvider).not.toHaveBeenCalled();
  });

  it('rejects gyms that do not use Kuatia', async () => {
    getAccessProvider.mockResolvedValue(AccessProvider.ZKTECO);

    await expect(
      controller.issueMine('tenant-1', {
        userId: 'member-1',
        profileType: 'MEMBER',
      } as AuthUser),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(ensureOfferForCurrentContract).not.toHaveBeenCalled();
  });

  it('propagates the no-current-contract error', async () => {
    ensureOfferForCurrentContract.mockRejectedValue(
      new BadRequestException('No hay contrato vigente para emitir credencial'),
    );

    await expect(
      controller.issueMine('tenant-1', {
        userId: 'member-1',
        profileType: 'MEMBER',
      } as AuthUser),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});

describe('CredentialOffersController.issueMyStaffOffer', () => {
  let controller: CredentialOffersController;
  let ensureOfferForStaff: jest.Mock;
  let getAccessProvider: jest.Mock;

  beforeEach(() => {
    ensureOfferForStaff = jest.fn();
    getAccessProvider = jest.fn().mockResolvedValue(AccessProvider.KUATIA);
    controller = new CredentialOffersController(
      {} as unknown as KuatiaOfferService,
      { ensureOfferForStaff } as unknown as KuatiaStaffOfferService,
      { getAccessProvider } as unknown as TenantSettingsService,
    );
  });

  it('only allows the authenticated staff identity and derives its id from auth', async () => {
    const offer = { id: 'offer-1' } as StaffCredentialOfferListItem;
    ensureOfferForStaff.mockResolvedValue(offer);

    await expect(
      controller.issueMyStaffOffer('tenant-1', {
        userId: 'staff-1',
        profileType: 'STAFF',
      } as AuthUser),
    ).resolves.toBe(offer);

    expect(getAccessProvider).toHaveBeenCalledWith('tenant-1');
    expect(ensureOfferForStaff).toHaveBeenCalledWith('tenant-1', 'staff-1', {
      force: true,
    });
  });

  it('rejects non-staff identities', async () => {
    await expect(
      controller.issueMyStaffOffer('tenant-1', {
        userId: 'member-1',
        profileType: 'MEMBER',
      } as AuthUser),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(ensureOfferForStaff).not.toHaveBeenCalled();
    expect(getAccessProvider).not.toHaveBeenCalled();
  });

  it('rejects gyms that do not use Kuatia', async () => {
    getAccessProvider.mockResolvedValue(AccessProvider.ZKTECO);

    await expect(
      controller.issueMyStaffOffer('tenant-1', {
        userId: 'staff-1',
        profileType: 'STAFF',
      } as AuthUser),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(ensureOfferForStaff).not.toHaveBeenCalled();
  });
});
