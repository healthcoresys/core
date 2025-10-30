import { db } from '../lib/db'

export interface Tenant {
  id: string
  slug: string
  name: string
  kind: string
  createdAt: Date
  updatedAt: Date
}

export interface UserTenant {
  id: string
  userId: string
  tenantId: string
  role: string
  createdAt: Date
  updatedAt: Date
}

export async function getTenantById(tenantId: string): Promise<Tenant | null> {
  const tenant = await db.tenant.findUnique({
    where: { id: tenantId }
  })
  
  return tenant
}

export async function getTenantBySlug(slug: string): Promise<Tenant | null> {
  const tenant = await db.tenant.findUnique({
    where: { slug }
  })
  
  return tenant
}

export async function getAllTenants(): Promise<Tenant[]> {
  const tenants = await db.tenant.findMany({
    orderBy: {
      slug: 'asc'
    }
  })
  
  return tenants
}

export async function createTenant(data: {
  slug: string
  name: string
  kind: string
}): Promise<Tenant> {
  const tenant = await db.tenant.create({
    data: {
      slug: data.slug,
      name: data.name,
      kind: data.kind
    }
  })
  
  return tenant
}

export async function updateTenant(
  tenantId: string,
  data: {
    slug?: string
    name?: string
    kind?: string
  }
): Promise<Tenant> {
  const tenant = await db.tenant.update({
    where: { id: tenantId },
    data
  })
  
  return tenant
}

export async function deleteTenant(tenantId: string): Promise<void> {
  await db.tenant.delete({
    where: { id: tenantId }
  })
}

export async function validateTenantExists(tenantId: string): Promise<boolean> {
  const tenant = await getTenantById(tenantId)
  return tenant !== null
}

export async function getUserTenantMembership(
  userId: string,
  tenantId: string
): Promise<UserTenant | null> {
  const membership = await db.userTenant.findUnique({
    where: {
      userId_tenantId: {
        userId,
        tenantId
      }
    }
  })
  
  return membership
}

export async function getUserTenants(userId: string): Promise<UserTenant[]> {
  const memberships = await db.userTenant.findMany({
    where: { userId },
    include: {
      tenant: true
    }
  })
  
  return memberships
}
