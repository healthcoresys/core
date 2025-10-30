# API Examples

## Token Minting

### Request
```bash
POST /api/tokens/mint
Authorization: Bearer <session cookie via NextAuth>
Content-Type: application/json

{
  "audience": "https://api.corehealth.cloud",
  "scope": "read:file write:file",
  "patientId": "coreid-123",
  "tenantSlug": "acme-clinic"
}
```

### Response
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJSUzI1NiIsImtpZCI6...",
    "expiresIn": 300,
    "tokenType": "Bearer"
  }
}
```

## JWKS Endpoint

### Request
```bash
GET /.well-known/jwks.json
```

### Response
```json
{
  "keys": [
    {
      "kty": "RSA",
      "kid": "hc-core-key-1",
      "use": "sig",
      "alg": "RS256",
      "n": "...",
      "e": "AQAB"
    }
  ]
}
```

## Health Check

### Request
```bash
GET /api/health
```

### Response
```json
{
  "ok": true,
  "status": "ok",
  "region": "eu-north-1",
  "time": "2024-01-01T12:00:00.000Z"
}
```

## Sanity Check

### Request
```bash
GET /api/sanity?token=ADMIN_SANITY_TOKEN
```

### Response
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "checks": {
    "env": true,
    "privateKey": true,
    "jwks": true,
    "database": true,
    "counts": {
      "tenants": 5,
      "users": 12,
      "audits": 150
    },
    "headers": {
      "csp": true,
      "hsts": true
    }
  }
}
```

