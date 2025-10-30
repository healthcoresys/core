import { z } from 'zod'

const envSchema = z.object({
  // Public base
  NEXT_PUBLIC_APP_URL: z.string().url(),
  
  // Auth0 Configuration
  AUTH0_ISSUER: z.string().url(),
  AUTH0_CLIENT_ID: z.string().min(1),
  AUTH0_CLIENT_SECRET: z.string().min(1),
  AUTH0_AUDIENCE: z.string().url(),
  
  // JWT Configuration
  JWT_SIGNING_KID: z.string().min(1).optional(),
  JWT_SIGNING_PRIVATE_PEM: z.string().min(1).optional(),
  AWS_REGION: z.string().optional(),
  JWT_PRIVATE_SECRET_ARN: z.string().optional(),
  
  // PHI audience
  PHI_AUDIENCE: z.string().url().optional(),
  EXPECTED_ISSUER: z.string().url().optional(),
  
  // CORS & Cookies
  ALLOWED_ORIGINS: z.string(),
  COOKIE_DOMAIN: z.string().optional(),
  ACCESS_TTL_SECONDS: z.string().transform(Number).optional(),

  // Aliases support (optional variables from alternate spec)
  ISSUER: z.string().url().optional(),
  AUDIENCE: z.string().url().optional(),
  RSA_PRIVATE_KEY_PEM: z.string().optional(),
  
  // Rate limiting
  RATE_LIMIT_POINTS: z.string().transform(Number).default('60'),
  RATE_LIMIT_WINDOW: z.string().transform(Number).default('60'),
  
  // Database
  DATABASE_URL: z.string().url(),
  
  // Admin
  ADMIN_SANITY_TOKEN: z.string().min(32),
  
  // Environment
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
})

const parsed = envSchema.parse(process.env)

// Normalize aliases for ISSUER/AUDIENCE and private key
export const env = {
  ...parsed,
  EXPECTED_ISSUER: parsed.EXPECTED_ISSUER ?? parsed.ISSUER ?? 'https://core.healthcore.systems',
  PHI_AUDIENCE: parsed.PHI_AUDIENCE ?? parsed.AUDIENCE ?? 'https://api.corehealth.cloud',
  JWT_SIGNING_PRIVATE_PEM: parsed.JWT_SIGNING_PRIVATE_PEM ?? parsed.RSA_PRIVATE_KEY_PEM,
  JWT_SIGNING_KID: parsed.JWT_SIGNING_KID ?? 'hc-core-key-1',
  ACCESS_TTL_SECONDS: parsed.ACCESS_TTL_SECONDS ?? 300,
}

export type Env = z.infer<typeof envSchema>
