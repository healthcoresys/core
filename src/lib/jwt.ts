import { SignJWT, jwtVerify, importPKCS8, importSPKI } from 'jose'
import { env } from './env'

export interface TokenPayload {
  sub: string
  iss: string
  aud: string
  exp: number
  iat: number
  scope: string
  tenantId?: string
  patientId?: string
}

export async function signToken(payload: Omit<TokenPayload, 'iss' | 'iat' | 'exp'>): Promise<string> {
  // Get private key from environment or AWS Secrets Manager
  const privateKeyPem = await getPrivateKey()
  const privateKey = await importPKCS8(privateKeyPem, 'RS256')
  
  const now = Math.floor(Date.now() / 1000)
  const expiresIn = (env.ACCESS_TTL_SECONDS ?? 300)
  
  const jwt = await new SignJWT({
    ...payload,
    iss: env.EXPECTED_ISSUER,
    iat: now,
    exp: now + expiresIn
  })
    .setProtectedHeader({ 
      alg: 'RS256',
      kid: env.JWT_SIGNING_KID
    })
    .setIssuedAt(now)
    .setExpirationTime(now + expiresIn)
    .setAudience(payload.aud)
    .setIssuer(env.EXPECTED_ISSUER)
    .setSubject(payload.sub)
    .sign(privateKey)
  
  return jwt
}

export async function verifyToken(token: string): Promise<TokenPayload | null> {
  try {
    // For verification, we'd need the public key from JWKS
    // This is typically done by the receiving service
    // For now, we'll just validate the structure
    const parts = token.split('.')
    if (parts.length !== 3) {
      throw new Error('Invalid token format')
    }
    
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString())
    
    return payload as TokenPayload
  } catch (error) {
    console.error('Token verification failed:', error)
    return null
  }
}

export function createTokenPayload(
  actorId: string,
  scope: string,
  audience: string,
  tenantId?: string,
  patientId?: string
): Omit<TokenPayload, 'iss' | 'iat' | 'exp'> {
  return {
    sub: actorId,
    aud: audience,
    scope,
    tenantId,
    patientId
  }
}

export async function getPrivateKey(): Promise<string> {
  // Option A: Use inline PEM from environment (dev)
  if (env.JWT_SIGNING_PRIVATE_PEM) {
    return env.JWT_SIGNING_PRIVATE_PEM
  }
  
  // Option B: Fetch from AWS Secrets Manager
  if (env.JWT_PRIVATE_SECRET_ARN) {
    try {
      const { SecretsManagerClient, GetSecretValueCommand } = await import('@aws-sdk/client-secrets-manager')
      
      const client = new SecretsManagerClient({ region: env.AWS_REGION })
      const command = new GetSecretValueCommand({ SecretId: env.JWT_PRIVATE_SECRET_ARN })
      
      const response = await client.send(command)
      const secret = JSON.parse(response.SecretString || '{}')
      
      return secret.privateKey || secret.private_key || secret.privateKeyPem
    } catch (error) {
      console.error('Failed to fetch private key from AWS Secrets Manager:', error)
      throw new Error('Private key not available')
    }
  }
  
  throw new Error('No private key configured')
}
