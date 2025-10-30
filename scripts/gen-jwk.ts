import { writeFileSync, mkdirSync } from 'fs'
import { join } from 'path'
import { exportJWK, exportPKCS8, generateKeyPair as joseGenerateKeyPair } from 'jose'

interface JWK {
  kty: string
  use: string
  key_ops: string[]
  alg: string
  kid: string
  n: string
  e: string
}

async function generateRSAKeyPair(): Promise<{ privateKey: string; jwk: JWK }> {
  const { publicKey, privateKey } = await joseGenerateKeyPair('RS256', { modulusLength: 2048 })

  // Convert keys using jose
  const privatePem = await exportPKCS8(privateKey)
  const jwk = await exportJWK(publicKey)
  
  // Generate key ID with timestamp
  const keyId = `hc-core-key-${Date.now()}`
  
  const jwkWithKid: JWK = {
    kty: jwk.kty || 'RSA',
    use: 'sig',
    key_ops: ['verify'],
    alg: 'RS256',
    kid: keyId,
    n: jwk.n || '',
    e: jwk.e || ''
  }

  return {
    privateKey: privatePem,
    jwk: jwkWithKid
  }
}

async function main() {
  try {
    console.log('🔑 Generating RSA 2048 keypair with jose...')
    
    const { privateKey, jwk } = await generateRSAKeyPair()
    
    // Ensure directories exist
    const secretsDir = join(process.cwd(), 'secrets')
    const publicDir = join(process.cwd(), 'public')
    
    try {
      mkdirSync(secretsDir, { recursive: true })
    } catch (error) {
      // Directory might already exist
    }
    
    try {
      mkdirSync(publicDir, { recursive: true })
    } catch (error) {
      // Directory might already exist
    }
    
    // Write private key to secrets directory
    writeFileSync(join(secretsDir, 'jwt-private-key.pem'), privateKey)
    
    // Write JWKS to public directory
    const jwks = { keys: [jwk] }
    writeFileSync(join(publicDir, 'jwks.json'), JSON.stringify(jwks, null, 2))
    
    // Generate .env template
    const envTemplate = `# Generated JWT Keys
JWT_SIGNING_KID="${jwk.kid}"
JWT_SIGNING_PRIVATE_PEM="${privateKey.replace(/\n/g, '\\n')}"
EXPECTED_ISSUER="https://core.healthcore.systems"
PHI_AUDIENCE="https://api.corehealth.cloud"
`
    
    writeFileSync(join(process.cwd(), '.env.jwt'), envTemplate)
    
    console.log('✅ Key generation completed!')
    console.log(`📁 Private key saved to: ${join(secretsDir, 'jwt-private-key.pem')}`)
    console.log(`📄 JWKS saved to: ${join(publicDir, 'jwks.json')}`)
    console.log(`🔑 Key ID: ${jwk.kid}`)
    console.log(`📝 Environment template saved to: .env.jwt`)
    console.log('\n⚠️  Remember to:')
    console.log('1. Copy the JWT keys to your .env file')
    console.log('2. Add the private key to AWS Secrets Manager for production')
    console.log('3. Verify the JWKS endpoint is accessible')
    
  } catch (error) {
    console.error('❌ Key generation failed:', error)
    process.exit(1)
  }
}

if (require.main === module) {
  main()
}