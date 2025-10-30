import { createMocks } from 'node-mocks-http'
import { NextRequest } from 'next/server'

export function createTestRequest(
  method: string = 'GET',
  url: string = '/',
  body?: any,
  headers: Record<string, string> = {}
): NextRequest {
  const { req, res } = createMocks({
    method,
    url,
    body,
    headers: {
      'content-type': 'application/json',
      ...headers
    }
  })

  return req as NextRequest
}

export function createTestResponse() {
  const { res } = createMocks()
  return res
}

export const testClient = {
  get: async (path: string, headers: Record<string, string> = {}) => {
    const req = createTestRequest('GET', path, undefined, headers)
    // Mock the actual API route handler
    // This would need to be implemented based on your testing framework
    return { status: 200, body: {}, headers: {} }
  },
  
  post: async (path: string, data?: any, headers: Record<string, string> = {}) => {
    const req = createTestRequest('POST', path, data, headers)
    // Mock the actual API route handler
    return { status: 200, body: {}, headers: {} }
  },
  
  options: async (path: string, headers: Record<string, string> = {}) => {
    const req = createTestRequest('OPTIONS', path, undefined, headers)
    // Mock the actual API route handler
    return { status: 200, body: {}, headers: {} }
  }
}

