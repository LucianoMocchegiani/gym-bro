import { createHash, randomBytes } from 'node:crypto';
import * as bcrypt from 'bcryptjs';
import { PrismaClient, TenantStatus } from '@prisma/client';

const prisma = new PrismaClient();

const DEMO_PASSWORD = 'ChangeMe123!';
const DEMO_TENANT_ID = '00000000-0000-4000-8000-000000000001';

/**
 * Seed de desarrollo: Super Admin + tenant demo + staff + afiliado.
 *
 * @remarks Credenciales solo para entornos locales. No usar en producción.
 */
async function main(): Promise<void> {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);

  const superUser = await prisma.superUser.upsert({
    where: { email: 'super@gymbro.local' },
    update: { passwordHash, active: true, name: 'Super Admin' },
    create: {
      email: 'super@gymbro.local',
      passwordHash,
      name: 'Super Admin',
    },
  });

  const tenant = await prisma.tenant.upsert({
    where: { id: DEMO_TENANT_ID },
    update: { name: 'Demo Gym', status: TenantStatus.ACTIVE },
    create: {
      id: DEMO_TENANT_ID,
      name: 'Demo Gym',
      status: TenantStatus.ACTIVE,
    },
  });

  const staff = await prisma.staffUser.upsert({
    where: {
      tenantId_email: { tenantId: tenant.id, email: 'admin@demo.gym' },
    },
    update: { passwordHash, active: true, name: 'Admin Demo' },
    create: {
      tenantId: tenant.id,
      email: 'admin@demo.gym',
      passwordHash,
      name: 'Admin Demo',
    },
  });

  const member = await prisma.member.upsert({
    where: {
      tenantId_email: { tenantId: tenant.id, email: 'socio@demo.gym' },
    },
    update: { passwordHash, active: true, name: 'Socio Demo' },
    create: {
      tenantId: tenant.id,
      email: 'socio@demo.gym',
      passwordHash,
      name: 'Socio Demo',
    },
  });

  console.log('Seed OK');
  console.log({
    superUser: { id: superUser.id, email: superUser.email },
    tenant: { id: tenant.id, name: tenant.name },
    staff: { id: staff.id, email: staff.email },
    member: { id: member.id, email: member.email },
    password: DEMO_PASSWORD,
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
