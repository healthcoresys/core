import { db } from './db'

export interface AuditLogData {
  actorId: string
  tenantId?: string
  action: string
  resource?: string
  details?: string
  ip?: string
  userAgent?: string
}

// Redact sensitive information from audit logs
function redactSensitiveData(data: any): any {
  if (typeof data === 'string') {
    // Redact potential PHI patterns
    return data
      .replace(/\b\d{3}-\d{2}-\d{4}\b/g, '[SSN-REDACTED]') // SSN pattern
      .replace(/\b\d{3}\.\d{2}\.\d{4}\b/g, '[SSN-REDACTED]') // SSN with dots
      .replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '[EMAIL-REDACTED]') // Email
      .replace(/\b\d{3}-\d{3}-\d{4}\b/g, '[PHONE-REDACTED]') // Phone
      .replace(/\b\d{4}\s\d{4}\s\d{4}\s\d{4}\b/g, '[CARD-REDACTED]') // Credit card
      .replace(/\bpatient[-_]?\d+\b/gi, '[PATIENT-ID-REDACTED]') // Patient ID patterns
      .replace(/\buser[-_]?\d+\b/gi, '[USER-ID-REDACTED]') // User ID patterns
  }
  
  if (typeof data === 'object' && data !== null) {
    if (Array.isArray(data)) {
      return data.map(redactSensitiveData)
    }
    
    const redacted: any = {}
    for (const [key, value] of Object.entries(data)) {
      // Skip sensitive keys entirely
      if (['password', 'secret', 'token', 'key', 'auth', 'credential'].some(sensitive => 
        key.toLowerCase().includes(sensitive)
      )) {
        redacted[key] = '[REDACTED]'
      } else {
        redacted[key] = redactSensitiveData(value)
      }
    }
    return redacted
  }
  
  return data
}

export async function writeAuditLog(data: AuditLogData): Promise<void> {
  try {
    // Redact sensitive information
    const redactedDetails = data.details ? redactSensitiveData(data.details) : null
    const redactedUserAgent = data.userAgent ? redactSensitiveData(data.userAgent) : null
    
    await db.audit.create({
      data: {
        actorId: data.actorId,
        tenantId: data.tenantId,
        action: data.action,
        resource: data.resource,
        details: redactedDetails,
        ip: data.ip,
        userAgent: redactedUserAgent
      }
    })
  } catch (error) {
    console.error('Failed to write audit log:', error)
    // Don't throw - audit logging should not break the main flow
  }
}

export async function getAuditLogs(
  tenantId?: string,
  limit: number = 100,
  offset: number = 0
) {
  return await db.audit.findMany({
    where: tenantId ? { tenantId } : {},
    orderBy: { createdAt: 'desc' },
    take: limit,
    skip: offset
  })
}
