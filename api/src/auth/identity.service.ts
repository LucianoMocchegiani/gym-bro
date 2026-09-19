import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

type IdentityDb = PrismaService | Prisma.TransactionClient;

/**
 * Crea o reusa la persona Faciliter por email (vínculo al gym).
 */
@Injectable()
export class IdentityService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Garantiza una `identities` para el mail. No pisa password si ya existía.
   *
   * @param db Transacción opcional (alta tenant/staff/afiliado).
   */
  async ensure(
    db: IdentityDb | undefined,
    input: { email: string; passwordHash: string; name: string | null },
  ): Promise<{ id: string }> {
    const client = db ?? this.prisma;
    const email = input.email.trim().toLowerCase();
    const existing = await client.identity.findUnique({
      where: { email },
      select: { id: true },
    });
    if (existing) {
      return existing;
    }
    return client.identity.create({
      data: {
        email,
        passwordHash: input.passwordHash,
        name: input.name,
      },
      select: { id: true },
    });
  }
}
