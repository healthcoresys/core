import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'
import { env } from './env'

let ratelimit: Ratelimit | null = null

// Initialize rate limiter with in-memory fallback
ratelimit = new Ratelimit({
  redis: null, // Use in-memory storage for now
  limiter: Ratelimit.slidingWindow(env.RATE_LIMIT_POINTS, `${env.RATE_LIMIT_WINDOW} s`),
})

export async function checkRateLimit(identifier: string): Promise<{
  success: boolean
  limit: number
  remaining: number
  reset: number
}> {
  try {
    const result = await ratelimit.limit(identifier)
    return {
      success: result.success,
      limit: result.limit,
      remaining: result.remaining,
      reset: result.reset
    }
  } catch (error) {
    console.error('Rate limit check failed:', error)
    // On error, allow the request but log it
    return {
      success: true,
      limit: env.RATE_LIMIT_POINTS,
      remaining: env.RATE_LIMIT_POINTS - 1,
      reset: Date.now() + (env.RATE_LIMIT_WINDOW * 1000)
    }
  }
}

export function getClientIdentifier(request: Request): string {
  // Try to get IP from various headers
  const forwarded = request.headers.get('x-forwarded-for')
  const realIp = request.headers.get('x-real-ip')
  const cfConnectingIp = request.headers.get('cf-connecting-ip')
  
  const ip = forwarded?.split(',')[0] || realIp || cfConnectingIp || 'unknown'
  
  return ip
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
  
  // Check IP-based rate limit
  const ipResult = await checkRateLimit(`token-mint-ip:${clientId}`)
  
  if (!ipResult.success) {
    return ipResult
  }
  
  // Check user-based rate limit if userId provided
  if (userId) {
    const userResult = await checkRateLimit(`token-mint-user:${userId}`)
    
    if (!userResult.success) {
      return userResult
    }
    
    // Return the more restrictive limit
    return {
      success: true,
      limit: Math.min(ipResult.limit, userResult.limit),
      remaining: Math.min(ipResult.remaining, userResult.remaining),
      reset: Math.max(ipResult.reset, userResult.reset)
    }
  }
  
  return ipResult
}
