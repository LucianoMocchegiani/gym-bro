import { BillingPeriod, PrismaClient, ServiceType } from '@prisma/client';

/**
 * Actualiza packs de plataforma (tenant `admin`) sin correr el seed entero.
 *
 * Uso: `npm run prisma:upsert-platform-packs` (desde `api/`).
 */
const prisma = new PrismaClient();

const ADMIN_TENANT_ID = '00000000-0000-4000-8000-000000000002';
const BRAIN_SERVICE_ID = '00000000-0000-4000-8000-000000000010';
const BRAIN_PACK_ID = '00000000-0000-4000-8000-000000000011';
const BRAIN_TRIAL_PACK_ID = '00000000-0000-4000-8000-000000000016';
const EXTRA_SERVICE_IDS = [
  '00000000-0000-4000-8000-000000000012',
  '00000000-0000-4000-8000-000000000013',
  '00000000-0000-4000-8000-000000000014',
  '00000000-0000-4000-8000-000000000015',
] as const;

async function main(): Promise<void> {
  const admin = await prisma.tenant.findUnique({
    where: { id: ADMIN_TENANT_ID },
    select: { id: true, slug: true },
  });
  if (!admin) {
    throw new Error(`Tenant admin ${ADMIN_TENANT_ID} not found`);
  }

  const brainService = await prisma.service.upsert({
    where: { id: BRAIN_SERVICE_ID },
    update: { active: true },
    create: {
      id: BRAIN_SERVICE_ID,
      tenantId: admin.id,
      type: ServiceType.ACCESO_LIBRE,
      name: 'Plataforma Brain',
      description: 'Núcleo de Faciliter Brain (obligatorio en cada pack).',
      active: true,
    },
  });

  const catalogServiceIds = [brainService.id, ...EXTRA_SERVICE_IDS];

  const brainPack = await prisma.pack.upsert({
    where: { id: BRAIN_PACK_ID },
    update: {
      name: 'Faciliter Brain Basic',
      description: 'Pack de plataforma: Brain más operación del gym.',
      price: 60000,
      billingPeriod: BillingPeriod.MONTHLY,
      active: true,
    },
    create: {
      id: BRAIN_PACK_ID,
      tenantId: admin.id,
      name: 'Faciliter Brain Basic',
      description: 'Pack de plataforma: Brain más operación del gym.',
      price: 60000,
      billingPeriod: BillingPeriod.MONTHLY,
      active: true,
    },
  });

  const brainTrialPack = await prisma.pack.upsert({
    where: { id: BRAIN_TRIAL_PACK_ID },
    update: {
      name: 'Faciliter Brain Basic de prueba',
      description:
        'Mismo alcance que Basic; precio de prueba para validar Mercado Pago.',
      price: 100,
      billingPeriod: BillingPeriod.MONTHLY,
      active: true,
    },
    create: {
      id: BRAIN_TRIAL_PACK_ID,
      tenantId: admin.id,
      name: 'Faciliter Brain Basic de prueba',
      description:
        'Mismo alcance que Basic; precio de prueba para validar Mercado Pago.',
      price: 100,
      billingPeriod: BillingPeriod.MONTHLY,
      active: true,
    },
  });

  for (const packId of [brainPack.id, brainTrialPack.id]) {
    for (const serviceId of catalogServiceIds) {
      const service = await prisma.service.findFirst({
        where: { id: serviceId, tenantId: admin.id },
      });
      if (!service) {
        throw new Error(`Service ${serviceId} missing in admin catalog`);
      }
      await prisma.packComponent.upsert({
        where: { packId_serviceId: { packId, serviceId } },
        update: { creditAmount: 1 },
        create: { packId, serviceId, creditAmount: 1 },
      });
    }
  }

  console.log({
    admin: admin.slug,
    basic: { id: brainPack.id, name: brainPack.name, price: brainPack.price },
    trial: {
      id: brainTrialPack.id,
      name: brainTrialPack.name,
      price: brainTrialPack.price,
    },
  });
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
