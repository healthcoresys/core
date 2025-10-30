# Deployment Guide

This guide covers deploying the Core Systems Broker to production environments.

## Prerequisites

- Node.js 18+
- PostgreSQL database
- Auth0 account (EU region)
- AWS account (for Secrets Manager)
- Domain: `core.healthcore.systems`

## Pre-Deployment Setup

### 1. Generate Signing Keys

```bash
# Generate initial JWT keypair
npm run keys:gen
```

This creates:
- `secrets/jwt-private-key.pem` - Private key
- `public/jwks.json` - Public JWKS
- `.env.jwt` - Environment template

### 2. Upload Private Key to AWS Secrets Manager

```bash
# Upload private key to AWS Secrets Manager
aws secretsmanager create-secret \
  --name "prod/broker/jwt-private-<kid>" \
  --description "JWT private key for Core Systems Broker" \
  --secret-string file://secrets/jwt-private-key.pem \
  --region eu-north-1
```

Replace `<kid>` with the actual key ID from the generated key.

### 3. Configure Environment Variables

Set the following environment variables in your deployment platform:

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
JWT_PRIVATE_SECRET_ARN=arn:aws:secretsmanager:eu-north-1:ACCOUNT:secret:prod/broker/jwt-private-<kid>

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

# AWS
AWS_REGION=eu-north-1

# Environment
NODE_ENV=production
```

## Deployment Options

### Option 1: Vercel (Recommended)

#### Setup

1. **Connect Repository**
   ```bash
   # Install Vercel CLI
   npm i -g vercel
   
   # Login to Vercel
   vercel login
   
   # Link project
   vercel link
   ```

2. **Configure Environment Variables**
   ```bash
   # Set environment variables
   vercel env add NEXT_PUBLIC_APP_URL
   vercel env add AUTH0_ISSUER
   vercel env add AUTH0_CLIENT_ID
   vercel env add AUTH0_CLIENT_SECRET
   vercel env add AUTH0_AUDIENCE
   vercel env add JWT_SIGNING_KID
   vercel env add JWT_PRIVATE_SECRET_ARN
   vercel env add PHI_AUDIENCE
   vercel env add EXPECTED_ISSUER
   vercel env add ALLOWED_ORIGINS
   vercel env add RATE_LIMIT_POINTS
   vercel env add RATE_LIMIT_WINDOW
   vercel env add DATABASE_URL
   vercel env add ADMIN_SANITY_TOKEN
   vercel env add AWS_REGION
   vercel env add NODE_ENV
   ```

3. **Deploy**
   ```bash
   # Deploy to production
   vercel --prod
   ```

#### Vercel Configuration

Create `vercel.json`:

```json
{
  "framework": "nextjs",
  "buildCommand": "npm run build",
  "outputDirectory": ".next",
  "installCommand": "npm ci",
  "env": {
    "NODE_ENV": "production"
  },
  "functions": {
    "src/app/api/**/*.ts": {
      "maxDuration": 30
    }
  },
  "headers": [
    {
      "source": "/.well-known/jwks.json",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=300, s-maxage=300"
        }
      ]
    },
    {
      "source": "/api/health",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "no-cache, no-store, must-revalidate"
        }
      ]
    }
  ]
}
```

### Option 2: Render

#### Setup

1. **Create Render Service**
   - Connect GitHub repository
   - Select "Web Service"
   - Choose Node.js environment

2. **Configure Build Settings**
   ```bash
   Build Command: npm run build
   Start Command: npm start
   ```

3. **Set Environment Variables**
   - Add all environment variables in Render dashboard
   - Set `NODE_ENV=production`

4. **Deploy**
   - Render will automatically deploy on push to main branch

### Option 3: AWS (ECS/Fargate)

#### Dockerfile

```dockerfile
FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Install dependencies
COPY package.json package-lock.json* ./
RUN npm ci --only=production

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build the application
RUN npm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public

# Set the correct permission for prerender cache
RUN mkdir .next
RUN chown nextjs:nodejs .next

# Automatically leverage output traces to reduce image size
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

CMD ["node", "server.js"]
```

#### Next.js Configuration

Update `next.config.mjs`:

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  experimental: {
    outputFileTracingRoot: undefined,
  },
}

export default nextConfig
```

#### ECS Task Definition

```json
{
  "family": "core-systems-broker",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "256",
  "memory": "512",
  "executionRoleArn": "arn:aws:iam::ACCOUNT:role/ecsTaskExecutionRole",
  "taskRoleArn": "arn:aws:iam::ACCOUNT:role/ecsTaskRole",
  "containerDefinitions": [
    {
      "name": "core-systems-broker",
      "image": "your-account.dkr.ecr.eu-north-1.amazonaws.com/core-systems-broker:latest",
      "portMappings": [
        {
          "containerPort": 3000,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {
          "name": "NODE_ENV",
          "value": "production"
        }
      ],
      "secrets": [
        {
          "name": "DATABASE_URL",
          "valueFrom": "arn:aws:secretsmanager:eu-north-1:ACCOUNT:secret:prod/broker/database-url"
        },
        {
          "name": "AUTH0_CLIENT_SECRET",
          "valueFrom": "arn:aws:secretsmanager:eu-north-1:ACCOUNT:secret:prod/broker/auth0-client-secret"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/core-systems-broker",
          "awslogs-region": "eu-north-1",
          "awslogs-stream-prefix": "ecs"
        }
      }
    }
  ]
}
```

