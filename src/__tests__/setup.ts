import { beforeAll, afterAll } from 'vitest'

// Mock environment variables for testing
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test_db'
process.env.AUTH0_SECRET = 'test-secret-32-chars-long'
process.env.AUTH0_BASE_URL = 'http://localhost:3000'
process.env.AUTH0_ISSUER_BASE_URL = 'https://test.eu.auth0.com'
process.env.AUTH0_CLIENT_ID = 'test-client-id'
process.env.AUTH0_CLIENT_SECRET = 'test-client-secret'
process.env.JWT_PRIVATE_KEY = '-----BEGIN PRIVATE KEY-----\ntest\n-----END PRIVATE KEY-----'
process.env.JWT_PUBLIC_KEY = '-----BEGIN PUBLIC KEY-----\ntest\n-----END PUBLIC KEY-----'
process.env.JWT_KEY_ID = 'test-key-1'
process.env.JWT_ISSUER = 'https://core.healthcore.systems'
process.env.JWT_AUDIENCE = 'https://api.corehealth.cloud'
process.env.NODE_ENV = 'test'

beforeAll(async () => {
  // Setup test database
  console.log('Setting up test environment...')
})

afterAll(async () => {
  // Cleanup test database
  console.log('Cleaning up test environment...')
})

