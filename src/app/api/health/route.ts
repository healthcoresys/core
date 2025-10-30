import { NextRequest, NextResponse } from 'next/server'
import { env } from '@/lib/env'

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const response = {
      ok: true,
      status: 'ok',
      region: env.AWS_REGION ?? 'n/a',
      time: new Date().toISOString()
    }
    
    return NextResponse.json(response, {
      status: 200,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    })
  } catch (error) {
    console.error('Health check error:', error)
    
    const response = {
      ok: false,
      status: 'error',
      region: env.AWS_REGION ?? 'n/a',
      time: new Date().toISOString(),
      error: 'Health check failed'
    }
    
    return NextResponse.json(response, { status: 503 })
  }
}
