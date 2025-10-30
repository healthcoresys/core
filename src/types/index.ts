export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface TokenMintRequest {
  audience: string
  scope: string | string[]
  patientId?: string
  tenantSlug?: string
}

export interface TokenMintResponse {
  token: string
  expiresIn: number
  tokenType: 'Bearer'
}

export interface HealthCheckResponse {
  status: 'healthy' | 'unhealthy'
  timestamp: string
  version: string
  services: {
    database: 'up' | 'down'
    redis?: 'up' | 'down'
    auth0: 'up' | 'down'
  }
}

export interface SanityCheckResponse {
  status: 'ok' | 'error'
  checks: {
    database: boolean
    jwtKeys: boolean
    auth0: boolean
    redis?: boolean
  }
  timestamp: string
}

export interface AuditLogEntry {
  id: string
  actorId: string
  tenantId?: string
  action: string
  resource?: string
  details?: string
  ip?: string
  userAgent?: string
  createdAt: Date
}

export interface RateLimitInfo {
  success: boolean
  limit: number
  remaining: number
  reset: number
}
