import { db } from '../lib/db'

export interface ModuleToggle {
  id: string
  tenantId: string
  moduleKey: string
  enabled: boolean
  createdAt: Date
  updatedAt: Date
}

export async function getModuleToggleByKey(
  tenantId: string,
  moduleKey: string
): Promise<ModuleToggle | null> {
  const moduleToggle = await db.moduleToggle.findUnique({
    where: {
      tenantId_moduleKey: {
        tenantId,
        moduleKey
      }
    }
  })
  
  return moduleToggle
}

export async function getEnabledModulesByTenant(tenantId: string): Promise<ModuleToggle[]> {
  const modules = await db.moduleToggle.findMany({
    where: {
      tenantId,
      enabled: true
    },
    orderBy: {
      moduleKey: 'asc'
    }
  })
  
  return modules
}

export async function validateModuleAccess(
  tenantId: string,
  moduleKey: string
): Promise<{ hasAccess: boolean; module?: ModuleToggle }> {
  const module = await getModuleToggleByKey(tenantId, moduleKey)
  
  if (!module || !module.enabled) {
    return { hasAccess: false }
  }
  
  return {
    hasAccess: true,
    module
  }
}

export async function enableModule(
  tenantId: string,
  moduleKey: string
): Promise<ModuleToggle> {
  const module = await db.moduleToggle.upsert({
    where: {
      tenantId_moduleKey: {
        tenantId,
        moduleKey
      }
    },
    update: { enabled: true },
    create: {
      tenantId,
      moduleKey,
      enabled: true
    }
  })
  
  return module
}

export async function disableModule(
  tenantId: string,
  moduleKey: string
): Promise<ModuleToggle> {
  const module = await db.moduleToggle.update({
    where: {
      tenantId_moduleKey: {
        tenantId,
        moduleKey
      }
    },
    data: { enabled: false }
  })
  
  return module
}
