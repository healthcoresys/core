import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { handleCORS, addCORSHeaders } from '@/lib/cors'
import { setSessionCookie } from '@/lib/session'

const bodySchema = z.object({
  email: z.string().email(),
  userId: z.string().optional(),
})

export async function POST(request: NextRequest): Promise<NextResponse> {
  const cors = handleCORS(request)
  if (cors) return cors

  try {
    const data = bodySchema.parse(await request.json())
    const userId = data.userId ?? data.email

    setSessionCookie({ userId, email: data.email })

    const res = NextResponse.json({ success: true })
    return addCORSHeaders(res, request.headers.get('origin'))
  } catch (err) {
    return NextResponse.json({ success: false, error: 'Invalid request' }, { status: 400 })
  }
}


