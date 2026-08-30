import * as bcrypt from 'bcryptjs';
import { PrismaClient, TenantStatus, MemberStatus } from '@prisma/client';

const prisma = new PrismaClient();

const DEMO_PASSWORD = 'ChangeMe123!';
const DEMO_TENANT_ID = '00000000-0000-4000-8000-000000000001';
const DEMO_SLUG = 'gym-de-prueba';

const PERMISSIONS: { code: string; description: string; dangerous: boolean }[] =
  [
    {
      code: 'tenant.settings.read',
      description: 'Ver configuración del gym',
      dangerous: false,
    },
    {
      code: 'tenant.settings.write',
      description: 'Editar configuración del gym',
      dangerous: false,
    },
    {
      code: 'members.read',
      description: 'Ver afiliados',
      dangerous: false,
    },
    {
      code: 'members.write',
      description: 'Alta y edición de ficha de afiliados',
      dangerous: false,
    },
    {
      code: 'members.deactivate',
      description: 'Suspender o dar de baja afiliados',
      dangerous: true,
    },
    {
      code: 'staff.read',
      description: 'Ver staff',
      dangerous: false,
    },
    {
      code: 'staff.write',
      description: 'Alta y edición de staff; asignación de roles',
      dangerous: false,
    },
    {
      code: 'roles.write',
      description: 'Crear y editar roles custom',
      dangerous: false,
    },
    {
      code: 'catalog.write',
      description: 'Servicios, packs y precios',
      dangerous: false,
    },
    {
      code: 'sessions.write',
      description: 'Sesiones, cupos y calendario',
      dangerous: false,
    },
    {
      code: 'reservations.write',
      description: 'Reservas operadas por staff',
      dangerous: false,
    },
    {
      code: 'cashier.operate',
      description: 'Operar caja del día',
      dangerous: false,
    },
    {
      code: 'transaction_items.refund',
      description: 'Devoluciones y reembolsos',
      dangerous: true,
    },
    {
      code: 'access.manual_pass',
      description: 'Pase manual en puerta',
      dangerous: true,
    },
    {
      code: 'access.verify',
      description: 'Verificar ingreso QR y ver historial de intentos',
      dangerous: false,
    },
    {
      code: 'routines.write',
      description: 'Catálogo y asignación de rutinas',
      dangerous: false,
    },
    {
      code: 'reports.read',
      description: 'Ver reportes mínimos',
      dangerous: false,
    },
    {
      code: 'audit.read',
      description: 'Ver eventos de auditoría del gym',
      dangerous: false,
    },
    {
      code: 'mp.connect',
      description: 'Conectar o cambiar cuenta Mercado Pago',
      dangerous: true,
    },
  ];

const PROFESOR_CODES = [
  'members.read',
  'sessions.write',
  'routines.write',
  'reports.read',
  'access.verify',
];

/**
 * Seed de desarrollo: Super + tenant demo completo (branch, roles, staff Admin, member).
 *
 * @remarks Credenciales solo para entornos locales. Kuatia: wallets compartidos
 * vía `KUATIA_*` en env (consola Kuatia); el seed no bindea por tenant.
 */
