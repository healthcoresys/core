import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { testClient } from './test-utils'

describe('API Routes', () => {
  describe('GET /api/health', () => {
    it('should return health status', async () => {
      const response = await testClient.get('/api/health')
      
      expect(response.status).toBe(200)
      expect(response.body).toHaveProperty('status')
      expect(response.body).toHaveProperty('timestamp')
      expect(response.body).toHaveProperty('services')
      expect(['healthy', 'unhealthy']).toContain(response.body.status)
    })
  })

  describe('GET /api/sanity', () => {
    it('should return sanity check results', async () => {
      const response = await testClient.get('/api/sanity')
      
      expect(response.status).toBe(200)
      expect(response.body).toHaveProperty('status')
      expect(response.body).toHaveProperty('checks')
      expect(response.body).toHaveProperty('timestamp')
      expect(['ok', 'error']).toContain(response.body.status)
    })
  })

  describe('GET /.well-known/jwks.json', () => {
    it('should return JWKS', async () => {
      const response = await testClient.get('/.well-known/jwks.json')
      
      expect(response.status).toBe(200)
      expect(response.body).toHaveProperty('keys')
      expect(Array.isArray(response.body.keys)).toBe(true)
      
      if (response.body.keys.length > 0) {
        const key = response.body.keys[0]
        expect(key).toHaveProperty('kty')
        expect(key).toHaveProperty('kid')
        expect(key).toHaveProperty('alg')
        expect(key).toHaveProperty('use')
      }
    })
  })

  describe('POST /api/tokens/mint', () => {
    it('should require authentication', async () => {
      const response = await testClient.post('/api/tokens/mint')
        .send({
          audience: 'https://api.corehealth.cloud',
          scopes: ['read:patients']
        })
      
      expect(response.status).toBe(401)
      expect(response.body).toHaveProperty('success', false)
      expect(response.body).toHaveProperty('error')
    })

    it('should validate request body', async () => {
      const response = await testClient.post('/api/tokens/mint')
        .send({
          audience: 'invalid-url',
          scopes: []
        })
      
      expect(response.status).toBe(400)
      expect(response.body).toHaveProperty('success', false)
      expect(response.body).toHaveProperty('error')
    })
  })
})

describe('Security Headers', () => {
  it('should include security headers', async () => {
    const response = await testClient.get('/api/health')
    
    expect(response.headers['x-frame-options']).toBe('DENY')
    expect(response.headers['x-content-type-options']).toBe('nosniff')
    expect(response.headers['referrer-policy']).toBe('strict-origin-when-cross-origin')
    expect(response.headers['x-xss-protection']).toBe('1; mode=block')
  })
})

describe('CORS', () => {
  it('should handle preflight requests', async () => {
    const response = await testClient.options('/api/tokens/mint')
      .set('Origin', 'https://core.healthcore.systems')
    
    expect(response.status).toBe(200)
    expect(response.headers['access-control-allow-origin']).toBe('https://core.healthcore.systems')
  })

  it('should reject unauthorized origins', async () => {
    const response = await testClient.post('/api/tokens/mint')
      .set('Origin', 'https://malicious-site.com')
      .send({
        audience: 'https://api.corehealth.cloud',
        scopes: ['read:patients']
      })
    
    expect(response.status).toBe(403)
  })
})

