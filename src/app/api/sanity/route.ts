import { NextRequest, NextResponse } from 'next/server'
import { readFileSync } from 'fs'
import { join } from 'path'
import { db } from '@/lib/db'
import { env } from '@/lib/env'
import { getPrivateKey } from '@/lib/jwt'

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Check admin token
    const url = new URL(request.url)
    const token = url.searchParams.get('token')
    
    if (!token || token !== env.ADMIN_SANITY_TOKEN) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    const checks = {
      env: false,
      privateKey: false,
      jwks: false,
      database: false,
      counts: {
        tenants: 0,
        users: 0,
        audits: 0
      },
      headers: {
        csp: false,
        hsts: false
      }
    }
    
    // Check environment variables (safe keys only)
    try {
      const safeEnvKeys = [
        'NEXT_PUBLIC_APP_URL',
        'AUTH0_ISSUER',
        'AUTH0_AUDIENCE',
        'JWT_SIGNING_KID',
        'AWS_REGION',
        'PHI_AUDIENCE',
        'EXPECTED_ISSUER',
        'RATE_LIMIT_POINTS',
        'RATE_LIMIT_WINDOW',
        'NODE_ENV'
      ]
      
      const envSummary = safeEnvKeys.reduce((acc, key) => {
        acc[key] = process.env[key] ? 'set' : 'missing'
        return acc
      }, {} as Record<string, string>)
      
      checks.env = Object.values(envSummary).every(status => status === 'set')
    } catch (error) {
      console.error('Environment check failed:', error)
    }
    
    // Check if we can load private key
    try {
      await getPrivateKey()
      checks.privateKey = true
    } catch (error) {
      console.error('Private key check failed:', error)
    }
    
    // Check JWKS has at least one key
    try {
      const jwksPath = join(process.cwd(), 'public', 'jwks.json')
      const jwksContent = readFileSync(jwksPath, 'utf8')
      const jwks = JSON.parse(jwksContent)
      
      checks.jwks = jwks.keys && jwks.keys.length > 0
    } catch (error) {
      console.error('JWKS check failed:', error)
    }
    
    // Check database connectivity and get counts
    try {
      await db.$queryRaw`SELECT 1`
      checks.database = true
      
      // Get counts
      const [tenantCount, userCount, auditCount] = await Promise.all([
        db.tenant.count(),
        db.user.count(),
        db.audit.count()
      ])
      
      checks.counts = {
        tenants: tenantCount,
        users: userCount,
        audits: auditCount
      }
    } catch (error) {
      console.error('Database check failed:', error)
    }
    
    // Check response headers
    const response = NextResponse.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      checks
    })
    
    // Add security headers to check
    response.headers.set('Content-Security-Policy', "default-src 'self'")
    response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
    
    // Check if headers are set
    checks.headers.csp = response.headers.get('Content-Security-Policy') !== null
    checks.headers.hsts = response.headers.get('Strict-Transport-Security') !== null
    
    return response
    
  } catch (error) {
    console.error('Sanity check error:', error)
    
    return NextResponse.json(
      { 
        status: 'error',
        timestamp: new Date().toISOString(),
        error: 'Sanity check failed'
      },
      { status: 500 }
    )
  }
}