## Database Setup

### 1. Create Database

```sql
-- Create database
CREATE DATABASE healthcore_broker;

-- Create user
CREATE USER broker_user WITH PASSWORD 'secure_password';

-- Grant permissions
GRANT ALL PRIVILEGES ON DATABASE healthcore_broker TO broker_user;
```

### 2. Run Migrations

```bash
# Generate Prisma client
npm run db:generate

# Run migrations
npm run db:deploy
```

### 3. Seed Initial Data

```bash
# Seed test data
npm run db:seed
```

## Auth0 Configuration

### 1. Configure Application

- **Application Type**: Single Page Application
- **Token Endpoint Authentication Method**: None
- **Grant Types**: Authorization Code, Refresh Token

### 2. Configure URLs

- **Allowed Callback URLs**: `https://core.healthcore.systems/api/auth/callback/auth0`
- **Allowed Logout URLs**: `https://core.healthcore.systems`
- **Allowed Web Origins**: `https://core.healthcore.systems`
- **Allowed Origins (CORS)**: `https://core.healthcore.systems`

### 3. Configure Scopes

- **Scopes**: `openid`, `profile`, `email`
- **Audience**: `https://core.healthcore.systems`

### 4. Configure Rules

```javascript
// Add tenant information to token
function addTenantInfo(user, context, callback) {
  const namespace = 'https://core.healthcore.systems/';
  
  context.idToken[namespace + 'tenant_slug'] = user.app_metadata?.tenant_slug;
  context.idToken[namespace + 'user_role'] = user.app_metadata?.user_role;
  
  callback(null, user, context);
}
```

## Post-Deployment Verification

### 1. Health Check

```bash
curl https://core.healthcore.systems/api/health
```

Expected response:
```json
{
  "ok": true,
  "status": "ok",
  "region": "eu-north-1",
  "time": "2024-01-01T12:00:00.000Z"
}
```

### 2. Sanity Check

```bash
curl "https://core.healthcore.systems/api/sanity?token=your-admin-token"
```

Expected response:
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

### 3. JWKS Endpoint

```bash
curl https://core.healthcore.systems/.well-known/jwks.json
```

Expected response:
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

### 4. Token Minting

```bash
curl -X POST https://core.healthcore.systems/api/tokens/mint \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <auth0-token>" \
  -d '{
    "audience": "https://api.corehealth.cloud",
    "scope": "read:file write:file",
    "patientId": "coreid-123",
    "tenantSlug": "acme-clinic"
  }'
```

Expected response:
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

### 5. Token Validation

Decode the JWT token and verify:
- `iss`: `https://core.healthcore.systems`
- `aud`: `https://api.corehealth.cloud`
- `kid`: Matches the key ID in JWKS
- `exp`: 5 minutes from `iat`

## Monitoring & Maintenance

### 1. Key Rotation

```bash
# Rotate keys monthly
npm run keys:rotate

# Verify new keys
npm run jwks:verify
```

### 2. Database Maintenance

```bash
# Backup database
pg_dump healthcore_broker > backup_$(date +%Y%m%d).sql

# Monitor audit logs
SELECT COUNT(*) FROM audits WHERE created_at > NOW() - INTERVAL '1 day';
```

### 3. Security Monitoring

- Monitor rate limit violations
- Check audit logs for suspicious activity
- Verify CORS origins are correct
- Monitor JWT token usage patterns

### 4. Performance Monitoring

- Track token mint response times
- Monitor database connection health
- Check AWS Secrets Manager access patterns
- Monitor Auth0 authentication success rates

## Troubleshooting

### Common Issues

1. **JWKS Not Accessible**
   - Check `public/jwks.json` exists
   - Verify file permissions
   - Check CDN cache settings

2. **Token Minting Fails**
   - Verify Auth0 configuration
   - Check tenant slug exists
   - Validate user permissions
   - Check rate limits

3. **Database Connection Issues**
   - Verify `DATABASE_URL`
   - Check network connectivity
   - Verify user permissions
   - Check connection pool settings

4. **AWS Secrets Manager Access**
   - Verify IAM permissions
   - Check secret ARN format
   - Verify region configuration
   - Check secret exists

### Debug Commands

```bash
# Check environment variables
npm run jwks:verify

# Test database connection
npm run db:studio

# Check key generation
npm run keys:gen

# Validate configuration
curl "https://core.healthcore.systems/api/sanity?token=your-admin-token"
```

## Security Checklist

- [ ] Private key stored in AWS Secrets Manager
- [ ] Environment variables secured
- [ ] CORS origins configured correctly
- [ ] Rate limiting enabled
- [ ] Security headers configured
- [ ] Audit logging enabled
- [ ] PHI redaction working
- [ ] Auth0 configuration secure
- [ ] Database access restricted
- [ ] Monitoring alerts configured

## Support

For deployment issues:
- 📧 Email: support@corehealth.systems
- 📚 Documentation: [README.md](./README.md)
- 🐛 Issues: GitHub Issues
- 🔧 Debug: Use sanity check endpoint