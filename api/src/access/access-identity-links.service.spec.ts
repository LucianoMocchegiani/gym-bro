import { NotFoundException } from '@nestjs/common';
import type { PrismaService } from '../prisma/prisma.service';
import { AccessIdentityLinksService } from './access-identity-links.service';

describe('AccessIdentityLinksService.listCredentialIds', () => {
  it('returns the linked ZKTeco identifiers for a member', async () => {
    const prisma = {
      member: { findFirst: jest.fn().mockResolvedValue({ id: 'member-1' }) },
      staffUser: { findFirst: jest.fn() },
      accessIdentityLink: {
        findMany: jest
          .fn()
          .mockResolvedValue([
            { externalId: 'card-42' },
            { externalId: 'pin-7' },
          ]),
      },
    } as unknown as PrismaService;
    const service = new AccessIdentityLinksService(prisma, {} as never);

    await expect(
      service.listCredentialIds('tenant-1', {
        kind: 'member',
        memberId: 'member-1',
      }),
    ).resolves.toEqual(['card-42', 'pin-7']);
  });

  it('uses the member document when there is no linked card or PIN', async () => {
    const findMember = jest
      .fn()
      .mockResolvedValueOnce({ id: 'member-1' })
      .mockResolvedValueOnce({ document: ' 123456 ' });
    const prisma = {
      member: { findFirst: findMember },
      staffUser: { findFirst: jest.fn() },
      accessIdentityLink: { findMany: jest.fn().mockResolvedValue([]) },
    } as unknown as PrismaService;
    const service = new AccessIdentityLinksService(prisma, {} as never);

    await expect(
      service.listCredentialIds('tenant-1', {
        kind: 'member',
        memberId: 'member-1',
      }),
    ).resolves.toEqual(['123456']);
  });

  it('returns no credential for staff without a ZKTeco link', async () => {
    const prisma = {
      member: { findFirst: jest.fn() },
      staffUser: { findFirst: jest.fn().mockResolvedValue({ id: 'staff-1' }) },
      accessIdentityLink: { findMany: jest.fn().mockResolvedValue([]) },
    } as unknown as PrismaService;
    const service = new AccessIdentityLinksService(prisma, {} as never);

    await expect(
      service.listCredentialIds('tenant-1', {
        kind: 'staff',
        staffUserId: 'staff-1',
      }),
    ).resolves.toEqual([]);
  });

  it('rejects a person outside the tenant', async () => {
    const prisma = {
      member: { findFirst: jest.fn().mockResolvedValue(null) },
      staffUser: { findFirst: jest.fn() },
      accessIdentityLink: { findMany: jest.fn() },
    } as unknown as PrismaService;
    const service = new AccessIdentityLinksService(prisma, {} as never);

    await expect(
      service.listCredentialIds('tenant-1', {
        kind: 'member',
        memberId: 'member-1',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
