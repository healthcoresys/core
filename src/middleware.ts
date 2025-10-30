import { NextRequest, NextResponse } from 'next/server'
import { env } from './lib/env'

export function middleware(request: NextRequest) {
  const response = NextResponse.next()
  
  // Security headers
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('X-XSS-Protection', '1; mode=block')
  
  // HSTS (only in production)
  if (env.NODE_ENV === 'production') {
    response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload')
  }
  
  // Permissions Policy
  response.headers.set('Permissions-Policy', 'geolocation=(), microphone=(), camera=(), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=(), ambient-light-sensor=()')
  
  // Content Security Policy
  const allowedOrigins = env.ALLOWED_ORIGINS.split(',').map(o => o.trim()).filter(Boolean)
  const cspOrigins = allowedOrigins.map(origin => origin.replace('*', '')).join(' ')
  
  response.headers.set('Content-Security-Policy', 
    `default-src 'self'; ` +
    `script-src 'self' 'unsafe-inline' https://cdn.auth0.com; ` +
    `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; ` +
    `img-src 'self' data: https:; ` +
    `font-src 'self' https://fonts.gstatic.com; ` +
    `connect-src 'self' https://*.auth0.com https://*.corehealth.cloud ${cspOrigins}; ` +
    `frame-src 'self' https://*.auth0.com; ` +
    `object-src 'none'; ` +
    `base-uri 'self'; ` +
    `form-action 'self'`
  )
  
  // Remove server information
  response.headers.delete('X-Powered-By')
  
  // CORS handling
  const origin = request.headers.get('origin')
  if (origin && allowedOrigins.includes(origin)) {
    response.headers.set('Access-Control-Allow-Origin', origin)
    response.headers.set('Access-Control-Allow-Credentials', 'true')
  }
  
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With')
  response.headers.set('Access-Control-Max-Age', '86400')
  
  // Handle preflight requests
  if (request.method === 'OPTIONS') {
    return new NextResponse(null, { status: 200, headers: response.headers })
  }
  
  // API routes specific headers
  if (request.nextUrl.pathname.startsWith('/api/')) {
    response.headers.set('X-API-Version', '1.0.0')
    response.headers.set('X-Robots-Tag', 'noindex, nofollow')
    
    // Additional security for sensitive endpoints
    if (request.nextUrl.pathname === '/api/tokens/mint' && request.method === 'POST') {
      response.headers.set('X-Content-Type-Options', 'nosniff')
      response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate')
    }
  }
  
  // JWKS endpoint specific headers
  if (request.nextUrl.pathname === '/.well-known/jwks.json') {
    response.headers.set('Cache-Control', 'public, max-age=300, s-maxage=300')
    response.headers.set('Access-Control-Allow-Origin', '*')
  }
  
  // Health check endpoint
  if (request.nextUrl.pathname === '/api/health') {
    response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate')
  }
  
  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
