# Deploy to core.healthcore.systems

This guide walks you through deploying the Core Systems Broker to `core.healthcore.systems` using Vercel.

## Prerequisites

1. **Domain Access**: Ensure you have access to configure `core.healthcore.systems`
2. **Vercel Account**: Sign up at [vercel.com](https://vercel.com)
3. **Auth0 Account**: EU region account
4. **PostgreSQL Database**: For production data
5. **AWS Account**: For Secrets Manager (optional but recommended)

## Step 1: Prepare the Codebase

### 1.1 Generate JWT Keys

```bash
# Generate initial JWT keypair
npm run keys:gen
```

This creates:
- `secrets/jwt-private-key.pem` - Private key
- `public/jwks.json` - Public JWKS
- `.env.jwt` - Environment template

### 1.2 Upload Private Key to AWS Secrets Manager

```bash
# Get the key ID from the generated key
cat .env.jwt | grep JWT_SIGNING_KID

# Upload to AWS Secrets Manager
aws secretsmanager create-secret \
  --name "prod/broker/jwt-private-<kid>" \
  --description "JWT private key for Core Systems Broker" \
  --secret-string file://secrets/jwt-private-key.pem \
  --region eu-north-1
```

### 1.3 Verify JWKS

```bash
# Verify the JWKS structure
npm run jwks:verify
```

## Step 2: Deploy to Vercel

### 2.1 Install Vercel CLI

```bash
npm install -g vercel
```

### 2.2 Login to Vercel

```bash
vercel login
```

### 2.3 Link Project

```bash
# In your project directory
vercel link
```

When prompted:
- **Set up and deploy?** → Yes
- **Which scope?** → Your personal account or team
- **Link to existing project?** → No
- **What's your project's name?** → `core-systems-broker`
- **In which directory is your code located?** → `./`

### 2.4 Configure Environment Variables

```bash
# Set environment variables
vercel env add NEXT_PUBLIC_APP_URL
# Enter: https://core.healthcore.systems

vercel env add AUTH0_ISSUER
# Enter: https://healthcoreme.eu.auth0.com/

vercel env add AUTH0_CLIENT_ID
# Enter: your-auth0-client-id

vercel env add AUTH0_CLIENT_SECRET
# Enter: your-auth0-client-secret

vercel env add AUTH0_AUDIENCE
# Enter: https://core.healthcore.systems

vercel env add JWT_SIGNING_KID
# Enter: hc-core-key-1 (or your generated key ID)

vercel env add JWT_PRIVATE_SECRET_ARN
# Enter: arn:aws:secretsmanager:eu-north-1:ACCOUNT:secret:prod/broker/jwt-private-<kid>

vercel env add PHI_AUDIENCE
# Enter: https://api.corehealth.cloud

vercel env add EXPECTED_ISSUER
# Enter: https://core.healthcore.systems

vercel env add ALLOWED_ORIGINS
# Enter: https://healthcore.me,https://*.healthcore.systems

vercel env add RATE_LIMIT_POINTS
# Enter: 60

vercel env add RATE_LIMIT_WINDOW
# Enter: 60

vercel env add DATABASE_URL
# Enter: postgresql://broker_user:password@host:5432/healthcore_broker

vercel env add ADMIN_SANITY_TOKEN
# Enter: a-long-random-secure-token

vercel env add AWS_REGION
# Enter: eu-north-1

vercel env add NODE_ENV
# Enter: production
```

### 2.5 Deploy

```bash
# Deploy to production
vercel --prod
```

## Step 3: Configure Custom Domain

### 3.1 Add Domain in Vercel

1. Go to your project in Vercel dashboard
2. Go to **Settings** → **Domains**
3. Add `core.healthcore.systems`
4. Follow the DNS configuration instructions

### 3.2 Configure DNS

Add these DNS records to your domain:

```
Type: CNAME
Name: core
Value: cname.vercel-dns.com
```

Or if using A records:

```
Type: A
Name: core
Value: 76.76.19.61
```

## Step 4: Configure Auth0

### 4.1 Update Auth0 Application

1. Go to Auth0 Dashboard → Applications
2. Select your application
3. Update **Allowed Callback URLs**:
   ```
   https://core.healthcore.systems/api/auth/callback/auth0
   ```
4. Update **Allowed Logout URLs**:
   ```
   https://core.healthcore.systems
   ```
5. Update **Allowed Web Origins**:
   ```
   https://core.healthcore.systems
   ```
6. Update **Allowed Origins (CORS)**:
   ```
   https://core.healthcore.systems
   ```

### 4.2 Configure Auth0 Rules (Optional)

Add this rule to include tenant information:

```javascript
function addTenantInfo(user, context, callback) {
  const namespace = 'https://core.healthcore.systems/';
  
  context.idToken[namespace + 'tenant_slug'] = user.app_metadata?.tenant_slug;
  context.idToken[namespace + 'user_role'] = user.app_metadata?.user_role;
  
  callback(null, user, context);
}
```

## Step 5: Database Setup

### 5.1 Create Production Database

```sql
-- Create database
CREATE DATABASE healthcore_broker;

-- Create user
CREATE USER broker_user WITH PASSWORD 'secure_password';

-- Grant permissions
GRANT ALL PRIVILEGES ON DATABASE healthcore_broker TO broker_user;
```

### 5.2 Run Migrations

```bash
# Set production database URL
export DATABASE_URL="postgresql://broker_user:password@host:5432/healthcore_broker"

# Generate Prisma client
npm run db:generate

# Run migrations
npm run db:deploy

# Seed initial data
npm run db:seed
```

## Step 6: Verify Deployment

### 6.1 Health Check

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

### 6.2 Sanity Check

```bash
curl "https://core.healthcore.systems/api/sanity?token=YOUR_ADMIN_TOKEN"
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

### 6.3 JWKS Endpoint

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

### 6.4 Test Token Minting

```bash
# First, get an Auth0 token by logging in
# Then test token minting
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

## Step 7: Monitor and Maintain

### 7.1 Set Up Monitoring

1. **Vercel Analytics**: Enable in Vercel dashboard
2. **Error Tracking**: Consider Sentry or similar
3. **Uptime Monitoring**: Use UptimeRobot or similar
4. **Log Monitoring**: Use Vercel's built-in logs

### 7.2 Regular Maintenance

```bash
# Monthly key rotation
npm run keys:rotate

# Verify JWKS after rotation
npm run jwks:verify

# Check database health
npm run db:studio
```

## Troubleshooting

### Common Issues

1. **Domain not resolving**: Check DNS configuration
2. **Auth0 errors**: Verify callback URLs and environment variables
3. **Database connection**: Check DATABASE_URL and network access
4. **JWT errors**: Verify private key in AWS Secrets Manager
5. **CORS errors**: Check ALLOWED_ORIGINS configuration

### Debug Commands

```bash
# Check Vercel deployment status
vercel ls

# View deployment logs
vercel logs

# Check environment variables
vercel env ls

# Redeploy if needed
vercel --prod --force
```

## Security Checklist

- [ ] Private key stored in AWS Secrets Manager
- [ ] Environment variables secured in Vercel
- [ ] CORS origins configured correctly
- [ ] Auth0 callback URLs updated
- [ ] Database access restricted
- [ ] Admin token is secure
- [ ] Rate limiting enabled
- [ ] Security headers configured
- [ ] Audit logging enabled
- [ ] Monitoring alerts configured

## Support

If you encounter issues:

1. Check Vercel deployment logs
2. Verify all environment variables
3. Test each endpoint individually
4. Check Auth0 configuration
5. Verify database connectivity

For additional help:
- 📧 Email: support@corehealth.systems
- 📚 Documentation: [README.md](./README.md)
- 🐛 Issues: GitHub Issues
