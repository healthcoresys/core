# Core Systems Broker

A secure authentication and JWT token management service for Core Health Systems. This service provides RS256 JWT signing, Auth0 EU integration, tenant-based access control, and comprehensive audit logging.

## Features

- 🔐 **Auth0 EU Integration** - Secure user authentication
- 🎫 **JWT Token Management** - RS256 signed tokens with short TTL
- 🏢 **Multi-tenant Support** - Organization-based access control
- 📊 **Audit Logging** - Comprehensive activity tracking with PHI redaction
- 🛡️ **Security Headers** - Helmet-like protection
- 🚦 **Rate Limiting** - IP and user-based request throttling
- 🌐 **CORS Protection** - Configurable origin allowlist
- 🔄 **Key Rotation** - Automated JWT key management
- 📡 **JWKS Endpoint** - Public key verification service

## Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL database
- Auth0 account (EU region)

### Installation

```bash
# Clone repository
git clone <repository-url>
cd core-systems-broker

# Install dependencies
npm install

# Setup environment
cp env.example .env.local
# Edit .env.local with your configuration

# Generate JWT keys
npm run keys:gen

# Setup database
npm run db:migrate

# Seed database with test data
npm run db:seed

# Start development server
npm run dev
```

### Environment Configuration

```bash
# Public base
NEXT_PUBLIC_APP_URL=https://core.healthcore.systems

# Auth0 (EU tenant)
AUTH0_ISSUER=https://healthcoreme.eu.auth0.com/
AUTH0_CLIENT_ID=your-client-id
AUTH0_CLIENT_SECRET=your-client-secret
AUTH0_AUDIENCE=https://core.healthcore.systems

# Broker JWT signing
JWT_SIGNING_KID=hc-core-key-1
JWT_SIGNING_PRIVATE_PEM="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"

# PHI audience we mint for
PHI_AUDIENCE=https://api.corehealth.cloud
EXPECTED_ISSUER=https://core.healthcore.systems

# CORS allowlist (CSV)
ALLOWED_ORIGINS=https://healthcore.me,https://*.healthcore.systems

# Rate limit
RATE_LIMIT_POINTS=60
RATE_LIMIT_WINDOW=60

# Database (no PHI)
DATABASE_URL=postgresql://broker_user:pwd@host:5432/healthcore_broker

# Admin sanity
ADMIN_SANITY_TOKEN=change-me-long-random
```

## Database Setup

### Generate Prisma Client
```bash
npm run db:generate
```

### Run Migrations
```bash
# Development
npm run db:migrate

# Production
npm run db:deploy
```

### Seed Test Data
```bash
npm run db:seed
```

This creates:
- Test tenants (enterprise, clinic, lab)
- Test users with Auth0 sub IDs
- User-tenant memberships with roles
- Enabled modules for all tenants
- Sample audit entries

## Key Management

### Generate Initial Keys
```bash
npm run keys:gen
```

This creates:
- `secrets/jwt-private-key.pem` - Private key
- `public/jwks.json` - Public JWKS
- `.env.jwt` - Environment template

### Rotate Keys
```bash
npm run keys:rotate
```

This:
- Generates new RSA 2048 keypair
- Appends to existing JWKS
- Optionally uploads to AWS Secrets Manager
- Creates environment update template

### Verify JWKS
```bash
npm run jwks:verify
```

This validates:
- JWKS structure and required fields
- Key format and algorithms
- Duplicate key IDs
- Base64url encoding

## API Endpoints

### Authentication & Tokens

- `GET /.well-known/jwks.json` - Public key endpoint for verification
- `POST /auth/login` - Create session cookie (HttpOnly; Secure; SameSite=None; Domain from env)
- `GET /auth/me` - Current user from session cookie
- `POST /auth/token?mode=me|pro&patient_id=&org_id=` - Mint RS256 token for PHI API
- `POST /api/tokens/mint` - Legacy mint endpoint (if enabled)

### Health & Monitoring

- `GET /api/health` - Service health status
- `GET /api/sanity` - Configuration validation (requires admin token)

### Example Token Request

```bash
curl -X POST https://core.healthcore.systems/api/tokens/mint \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <auth0-token>" \
  -d '{
    "audience": "https://api.corehealth.cloud",
    "scope": "read:file write:file read:record write:record",
    "patientId": "patient-123",
    "tenantSlug": "downtown-clinic"
  }'
```

### Example Response

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

### New Auth Flow Examples

```bash
# 1) Get JWKS
curl -s https://core.healthcore.systems/.well-known/jwks.json | jq .

# 2) Login (creates session cookie)
curl -i -X POST -c cookies.txt https://core.healthcore.systems/auth/login \
  -H 'Content-Type: application/json' -d '{"email":"demo@healthcore.me"}'

# 3) Read current user
curl -s -b cookies.txt https://core.healthcore.systems/auth/me | jq .

# 4) Mint professional token
curl -s -X POST -b cookies.txt \
  'https://core.healthcore.systems/auth/token?mode=pro&org_id=clinic_A' | jq .

# 5) Mint patient token
curl -s -X POST -b cookies.txt \
  'https://core.healthcore.systems/auth/token?mode=me&patient_id=coreid-123&org_id=clinic_A' | jq .
```

## Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Auth0 EU      │    │  Core Systems     │    │  PHI Services  │
│                 │    │     Broker        │    │                 │
│ • User Auth     │───▶│ • JWT Signing    │───▶│ • API Access    │
│ • Tenant Claims │    │ • Scope Validation│    │ • Token Verify  │
│ • Role Mapping  │    │ • Audit Logging  │    │ • PHI Access    │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                │
                                ▼
                       ┌──────────────────┐
                       │   PostgreSQL     │
                       │                  │
                       │ • Tenants        │
                       │ • Users          │
                       │ • Audit Logs     │
                       │ • Module Toggles │
                       └──────────────────┘
```

## Security Features

### Authentication Flow

1. User authenticates with Auth0 EU
2. Broker validates tenant access
3. Module permissions checked
4. JWT token issued with scopes
5. Audit log recorded

### Token Structure

```json
{
  "sub": "auth0|user-id",
  "iss": "https://core.healthcore.systems",
  "aud": "https://api.corehealth.cloud",
  "exp": 1640995200,
  "iat": 1640994900,
  "scope": "read:file write:file read:record write:record",
  "tenantId": "tenant-123",
  "patientId": "patient-123"
}
```

### Security Headers

- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `Strict-Transport-Security: max-age=31536000` (production)
- `Content-Security-Policy: default-src 'self'`
- `Permissions-Policy: geolocation=(), microphone=(), camera=()`

### Rate Limiting

- **IP-based**: 60 requests/minute per IP
- **User-based**: 60 requests/minute per user
- **Combined**: Uses most restrictive limit

### Audit Logging

- **PHI Redaction**: Automatically redacts SSN, email, phone, patient IDs
- **Sensitive Keys**: Redacts password, secret, token, key fields
- **Comprehensive**: All token operations tracked

## Development

### Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run test         # Run test suite
npm run db:generate  # Generate Prisma client
npm run db:migrate   # Run database migrations
npm run db:deploy    # Deploy migrations (production)
npm run db:seed      # Seed test data
npm run keys:gen     # Generate initial JWT keypair
npm run keys:rotate  # Rotate JWT keys
npm run jwks:verify  # Validate JWKS structure
```

### Database Schema

```sql
-- Tenants
CREATE TABLE tenants (
  id TEXT PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  kind TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Users
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  auth0_sub TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- User-Tenant Memberships
CREATE TABLE user_tenants (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id),
  tenant_id TEXT REFERENCES tenants(id),
  role TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, tenant_id)
);

-- Module Toggles
CREATE TABLE module_toggles (
  id TEXT PRIMARY KEY,
  tenant_id TEXT REFERENCES tenants(id),
  module_key TEXT NOT NULL,
  enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(tenant_id, module_key)
);

-- Audit Logs
CREATE TABLE audits (
  id TEXT PRIMARY KEY,
  actor_id TEXT NOT NULL,
  tenant_id TEXT REFERENCES tenants(id),
  action TEXT NOT NULL,
  resource TEXT,
  details TEXT,
  ip TEXT,
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

## Runtime Environment (Broker aliases)

These aliases are supported and normalized internally:

```bash
# Issuer / Audience
ISSUER=https://core.healthcore.systems         # -> EXPECTED_ISSUER
AUDIENCE=https://api.corehealth.cloud          # -> PHI_AUDIENCE

# Access token TTL and cookies
ACCESS_TTL_SECONDS=600
COOKIE_DOMAIN=.healthcore.systems

# CORS (exact match list)
ALLOWED_ORIGINS="https://healthcore.me,https://.healthcore.systems"

# Private key (dev alternative to Secrets Manager)
RSA_PRIVATE_KEY_PEM="-----BEGIN PRIVATE KEY-----...\n-----END PRIVATE KEY-----"
```

## Deployment

### Vercel (Recommended)

1. Connect GitHub repository
2. Configure environment variables
3. Deploy automatically on push

### Docker

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

### Environment Variables

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed deployment instructions.

## Monitoring

### Health Checks

- **Health**: `GET /api/health` - Service status
- **Sanity**: `GET /api/sanity` - Configuration validation

### Metrics

- Token mint requests per minute
- Authentication success/failure rates
- Rate limit violations
- Database connection health

### Logging

- Structured JSON logs
- Audit trail for all token operations
- Security event tracking
- Performance metrics

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## License

Copyright © 2024 Core Health Systems. All rights reserved.

## Support

For support and questions:
- 📧 Email: support@corehealth.systems
- 📚 Documentation: [DEPLOYMENT.md](./DEPLOYMENT.md)
- 🐛 Issues: GitHub Issues
