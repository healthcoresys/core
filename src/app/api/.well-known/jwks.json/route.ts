import { NextRequest, NextResponse } from 'next/server'
import { readFileSync } from 'fs'
import { join } from 'path'
import { addCORSHeaders, handleCORS } from '@/lib/cors'

export async function GET(request: NextRequest): Promise<NextResponse> {
  // Handle CORS
  const corsResponse = handleCORS(request)
  if (corsResponse) return corsResponse
  
  try {
    // Read JWKS from public directory
    const jwksPath = join(process.cwd(), 'public', 'jwks.json')
    const jwksContent = readFileSync(jwksPath, 'utf8')
    const jwks = JSON.parse(jwksContent)
    
    const response = NextResponse.json(jwks, {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=300, s-maxage=300', // 5 minutes
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    })
    
    return addCORSHeaders(response, request.headers.get('origin'))
  } catch (error) {
    console.error('JWKS endpoint error:', error)
    
    return NextResponse.json(
      { error: 'Failed to retrieve JWKS' },
      { 
        status: 500,
        headers: {
          'Cache-Control': 'no-cache'
        }
      }
    )
  }
}
