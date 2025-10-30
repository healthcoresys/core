import { NextRequest, NextResponse } from 'next/server'
import { readSessionCookie } from '@/lib/session'
import { addCORSHeaders, handleCORS } from '@/lib/cors'

export async function GET(request: NextRequest): Promise<NextResponse> {
  const cors = handleCORS(request)
  if (cors) return cors

  const session = readSessionCookie()
  if (!session) {
    return NextResponse.json({ authenticated: false }, { status: 401 })
  }
  const res = NextResponse.json({ authenticated: true, user: session })
  return addCORSHeaders(res, request.headers.get('origin'))
}


