import { writeFileSync, readFileSync, mkdirSync } from 'fs'
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

interface JWKS {
  keys: JWK[]
}

async function generateNewKeyPair(): Promise<{ privateKey: string; jwk: JWK }> {
  const { publicKey, privateKey } = await joseGenerateKeyPair('RS256', { modulusLength: 2048 })

  const privatePem = await exportPKCS8(privateKey)
  const jwk = await exportJWK(publicKey)
  
  // Generate new key ID with timestamp
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

async function uploadToAWSSecretsManager(privateKey: string, keyId: string): Promise<void> {
  try {
    const { SecretsManagerClient, CreateSecretCommand } = await import('@aws-sdk/client-secrets-manager')
    
    const client = new SecretsManagerClient({ 
      region: process.env.AWS_REGION || 'eu-north-1' 
    })
    
    const secretName = `prod/broker/jwt-private-${keyId}`
    const secretValue = JSON.stringify({
      privateKey,
      keyId,
      createdAt: new Date().toISOString()
    })
    
    const command = new CreateSecretCommand({
      Name: secretName,
      Description: `JWT private key for Core Systems Broker - ${keyId}`,
      SecretString: secretValue
    })
    
    await client.send(command)
    console.log(`✅ Private key uploaded to AWS Secrets Manager: ${secretName}`)
  } catch (error) {
    console.error('❌ Failed to upload to AWS Secrets Manager:', error)
    console.log('💡 You can upload manually later or check your AWS credentials')
  }
}

async function main() {
  try {
    console.log('🔄 Starting JWT key rotation...')
    
    // Generate new key pair
    console.log('📝 Generating new RSA 2048 keypair...')
    const { privateKey, jwk } = await generateNewKeyPair()
    
    // Read existing JWKS
    const jwksPath = join(process.cwd(), 'public', 'jwks.json')
    let existingJwks: JWKS = { keys: [] }
    
    try {
      const jwksContent = readFileSync(jwksPath, 'utf8')
      existingJwks = JSON.parse(jwksContent)
    } catch (error) {
      console.log('📄 No existing JWKS found, creating new one')
    }
    
    // Append new key to existing keys
    existingJwks.keys.push(jwk)
    
    // Write updated JWKS
    writeFileSync(jwksPath, JSON.stringify(existingJwks, null, 2))
    
    // Write new private key to secrets directory
    const secretsDir = join(process.cwd(), 'secrets')
    try {
      mkdirSync(secretsDir, { recursive: true })
    } catch (error) {
      // Directory might already exist
    }
    
    writeFileSync(join(secretsDir, `jwt-private-key-${jwk.kid}.pem`), privateKey)
    
    // Generate environment update
    const envUpdate = `# Updated JWT Keys - ${new Date().toISOString()}
JWT_SIGNING_KID="${jwk.kid}"
JWT_SIGNING_PRIVATE_PEM="${privateKey.replace(/\n/g, '\\n')}"
EXPECTED_ISSUER="https://core.healthcore.systems"
PHI_AUDIENCE="https://api.corehealth.cloud"

# AWS Secrets Manager (optional)
AWS_REGION="eu-north-1"
JWT_PRIVATE_SECRET_ARN="arn:aws:secretsmanager:eu-north-1:ACCOUNT:secret:prod/broker/jwt-private-${jwk.kid}"
`
    
    writeFileSync(join(process.cwd(), '.env.jwt.updated'), envUpdate)
    
    // Optionally upload to AWS Secrets Manager
    if (process.env.AWS_REGION && process.env.AWS_ACCESS_KEY_ID) {
      console.log('☁️ Uploading private key to AWS Secrets Manager...')
      await uploadToAWSSecretsManager(privateKey, jwk.kid)
    } else {
      console.log('⚠️ AWS credentials not found, skipping Secrets Manager upload')
    }
    
    console.log('✅ Key rotation completed successfully!')
    console.log(`🔑 New Key ID: ${jwk.kid}`)
    console.log(`📄 JWKS updated: ${jwksPath}`)
    console.log(`📁 Private key saved: ${join(secretsDir, `jwt-private-key-${jwk.kid}.pem`)}`)
    console.log(`📝 Environment update saved to: .env.jwt.updated`)
    console.log('\n⚠️  Next steps:')
    console.log('1. Update your environment variables with the new keys')
    console.log('2. Restart your application')
    console.log('3. Verify the new JWKS endpoint is working')
    console.log('4. Monitor for any authentication issues')
    console.log('5. Consider deprecating old keys after verification')
    
  } catch (error) {
    console.error('❌ Key rotation failed:', error)
    process.exit(1)
  }
}

if (require.main === module) {
  main()
}