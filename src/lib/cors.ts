import { NextRequest, NextResponse } from 'next/server'
import { env } from './env'

function getAllowedOrigins(): string[] {
  return env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim()).filter(Boolean)
}

export function corsHeaders(origin?: string | null): Record<string, string> {
  const headers: Record<string, string> = {
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
    'Access-Control-Max-Age': '86400',
  }
  
  const allowedOrigins = getAllowedOrigins()

  // Allow exact origins only (including literal https://.healthcore.systems if provided)
  if (origin && allowedOrigins.includes(origin)) {
    headers['Access-Control-Allow-Origin'] = origin
    headers['Access-Control-Allow-Credentials'] = 'true'
  }
  
  return headers
}

export function handleCORS(request: NextRequest): NextResponse | null {
  const origin = request.headers.get('origin')
  const allowedOrigins = getAllowedOrigins()
  
  // Handle preflight requests
  if (request.method === 'OPTIONS') {
    const headers = corsHeaders(origin)
    return new NextResponse(null, {
      status: 200,
      headers
    })
  }
  
  // Check if origin is allowed for actual requests
  if (origin && !allowedOrigins.includes(origin)) {
    return new NextResponse('CORS policy violation', { status: 403 })
  }
  
  return null
}

export function addCORSHeaders(response: NextResponse, origin?: string | null): NextResponse {
  const headers = corsHeaders(origin)
  
  Object.entries(headers).forEach(([key, value]) => {
    response.headers.set(key, value)
  })
  
  return response
}

export function isOriginAllowed(origin: string): boolean {
  const allowedOrigins = getAllowedOrigins()
  return allowedOrigins.includes(origin)
}
