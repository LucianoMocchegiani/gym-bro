import * as bcrypt from 'bcryptjs';
import {
  PrismaClient,
  TenantStatus,
  MemberStatus,
  ServiceType,
  BillingPeriod,
} from '@prisma/client';

const prisma = new PrismaClient();

const DEMO_PASSWORD = 'ChangeMe123!';
const DEMO_TENANT_ID = '00000000-0000-4000-8000-000000000001';
const DEMO_SLUG = 'gym-de-prueba';

async function identityFor(
  email: string,
  passwordHash: string,
  name: string,
) {
  return prisma.identity.upsert({
    where: { email },
    update: { passwordHash, name },
    create: { email, passwordHash, name },
  });
}

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
    {
      code: 'platform.tenants.read',
      description: 'Listar gyms de la plataforma',
      dangerous: false,
    },
    {
      code: 'platform.tenants.write',
      description: 'CRUD gyms de la plataforma',
      dangerous: true,
    },
    {
      code: 'platform.impersonate',
      description: 'Impersonar staff de cualquier gym',
      dangerous: true,
    },
  ];

const ENTRENADOR_CODES = [
  'members.read',
  'sessions.write',
  'routines.write',
  'reports.read',
  'access.verify',
];

/**
 * Seed de desarrollo: tenant `admin` (plataforma) + tenant demo completo.
 *
 * @remarks La plataforma entra como Staff del tenant `admin` (rol `super-admin`);
 * ya no existe un perfil `SUPER` aparte. Credenciales solo para entornos
 * locales. Kuatia: wallets compartidos vía `KUATIA_*` en env.
 */
