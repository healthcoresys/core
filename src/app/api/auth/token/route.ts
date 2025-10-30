import { NextRequest, NextResponse } from 'next/server'
import { addCORSHeaders, handleCORS } from '@/lib/cors'
import { readSessionCookie } from '@/lib/session'
import { createTokenPayload, signToken } from '@/lib/jwt'
import { env } from '@/lib/env'

export async function POST(request: NextRequest): Promise<NextResponse> {
  const cors = handleCORS(request)
  if (cors) return cors

  const session = readSessionCookie()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const url = new URL(request.url)
  const mode = url.searchParams.get('mode') ?? 'me'
  const patientId = url.searchParams.get('patient_id') ?? undefined
  const orgId = url.searchParams.get('org_id') ?? undefined

  const ttl = env.ACCESS_TTL_SECONDS ?? 600
  const audience = env.PHI_AUDIENCE
  const issuer = env.EXPECTED_ISSUER

  let sub = session.userId
  let role = 'patient'
  let scope = 'phi:self:read phi:self:write phi:files:self'

  if (mode === 'pro') {
    role = 'clinician'
    scope = 'phi:patients:read phi:modules:read phi:modules:write phi:files:read phi:files:write'
  } else if (mode === 'me') {
    if (patientId) {
      sub = patientId
    }
  }

  const payload = createTokenPayload(sub, scope, audience, orgId ?? undefined, mode === 'me' ? patientId : undefined)
  // Override exp via signToken by adjusting env ACCESS_TTL_SECONDS downstream if needed
  const token = await signToken(payload)

  const res = NextResponse.json({ access_token: token, token_type: 'Bearer', expires_in: ttl, iss: issuer, aud: audience, role, org_id: orgId ?? null })
  return addCORSHeaders(res, request.headers.get('origin'))
}