async function main(): Promise<void> {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);

  const superUser = await prisma.superUser.upsert({
    where: { email: 'super@faciliter.xyz' },
    update: { passwordHash, active: true, name: 'Super Admin' },
    create: {
      email: 'super@faciliter.xyz',
      passwordHash,
      name: 'Super Admin',
    },
  });

  const tenant = await prisma.tenant.upsert({
    where: { id: DEMO_TENANT_ID },
    update: {
      name: 'Gym de Prueba',
      status: TenantStatus.ACTIVE,
      slug: DEMO_SLUG,
    },
    create: {
      id: DEMO_TENANT_ID,
      name: 'Gym de Prueba',
      slug: DEMO_SLUG,
      status: TenantStatus.ACTIVE,
    },
  });

  const permissionRows = [];
  for (const def of PERMISSIONS) {
    permissionRows.push(
      await prisma.permission.upsert({
        where: { code: def.code },
        create: def,
        update: {
          description: def.description,
          dangerous: def.dangerous,
        },
      }),
    );
  }
  const byCode = new Map(permissionRows.map((p) => [p.code, p]));

  let branch = await prisma.branch.findFirst({
    where: { tenantId: tenant.id, isDefault: true },
  });
  if (!branch) {
    branch = await prisma.branch.create({
      data: {
        tenantId: tenant.id,
        name: 'Sede principal',
        active: true,
        isDefault: true,
      },
    });
  }

  let adminRole = await prisma.role.findUnique({
    where: {
      tenantId_slug: { tenantId: tenant.id, slug: 'admin' },
    },
  });
  if (!adminRole) {
    adminRole = await prisma.role.create({
      data: {
        tenantId: tenant.id,
        name: 'Admin',
        slug: 'admin',
        isSystem: true,
        rolePermissions: {
          create: permissionRows.map((p) => ({ permissionId: p.id })),
        },
      },
    });
  } else {
    await prisma.rolePermission.createMany({
      data: permissionRows.map((p) => ({
        roleId: adminRole!.id,
        permissionId: p.id,
      })),
      skipDuplicates: true,
    });
  }

  let profesorRole = await prisma.role.findUnique({
    where: {
      tenantId_slug: { tenantId: tenant.id, slug: 'profesor' },
    },
  });
  if (!profesorRole) {
    profesorRole = await prisma.role.create({
      data: {
        tenantId: tenant.id,
        name: 'Profesor',
        slug: 'profesor',
        isSystem: true,
        rolePermissions: {
          create: PROFESOR_CODES.map((code) => ({
            permissionId: byCode.get(code)!.id,
          })),
        },
      },
    });
  } else {
    await prisma.rolePermission.createMany({
      data: PROFESOR_CODES.map((code) => ({
        roleId: profesorRole!.id,
        permissionId: byCode.get(code)!.id,
      })),
      skipDuplicates: true,
    });
  }

  const staff = await prisma.staffUser.upsert({
    where: {
      tenantId_email: { tenantId: tenant.id, email: 'admin@gymdeprueba.com' },
    },
    update: { passwordHash, active: true, name: 'Admin Gym de Prueba' },
    create: {
      tenantId: tenant.id,
      email: 'admin@gymdeprueba.com',
      passwordHash,
      name: 'Admin Gym de Prueba',
    },
  });

  await prisma.staffUserRole.upsert({
    where: {
      staffUserId_roleId: {
        staffUserId: staff.id,
        roleId: adminRole.id,
      },
    },
    update: {},
    create: {
      staffUserId: staff.id,
      roleId: adminRole.id,
    },
  });

  const member = await prisma.member.upsert({
    where: {
      tenantId_email: { tenantId: tenant.id, email: 'socio@gymdeprueba.com' },
    },
    update: {
      passwordHash,
      name: 'Socio Gym de Prueba',
      status: MemberStatus.ACTIVE,
      phone: null,
      document: null,
    },
    create: {
      tenantId: tenant.id,
      email: 'socio@gymdeprueba.com',
      passwordHash,
      name: 'Socio Gym de Prueba',
      status: MemberStatus.ACTIVE,
    },
  });

  await prisma.tenantSettings.upsert({
    where: { tenantId: tenant.id },
    update: {},
    create: {
      tenantId: tenant.id,
      reservationCancellationHours: 6,
    },
  });

  console.log('Seed OK');
  console.log({
    superUser: { id: superUser.id, email: superUser.email },
    tenant: { id: tenant.id, name: tenant.name, slug: DEMO_SLUG },
    branch: { id: branch.id, name: branch.name },
    staff: {
      id: staff.id,
      email: staff.email,
      roles: ['admin'],
    },
    profesorRoleId: profesorRole.id,
    member: { id: member.id, email: member.email },
    password: DEMO_PASSWORD,
    kuatia:
      'Shared wallets via KUATIA_ISSUER_WALLET_ID / KUATIA_VERIFIER_WALLET_ID',
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
