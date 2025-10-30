import { readFileSync } from 'fs'
import { join } from 'path'

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

function validateJWK(jwk: JWK): { valid: boolean; errors: string[] } {
  const errors: string[] = []
  
  // Required fields
  if (!jwk.kty) errors.push('Missing kty (key type)')
  if (!jwk.use) errors.push('Missing use')
  if (!jwk.alg) errors.push('Missing alg (algorithm)')
  if (!jwk.kid) errors.push('Missing kid (key ID)')
  if (!jwk.n) errors.push('Missing n (modulus)')
  if (!jwk.e) errors.push('Missing e (exponent)')
  
  // Validate key type
  if (jwk.kty && jwk.kty !== 'RSA') {
    errors.push(`Invalid kty: ${jwk.kty}, expected RSA`)
  }
  
  // Validate use
  if (jwk.use && jwk.use !== 'sig') {
    errors.push(`Invalid use: ${jwk.use}, expected sig`)
  }
  
  // Validate algorithm
  if (jwk.alg && jwk.alg !== 'RS256') {
    errors.push(`Invalid alg: ${jwk.alg}, expected RS256`)
  }
  
  // Validate key operations
  if (jwk.key_ops && !jwk.key_ops.includes('verify')) {
    errors.push('key_ops should include "verify"')
  }
  
  // Validate modulus and exponent format (base64url)
  if (jwk.n && !isValidBase64Url(jwk.n)) {
    errors.push('Invalid n (modulus) format - should be base64url')
  }
  
  if (jwk.e && !isValidBase64Url(jwk.e)) {
    errors.push('Invalid e (exponent) format - should be base64url')
  }
  
  return {
    valid: errors.length === 0,
    errors
  }
}

function isValidBase64Url(str: string): boolean {
  // Base64url uses - and _ instead of + and /
  const base64UrlRegex = /^[A-Za-z0-9_-]+$/
  return base64UrlRegex.test(str)
}

function validateJWKS(jwks: JWKS): { valid: boolean; errors: string[] } {
  const errors: string[] = []
  
  if (!jwks.keys || !Array.isArray(jwks.keys)) {
    errors.push('JWKS must have a "keys" array')
    return { valid: false, errors }
  }
  
  if (jwks.keys.length === 0) {
    errors.push('JWKS keys array is empty')
  }
  
  // Validate each key
  jwks.keys.forEach((key, index) => {
    const keyValidation = validateJWK(key)
    if (!keyValidation.valid) {
      keyValidation.errors.forEach(error => {
        errors.push(`Key ${index}: ${error}`)
      })
    }
  })
  
  // Check for duplicate key IDs
  const keyIds = jwks.keys.map(key => key.kid).filter(Boolean)
  const uniqueKeyIds = new Set(keyIds)
  if (keyIds.length !== uniqueKeyIds.size) {
    errors.push('Duplicate key IDs found')
  }
  
  return {
    valid: errors.length === 0,
    errors
  }
}

async function main() {
  try {
    console.log('🔍 Validating JWKS...')
    
    const jwksPath = join(process.cwd(), 'public', 'jwks.json')
    
    // Read JWKS file
    let jwksContent: string
    try {
      jwksContent = readFileSync(jwksPath, 'utf8')
    } catch (error) {
      console.error(`❌ Failed to read JWKS file: ${jwksPath}`)
      process.exit(1)
    }
    
    // Parse JSON
    let jwks: JWKS
    try {
      jwks = JSON.parse(jwksContent)
    } catch (error) {
      console.error('❌ Invalid JSON in JWKS file')
      process.exit(1)
    }
    
    // Validate JWKS structure
    const validation = validateJWKS(jwks)
    
    if (!validation.valid) {
      console.error('❌ JWKS validation failed:')
      validation.errors.forEach(error => {
        console.error(`  - ${error}`)
      })
      process.exit(1)
    }
    
    console.log('✅ JWKS validation passed!')
    console.log(`📄 File: ${jwksPath}`)
    console.log(`🔑 Keys: ${jwks.keys.length}`)
    
    // Pretty print JWKS
    console.log('\n📋 JWKS Content:')
    console.log(JSON.stringify(jwks, null, 2))
    
    // Display key details
    console.log('\n🔑 Key Details:')
    jwks.keys.forEach((key, index) => {
      console.log(`  Key ${index + 1}:`)
      console.log(`    ID: ${key.kid}`)
      console.log(`    Type: ${key.kty}`)
      console.log(`    Algorithm: ${key.alg}`)
      console.log(`    Use: ${key.use}`)
      console.log(`    Operations: ${key.key_ops?.join(', ') || 'none'}`)
      console.log(`    Modulus (first 20 chars): ${key.n.substring(0, 20)}...`)
      console.log(`    Exponent: ${key.e}`)
    })
    
    console.log('\n🎉 JWKS verification completed successfully!')
    
  } catch (error) {
    console.error('❌ JWKS verification failed:', error)
    process.exit(1)
  }
}

if (require.main === module) {
  main()
}