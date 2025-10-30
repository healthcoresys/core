import { NextRequest } from 'next/server'
import { getSession } from '@auth0/nextjs-auth0'
import { env } from './env'
import { createRemoteJWKSet, jwtVerify, JWTPayload } from 'jose'

export interface Auth0User {
  sub: string
  email: string
  name?: string
  picture?: string
  'https://healthcore.systems/tenant_id'?: string
  'https://healthcore.systems/roles'?: string[]
  'https://healthcore.systems/tenant_slug'?: string
}

export async function getAuthenticatedUser(request: NextRequest): Promise<Auth0User | null> {
  try {
    const session = await getSession(request)
    
    if (!session?.user) {
      return null
    }
    
    return session.user as Auth0User
  } catch (error) {
    console.error('Auth0 session error:', error)
    return null
  }
}

export function validateTenantAccess(user: Auth0User, requiredTenantId?: string): boolean {
  const userTenantId = user['https://healthcore.systems/tenant_id']
  
  if (!userTenantId) {
    return false
  }
  
  if (requiredTenantId && userTenantId !== requiredTenantId) {
    return false
  }
  
  return true
}

export function getUserRoles(user: Auth0User): string[] {
  return user['https://healthcore.systems/roles'] || []
}

export function hasRole(user: Auth0User, role: string): boolean {
  const roles = getUserRoles(user)
  return roles.includes(role)
}

export function getUserTenantSlug(user: Auth0User): string | null {
  return user['https://healthcore.systems/tenant_slug'] || null
}

// Scope mapping based on user roles
export function getAllowedScopes(userRole: string, audience: string): string[] {
  const baseScopes = ['read:file', 'read:record']
  
  switch (userRole) {
    case 'owner':
      return [...baseScopes, 'write:file', 'write:record', 'admin:tenant', 'admin:users']
    case 'admin':
      return [...baseScopes, 'write:file', 'write:record', 'admin:tenant']
    case 'staff':
      return [...baseScopes, 'write:file', 'write:record']
    case 'viewer':
      return baseScopes
    default:
      return baseScopes
  }
}

export function isScopeAllowed(requestedScope: string, userRole: string, audience: string): boolean {
  const allowedScopes = getAllowedScopes(userRole, audience)
  
  // Handle space-separated scopes
  const requestedScopes = requestedScope.split(' ').filter(Boolean)
  
  return requestedScopes.every(scope => allowedScopes.includes(scope))
}

// Bearer token verification against Auth0 JWKS
export async function verifyAuth0AccessToken(authorizationHeader?: string): Promise<JWTPayload> {
  if (!authorizationHeader || !authorizationHeader.startsWith('Bearer ')) {
    throw new Error('Missing bearer token')
  }
  const token = authorizationHeader.slice('Bearer '.length)

  const issuer = env.AUTH0_ISSUER.endsWith('/') ? env.AUTH0_ISSUER : `${env.AUTH0_ISSUER}/`
  const jwksUri = `${issuer}.well-known/jwks.json`
  const JWKS = createRemoteJWKSet(new URL(jwksUri))

  const { payload } = await jwtVerify(token, JWKS, {
    issuer,
    audience: env.AUTH0_AUDIENCE,
  })

  return payload
}
