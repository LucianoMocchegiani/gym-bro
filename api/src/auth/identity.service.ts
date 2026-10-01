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
   * @param input.passwordTemporary Solo aplica si se crea (migración de afiliados).
   * @returns `created` en true si la persona no existía.
   */
  async ensure(
    db: IdentityDb | undefined,
    input: {
      email: string;
      passwordHash: string;
      name: string | null;
      passwordTemporary?: boolean;
    },
  ): Promise<{ id: string; created: boolean }> {
    const client = db ?? this.prisma;
    const email = input.email.trim().toLowerCase();
    const existing = await client.identity.findUnique({
      where: { email },
      select: { id: true },
    });
    if (existing) {
      return { id: existing.id, created: false };
    }
    const created = await client.identity.create({
      data: {
        email,
        passwordHash: input.passwordHash,
        passwordTemporary: input.passwordTemporary ?? false,
        name: input.name,
      },
      select: { id: true },
    });
    return { id: created.id, created: true };
  }
}
