// Lightweight env accessor that does not throw at build time.
// Validation happens lazily in route handlers where required.

function num(val: string | undefined, fallback: number): number {
  const n = Number(val)
  return Number.isFinite(n) && n > 0 ? n : fallback
}

export const env = {
  // Public
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || '',

  // Auth0
  AUTH0_ISSUER: process.env.AUTH0_ISSUER || '',
  AUTH0_CLIENT_ID: process.env.AUTH0_CLIENT_ID || '',
  AUTH0_CLIENT_SECRET: process.env.AUTH0_CLIENT_SECRET || '',
  AUTH0_AUDIENCE: process.env.AUTH0_AUDIENCE || '',

  // JWT / AWS
  JWT_SIGNING_KID: process.env.JWT_SIGNING_KID || 'hc-core-key-1',
  JWT_SIGNING_PRIVATE_PEM: process.env.JWT_SIGNING_PRIVATE_PEM,
  AWS_REGION: process.env.AWS_REGION,
  JWT_PRIVATE_SECRET_ARN: process.env.JWT_PRIVATE_SECRET_ARN,
  DB_SECRET_ARN: process.env.DB_SECRET_ARN,

  // PHI
  PHI_AUDIENCE: process.env.PHI_AUDIENCE || process.env.AUDIENCE || 'https://api.corehealth.cloud',
  EXPECTED_ISSUER: process.env.EXPECTED_ISSUER || process.env.ISSUER || 'https://core.healthcore.systems',

  // CORS & Cookies
  ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS || '',
  COOKIE_DOMAIN: process.env.COOKIE_DOMAIN,
  ACCESS_TTL_SECONDS: num(process.env.ACCESS_TTL_SECONDS, 300),

  // Rate limit
  RATE_LIMIT_POINTS: num(process.env.RATE_LIMIT_POINTS, 60),
  RATE_LIMIT_WINDOW: num(process.env.RATE_LIMIT_WINDOW, 60),

  // DB
  DATABASE_URL: process.env.DATABASE_URL || '',

  // Admin
  ADMIN_SANITY_TOKEN: process.env.ADMIN_SANITY_TOKEN || '',

  NODE_ENV: (process.env.NODE_ENV as 'development' | 'production' | 'test') || 'development',
}

export type Env = typeof env
