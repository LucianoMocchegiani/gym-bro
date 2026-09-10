import { PaymentMethod, PrismaClient } from '@prisma/client';

/**
 * Borra cobros STUB (y contratos/reservas/offers atados) de un tenant.
 *
 * Uso: `npx ts-node --compiler-options {\"module\":\"CommonJS\"} prisma/purge-stub-payments.ts [slug]`
 * Default slug: gym-de-prueba.
 */
const prisma = new PrismaClient();
const slug = process.argv[2]?.trim() || 'gym-de-prueba';

async function main(): Promise<void> {
  const tenant = await prisma.tenant.findFirst({
    where: { slug },
    select: { id: true, slug: true, name: true },
  });
  if (!tenant) {
    throw new Error(`Tenant slug=${slug} not found`);
  }

  const items = await prisma.transactionItem.findMany({
    where: { tenantId: tenant.id, method: PaymentMethod.STUB },
    select: { id: true, transactionId: true },
  });
  const itemIds = items.map((i) => i.id);
  const transactionIds = [...new Set(items.map((i) => i.transactionId))];

  console.log(
    `Tenant ${tenant.slug} (${tenant.name}): ${itemIds.length} STUB item(s)`,
  );
  if (itemIds.length === 0) {
    return;
  }

  await prisma.$transaction(async (tx) => {
    const contracts = await tx.contract.findMany({
      where: { tenantId: tenant.id, transactionItemId: { in: itemIds } },
      select: { id: true },
    });
    const contractIds = contracts.map((c) => c.id);

    const creditRes = await tx.reservation.findMany({
      where: { tenantId: tenant.id, contractId: { in: contractIds } },
      select: { id: true },
    });
    const dropInRes = await tx.reservation.findMany({
      where: { tenantId: tenant.id, transactionItemId: { in: itemIds } },
      select: { id: true },
    });
    const reservationIds = [
      ...new Set([...creditRes, ...dropInRes].map((r) => r.id)),
    ];

    if (reservationIds.length) {
      await tx.accessAttempt.updateMany({
        where: { reservationId: { in: reservationIds } },
        data: { reservationId: null },
      });
      await tx.reservation.deleteMany({
        where: { id: { in: reservationIds } },
      });
    }

    await tx.credentialOffer.deleteMany({
      where: { tenantId: tenant.id, contractId: { in: contractIds } },
    });
    await tx.contractCreditBalance.deleteMany({
      where: { contractId: { in: contractIds } },
    });
    await tx.contract.deleteMany({
      where: { id: { in: contractIds } },
    });

    await tx.refundRequest.deleteMany({
      where: { transactionItemId: { in: itemIds } },
    });
    await tx.debitMandate.updateMany({
      where: { enrolledTransactionItemId: { in: itemIds } },
      data: { enrolledTransactionItemId: null },
    });
    await tx.cashMovement.deleteMany({
      where: { transactionItemId: { in: itemIds } },
    });
    await tx.receipt.deleteMany({
      where: {
        OR: [
          { transactionItemId: { in: itemIds } },
          { transactionId: { in: transactionIds } },
        ],
      },
    });
    await tx.transactionItem.deleteMany({
      where: { id: { in: itemIds } },
    });

    for (const transactionId of transactionIds) {
      const left = await tx.transactionItem.count({
        where: { transactionId },
      });
      if (left === 0) {
        await tx.transaction.delete({ where: { id: transactionId } });
      }
    }
  });

  console.log(
    `Purged STUB: items=${itemIds.length} (contracts/reservations/offers/receipts)`,
  );
}

void main()
  .catch((err: unknown) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
