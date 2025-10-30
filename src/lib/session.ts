import { cookies } from 'next/headers'
import { env } from './env'

const SESSION_COOKIE = 'hc_session'

export interface SessionData {
  userId: string
  email?: string
}

export function setSessionCookie(session: SessionData) {
  const ttl = env.ACCESS_TTL_SECONDS ?? 300
  const cookieStore = cookies()
  cookieStore.set(SESSION_COOKIE, Buffer.from(JSON.stringify(session)).toString('base64url'), {
    httpOnly: true,
    secure: true,
    sameSite: 'none',
    domain: env.COOKIE_DOMAIN,
    maxAge: ttl,
    path: '/',
  })
}

export function readSessionCookie(): SessionData | null {
  const cookieStore = cookies()
  const raw = cookieStore.get(SESSION_COOKIE)?.value
  if (!raw) return null
  try {
    return JSON.parse(Buffer.from(raw, 'base64url').toString('utf8')) as SessionData
  } catch {
    return null
  }
}

export function clearSessionCookie() {
  const cookieStore = cookies()
  cookieStore.set(SESSION_COOKIE, '', {
    httpOnly: true,
    secure: true,
    sameSite: 'none',
    domain: env.COOKIE_DOMAIN,
    maxAge: 0,
    path: '/',
  })
}


