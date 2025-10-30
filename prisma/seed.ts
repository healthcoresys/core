import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // Create test tenants
  const enterpriseTenant = await prisma.tenant.upsert({
    where: { slug: 'healthcore-enterprise' },
    update: {},
    create: {
      slug: 'healthcore-enterprise',
      name: 'HealthCore Enterprise',
      kind: 'enterprise'
    }
  })

  const clinicTenant = await prisma.tenant.upsert({
    where: { slug: 'downtown-clinic' },
    update: {},
    create: {
      slug: 'downtown-clinic',
      name: 'Downtown Medical Clinic',
      kind: 'clinic'
    }
  })

  const labTenant = await prisma.tenant.upsert({
    where: { slug: 'central-lab' },
    update: {},
    create: {
      slug: 'central-lab',
      name: 'Central Diagnostic Lab',
      kind: 'lab'
    }
  })

  console.log('✅ Created tenants:', { enterpriseTenant, clinicTenant, labTenant })

  // Create test users
  const adminUser = await prisma.user.upsert({
    where: { auth0Sub: 'auth0|admin-user' },
    update: {},
    create: {
      auth0Sub: 'auth0|admin-user',
      email: 'admin@healthcore.systems',
      name: 'System Administrator'
    }
  })

  const doctorUser = await prisma.user.upsert({
    where: { auth0Sub: 'auth0|doctor-user' },
    update: {},
    create: {
      auth0Sub: 'auth0|doctor-user',
      email: 'doctor@downtown-clinic.com',
      name: 'Dr. Sarah Johnson'
    }
  })

  const labTechUser = await prisma.user.upsert({
    where: { auth0Sub: 'auth0|lab-tech' },
    update: {},
    create: {
      auth0Sub: 'auth0|lab-tech',
      email: 'tech@central-lab.com',
      name: 'Mike Chen'
    }
  })

  console.log('✅ Created users:', { adminUser, doctorUser, labTechUser })

  // Create user-tenant memberships
  await prisma.userTenant.upsert({
    where: { 
      userId_tenantId: {
        userId: adminUser.id,
        tenantId: enterpriseTenant.id
      }
    },
    update: {},
    create: {
      userId: adminUser.id,
      tenantId: enterpriseTenant.id,
      role: 'owner'
    }
  })

  await prisma.userTenant.upsert({
    where: { 
      userId_tenantId: {
        userId: doctorUser.id,
        tenantId: clinicTenant.id
      }
    },
    update: {},
    create: {
      userId: doctorUser.id,
      tenantId: clinicTenant.id,
      role: 'admin'
    }
  })

  await prisma.userTenant.upsert({
    where: { 
      userId_tenantId: {
        userId: labTechUser.id,
        tenantId: labTenant.id
      }
    },
    update: {},
    create: {
      userId: labTechUser.id,
      tenantId: labTenant.id,
      role: 'staff'
    }
  })

  console.log('✅ Created user-tenant memberships')

  // Create module toggles
  const modules = [
    'intake',
    'scheduling', 
    'labs',
    'pharmacy',
    'site-builder',
    'billing',
    'reports',
    'analytics'
  ]

  for (const tenant of [enterpriseTenant, clinicTenant, labTenant]) {
    for (const moduleKey of modules) {
      await prisma.moduleToggle.upsert({
        where: {
          tenantId_moduleKey: {
            tenantId: tenant.id,
            moduleKey
          }
        },
        update: {},
        create: {
          tenantId: tenant.id,
          moduleKey,
          enabled: true
        }
      })
    }
  }

  console.log('✅ Created module toggles for all tenants')

  // Create some audit entries
  await prisma.audit.createMany({
    data: [
      {
        actorId: adminUser.id,
        tenantId: enterpriseTenant.id,
        action: 'tenant_created',
        resource: 'tenant',
        details: 'Enterprise tenant created during seeding',
        ip: '127.0.0.1',
        userAgent: 'seed-script'
      },
      {
        actorId: doctorUser.id,
        tenantId: clinicTenant.id,
        action: 'user_login',
        resource: 'auth',
        details: 'Doctor user logged in',
        ip: '192.168.1.100',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      {
        actorId: labTechUser.id,
        tenantId: labTenant.id,
        action: 'module_enabled',
        resource: 'module',
        details: 'Lab module enabled for tenant',
        ip: '192.168.1.101',
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
      }
    ]
  })

  console.log('✅ Created audit entries')

  console.log('🎉 Database seeding completed successfully!')
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

