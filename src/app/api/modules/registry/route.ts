import { NextRequest, NextResponse } from 'next/server'
import { handleCORS, addCORSHeaders } from '@/lib/cors'
import { db } from '@/lib/db'

export async function GET(request: NextRequest): Promise<NextResponse> {
  const cors = handleCORS(request)
  if (cors) return cors

  // Base registry seeded elsewhere; return keys and kinds
  try {
    const modules = await db.moduleToggle.findMany({
      select: { moduleKey: true, tenantId: true, enabled: true }
    })
    const res = NextResponse.json({ modules })
    return addCORSHeaders(res, request.headers.get('origin'))
  } catch (e) {
    // Fallback static list if DB unavailable
    const res = NextResponse.json({
      modules: [
        { key: 'billing', kind: 'billing' },
        { key: 'intake', kind: 'org' },
        { key: 'scheduling', kind: 'org' },
        { key: 'labs', kind: 'org' },
        { key: 'pharmacy', kind: 'org' },
        { key: 'site-builder', kind: 'site' },
        { key: 'vendors', kind: 'vendor' }
      ]
    })
    return addCORSHeaders(res, request.headers.get('origin'))
  }
}


