import { env } from './env'

type Bucket = { count: number; resetAt: number }
const buckets = new Map<string, Bucket>()

export async function checkRateLimit(identifier: string): Promise<{
  success: boolean
  limit: number
  remaining: number
  reset: number
}> {
  const limit = env.RATE_LIMIT_POINTS
  const windowMs = env.RATE_LIMIT_WINDOW * 1000
  const now = Date.now()

  const b = buckets.get(identifier) || { count: 0, resetAt: now + windowMs }
  if (now > b.resetAt) {
    b.count = 0
    b.resetAt = now + windowMs
  }
  b.count++
  buckets.set(identifier, b)

  return {
    success: b.count <= limit,
    limit,
    remaining: Math.max(0, limit - b.count),
    reset: b.resetAt,
  }
}

export function getClientIdentifier(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')
  const realIp = request.headers.get('x-real-ip')
  const cfConnectingIp = request.headers.get('cf-connecting-ip')
  return forwarded?.split(',')[0]?.trim() || realIp || cfConnectingIp || 'unknown'
}

export async function checkTokenMintRateLimit(
  request: Request,
  userId?: string
): Promise<{
  success: boolean
  limit: number
  remaining: number
  reset: number
}> {
  const clientId = getClientIdentifier(request)
  const ip = await checkRateLimit(`token-mint-ip:${clientId}`)
  if (!ip.success) return ip
  if (userId) {
    const user = await checkRateLimit(`token-mint-user:${userId}`)
    if (!user.success) return user
    return {
      success: true,
      limit: Math.min(ip.limit, user.limit),
      remaining: Math.min(ip.remaining, user.remaining),
      reset: Math.max(ip.reset, user.reset),
    }
  }
  return ip
}
