import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { verifyAuth0AccessToken } from '@/lib/auth0'
import { signToken, createTokenPayload } from '@/lib/jwt'
import { getTenantBySlug, validateTenantExists, getUserTenantMembership } from '@/services/tenants'
import { writeAuditLog } from '@/lib/audit'
import { checkTokenMintRateLimit, getClientIdentifier } from '@/lib/rateLimit'
import { addCORSHeaders, handleCORS } from '@/lib/cors'
import { TokenMintResponse, ApiResponse } from '@/types'
import { env } from '@/lib/env'

const tokenMintSchema = z.object({
  scope: z.string().min(1),
  patientId: z.string().min(1)
})

export async function POST(request: NextRequest): Promise<NextResponse> {
  // Handle CORS
  const corsResponse = handleCORS(request)
  if (corsResponse) return corsResponse
  
  try {
    // Bearer Auth0 access token validation
    let payload
    try {
      payload = await verifyAuth0AccessToken(request.headers.get('authorization') || undefined)
    } catch (e) {
      return NextResponse.json({ success: false, error: 'Invalid bearer token' } as ApiResponse, { status: 401 })
    }
    const actorId = String(payload.sub || '')
    if (!actorId) {
      return NextResponse.json({ success: false, error: 'Invalid subject' } as ApiResponse, { status: 401 })
    }
    
    // Rate limiting - check both IP and user limits
    const clientId = getClientIdentifier(request)
    const rateLimitResult = await checkTokenMintRateLimit(request, actorId)
    
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { success: false, error: 'Rate limit exceeded' } as ApiResponse,
        { status: 429 }
      )
    }
    
    // Parse and validate request body
    const body = await request.json()
    const validatedData = tokenMintSchema.parse(body)
    
    // For bearer flow spec: we do not enforce tenant membership here; scope is trusted from request
    
    // Create and sign token
    const tokenPayload = createTokenPayload(
      actorId,
      validatedData.scope,
      env.PHI_AUDIENCE,
      undefined,
      validatedData.patientId
    )
    
    const token = await signToken(tokenPayload)
    
    // Create audit log
    const auditDetails = JSON.stringify({
      scope: validatedData.scope,
      patientId: validatedData.patientId || null,
      audience: env.PHI_AUDIENCE
    })
    
    await writeAuditLog({
      actorId,
      action: 'token.mint',
      resource: 'jwt',
      ip: clientId,
      userAgent: request.headers.get('user-agent') || undefined,
      details: auditDetails
    })
    
    const response: TokenMintResponse = {
      token,
      expiresIn: env.ACCESS_TTL_SECONDS ?? 300,
      tokenType: 'Bearer'
    }
    
    return addCORSHeaders(
      NextResponse.json({ success: true, data: response } as ApiResponse),
      request.headers.get('origin')
    )
    
  } catch (error) {
    console.error('Token mint error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Invalid request data', message: error.errors[0].message } as ApiResponse,
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { success: false, error: 'Internal server error' } as ApiResponse,
      { status: 500 }
    )
  }
}