async function main(): Promise<void> {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);

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

  let entrenadorRole = await prisma.role.findUnique({
    where: {
      tenantId_slug: { tenantId: tenant.id, slug: 'entrenador' },
    },
  });
  if (!entrenadorRole) {
    entrenadorRole = await prisma.role.findUnique({
      where: {
        tenantId_slug: { tenantId: tenant.id, slug: 'profesor' },
      },
    });
    if (entrenadorRole) {
      entrenadorRole = await prisma.role.update({
        where: { id: entrenadorRole.id },
        data: { name: 'Entrenador', slug: 'entrenador' },
      });
    }
  }
  if (!entrenadorRole) {
    entrenadorRole = await prisma.role.create({
      data: {
        tenantId: tenant.id,
        name: 'Entrenador',
        slug: 'entrenador',
        isSystem: true,
        rolePermissions: {
          create: ENTRENADOR_CODES.map((code) => ({
            permissionId: byCode.get(code)!.id,
          })),
        },
      },
    });
  } else {
    await prisma.role.update({
      where: { id: entrenadorRole.id },
      data: { name: 'Entrenador', slug: 'entrenador' },
    });
    await prisma.rolePermission.createMany({
      data: ENTRENADOR_CODES.map((code) => ({
        roleId: entrenadorRole!.id,
        permissionId: byCode.get(code)!.id,
      })),
      skipDuplicates: true,
    });
  }

  const adminIdentity = await identityFor(
    'admin@gymdeprueba.com',
    passwordHash,
    'Admin Gym de Prueba',
  );
  const staff = await prisma.staffUser.upsert({
    where: {
      tenantId_email: { tenantId: tenant.id, email: 'admin@gymdeprueba.com' },
    },
    update: {
      identityId: adminIdentity.id,
      active: true,
      name: 'Admin Gym de Prueba',
    },
    create: {
      tenantId: tenant.id,
      identityId: adminIdentity.id,
      email: 'admin@gymdeprueba.com',
      name: 'Admin Gym de Prueba',
    },
  });

  await prisma.tenant.update({
    where: { id: tenant.id },
    data: { ownerIdentityId: adminIdentity.id },
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

  const oldEntrenadorStaff = await prisma.staffUser.findUnique({
    where: {
      tenantId_email: {
        tenantId: tenant.id,
        email: 'profesor@gymdeprueba.com',
      },
    },
  });
  if (oldEntrenadorStaff) {
    await prisma.staffUser.update({
      where: { id: oldEntrenadorStaff.id },
      data: {
        email: 'entrenador@gymdeprueba.com',
        active: true,
        name: 'Entrenador Gym de Prueba',
      },
    });
  }

  const entrenadorIdentity = await identityFor(
    'entrenador@gymdeprueba.com',
    passwordHash,
    'Entrenador Gym de Prueba',
  );
  const entrenadorStaff = await prisma.staffUser.upsert({
    where: {
      tenantId_email: {
        tenantId: tenant.id,
        email: 'entrenador@gymdeprueba.com',
      },
    },
    update: {
      identityId: entrenadorIdentity.id,
      active: true,
      name: 'Entrenador Gym de Prueba',
    },
    create: {
      tenantId: tenant.id,
      identityId: entrenadorIdentity.id,
      email: 'entrenador@gymdeprueba.com',
      name: 'Entrenador Gym de Prueba',
    },
  });

  await prisma.staffUserRole.upsert({
    where: {
      staffUserId_roleId: {
        staffUserId: entrenadorStaff.id,
        roleId: entrenadorRole.id,
      },
    },
    update: {},
    create: {
      staffUserId: entrenadorStaff.id,
      roleId: entrenadorRole.id,
    },
  });

  const socioIdentity = await identityFor(
    'socio@gymdeprueba.com',
    passwordHash,
    'Socio Gym de Prueba',
  );
  const member = await prisma.member.upsert({
    where: {
      tenantId_email: { tenantId: tenant.id, email: 'socio@gymdeprueba.com' },
    },
    update: {
      identityId: socioIdentity.id,
      name: 'Socio Gym de Prueba',
      status: MemberStatus.ACTIVE,
      phone: null,
      document: null,
    },
    create: {
      tenantId: tenant.id,
      identityId: socioIdentity.id,
      email: 'socio@gymdeprueba.com',
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

  // Tenant admin (plataforma)
  const ADMIN_TENANT_ID = '00000000-0000-4000-8000-000000000002';
  const ADMIN_TENANT = await prisma.tenant.upsert({
    where: { id: ADMIN_TENANT_ID },
    update: { name: 'Faciliter Admin', slug: 'admin', status: TenantStatus.ACTIVE },
    create: {
      id: ADMIN_TENANT_ID,
      name: 'Faciliter Admin',
      slug: 'admin',
      status: TenantStatus.ACTIVE,
    },
  });

  const platformAdminIdentity = await identityFor(
    'admin@faciliter.xyz',
    passwordHash,
    'Admin Faciliter',
  );
  const platformAdminStaff = await prisma.staffUser.upsert({
    where: {
      tenantId_email: { tenantId: ADMIN_TENANT.id, email: 'admin@faciliter.xyz' },
    },
    update: { identityId: platformAdminIdentity.id, active: true, name: 'Admin Faciliter' },
    create: {
      tenantId: ADMIN_TENANT.id,
      identityId: platformAdminIdentity.id,
      email: 'admin@faciliter.xyz',
      name: 'Admin Faciliter',
    },
  });

  await prisma.tenant.update({
    where: { id: ADMIN_TENANT.id },
    data: { ownerIdentityId: platformAdminIdentity.id },
  });

   let platformAdminRole = await prisma.role.findUnique({
     where: {
       tenantId_slug: { tenantId: ADMIN_TENANT.id, slug: 'super-admin' },
     },
   });
   if (!platformAdminRole) {
     platformAdminRole = await prisma.role.create({
       data: {
         tenantId: ADMIN_TENANT.id,
         name: 'Super Admin',
         slug: 'super-admin',
         isSystem: true,
         rolePermissions: {
           create: permissionRows.map((p) => ({ permissionId: p.id })),
         },
       },
     });
   }
   await prisma.staffUserRole.upsert({
     where: {
       staffUserId_roleId: {
         staffUserId: platformAdminStaff.id,
         roleId: platformAdminRole!.id,
       },
     },
     update: {},
     create: {
       staffUserId: platformAdminStaff.id,
       roleId: platformAdminRole!.id,
     },
   });

    // Catálogo de plataforma: el tenant `admin` vende estos packs a los gyms.
    //
    // @remarks El catálogo es tenant-scoped (`@RequireTenantAuth()`), así que sin
    // esto la Caja de plataforma arranca vacía. UUIDs fijos para que el seed sea
    // idempotente (Service y Pack no tienen unique por nombre).
    const BRAIN_SERVICE_ID = '00000000-0000-4000-8000-000000000010';
    const brainService = await prisma.service.upsert({
      where: { id: BRAIN_SERVICE_ID },
      update: {
        name: 'Plataforma Brain',
        description: 'Núcleo de Faciliter Brain (obligatorio en cada pack).',
        active: true,
      },
      create: {
        id: BRAIN_SERVICE_ID,
        tenantId: ADMIN_TENANT.id,
        type: ServiceType.ACCESO_LIBRE,
        name: 'Plataforma Brain',
        description: 'Núcleo de Faciliter Brain (obligatorio en cada pack).',
        active: true,
      },
    });

    const platformCatalogServices: {
      id: string;
      name: string;
      description: string;
    }[] = [
      {
        id: '00000000-0000-4000-8000-000000000012',
        name: 'Agente de IA',
        description: 'Asistente de consulta en el panel.',
      },
      {
        id: '00000000-0000-4000-8000-000000000013',
        name: 'Calendario y sesiones',
        description: 'Clases, cupos y reservas.',
      },
      {
        id: '00000000-0000-4000-8000-000000000014',
        name: 'Integración con Mercado Pago',
        description: 'Cobros en línea con la cuenta del gym.',
      },
      {
        id: '00000000-0000-4000-8000-000000000015',
        name: 'Sistema de accesos',
        description: 'Puerta, QR y registro de ingresos.',
      },
    ];
    const extraServices = [];
    for (const row of platformCatalogServices) {
      extraServices.push(
        await prisma.service.upsert({
          where: { id: row.id },
          update: {
            name: row.name,
            description: row.description,
            active: true,
          },
          create: {
            id: row.id,
            tenantId: ADMIN_TENANT.id,
            type: ServiceType.ACCESO_LIBRE,
            name: row.name,
            description: row.description,
            active: true,
          },
        }),
      );
    }

    const BRAIN_PACK_ID = '00000000-0000-4000-8000-000000000011';
    const brainPack = await prisma.pack.upsert({
      where: { id: BRAIN_PACK_ID },
      update: {
        name: 'Faciliter Brain Basic',
        description: 'Pack de plataforma: Brain más operación del gym.',
        price: 30000,
        billingPeriod: BillingPeriod.MONTHLY,
        active: true,
      },
      create: {
        id: BRAIN_PACK_ID,
        tenantId: ADMIN_TENANT.id,
        name: 'Faciliter Brain Basic',
        description: 'Pack de plataforma: Brain más operación del gym.',
        price: 30000,
        billingPeriod: BillingPeriod.MONTHLY,
        active: true,
      },
    });

    const catalogServiceIds = [brainService.id, ...extraServices.map((s) => s.id)];
    for (const serviceId of catalogServiceIds) {
      await prisma.packComponent.upsert({
        where: {
          packId_serviceId: { packId: brainPack.id, serviceId },
        },
        update: { creditAmount: 1 },
        create: {
          packId: brainPack.id,
          serviceId,
          creditAmount: 1,
        },
      });
    }

    console.log('Seed OK');
  console.log({
    tenant: { id: tenant.id, name: tenant.name, slug: DEMO_SLUG },
    adminTenant: { id: ADMIN_TENANT.id, name: ADMIN_TENANT.name, slug: 'admin' },
    platformCatalog: {
      pack: { id: brainPack.id, name: brainPack.name, price: brainPack.price },
      services: catalogServiceIds.length,
    },
    branch: { id: branch.id, name: branch.name },
    staff: {
      id: staff.id,
      email: staff.email,
      roles: ['admin'],
    },
    platformAdminStaff: {
      id: platformAdminStaff.id,
      email: platformAdminStaff.email,
      roles: ['admin'],
    },
    entrenadorStaff: {
      id: entrenadorStaff.id,
      email: entrenadorStaff.email,
      roles: ['entrenador'],
    },
    entrenadorRoleId: entrenadorRole.id,
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
