# Quick Deploy to core.healthcore.systems

## 🚀 One-Command Deploy (After Setup)

```bash
# Deploy to production
vercel --prod
```

## 📋 Pre-Deploy Checklist

### 1. Generate Keys
```bash
npm run keys:gen
```

### 2. Upload Private Key to AWS
```bash
aws secretsmanager create-secret \
  --name "prod/broker/jwt-private-<kid>" \
  --secret-string file://secrets/jwt-private-key.pem \
  --region eu-north-1
```

### 3. Set Environment Variables in Vercel
```bash
vercel env add NEXT_PUBLIC_APP_URL
# Enter: https://core.healthcore.systems

vercel env add AUTH0_ISSUER
# Enter: https://healthcoreme.eu.auth0.com/

vercel env add AUTH0_CLIENT_ID
# Enter: your-client-id

vercel env add AUTH0_CLIENT_SECRET
# Enter: your-client-secret

vercel env add AUTH0_AUDIENCE
# Enter: https://core.healthcore.systems

vercel env add JWT_SIGNING_KID
# Enter: hc-core-key-1

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

### 4. Configure Auth0
- Callback URL: `https://core.healthcore.systems/api/auth/callback/auth0`
- Logout URL: `https://core.healthcore.systems`
- Web Origins: `https://core.healthcore.systems`

### 5. Set Up Database
```bash
# Create database and run migrations
npm run db:deploy
npm run db:seed
```

## ✅ Post-Deploy Verification

```bash
# Health check
curl https://core.healthcore.systems/api/health

# JWKS endpoint
curl https://core.healthcore.systems/.well-known/jwks.json

# Sanity check
curl "https://core.healthcore.systems/api/sanity?token=YOUR_ADMIN_TOKEN"
```

## 🔧 Troubleshooting

```bash
# Check deployment status
vercel ls

# View logs
vercel logs

# Redeploy
vercel --prod --force
```

## 📚 Full Documentation

- [Complete Deployment Guide](./DEPLOY_TO_CORE_HEALTHCORE.md)
- [API Examples](./API_EXAMPLES.md)
- [Post-Deploy Checklist](./POST_DEPLOY_CHECKLIST.md)
