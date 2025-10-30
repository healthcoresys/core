# Post-Deploy Checklist

## ✅ Pre-Deployment

- [ ] JWT keys generated (`npm run keys:gen`)
- [ ] Private key uploaded to AWS Secrets Manager
- [ ] Environment variables configured
- [ ] Database migrations run (`npm run db:deploy`)
- [ ] Test data seeded (`npm run db:seed`)
- [ ] Auth0 configuration updated

## ✅ Core Functionality

### JWKS Endpoint
- [ ] `GET https://core.healthcore.systems/.well-known/jwks.json` returns valid JWKS
- [ ] JWKS contains at least one RSA key
- [ ] Key has correct `kid`, `kty`, `use`, `alg` fields
- [ ] Response includes proper cache headers

### Token Minting
- [ ] `POST /api/tokens/mint` returns valid JWT
- [ ] Token has correct `iss=https://core.healthcore.systems`
- [ ] Token has correct `aud=https://api.corehealth.cloud`
- [ ] Token has correct `kid` matching JWKS
- [ ] Token expires in 5 minutes
- [ ] Token includes requested scopes
- [ ] Token includes patientId if provided

### Health Monitoring
- [ ] `GET /api/health` returns 200 OK
- [ ] `GET /api/sanity?token=...` returns all checks passing
- [ ] Database connectivity confirmed
- [ ] Private key loading confirmed
- [ ] Environment variables validated

## ✅ Security

### Rate Limiting
- [ ] Rate limiting effective on `/api/tokens/mint`
- [ ] IP-based limits working (60/min)
- [ ] User-based limits working (60/min)
- [ ] 429 responses returned when exceeded

### CORS Protection
- [ ] CORS restricts to allowed origins only
- [ ] Wildcard origins denied
- [ ] Preflight requests handled correctly
- [ ] Credentials allowed for valid origins

### Security Headers
- [ ] HSTS header present (production)
- [ ] X-Content-Type-Options: nosniff
- [ ] X-Frame-Options: DENY
- [ ] Content-Security-Policy configured
- [ ] Permissions-Policy configured

### Audit Logging
- [ ] Audit rows created on each token mint
- [ ] PHI redaction working correctly
- [ ] Sensitive data filtered from logs
- [ ] IP and user agent logged

## ✅ Integration

### Auth0 Integration
- [ ] Auth0 login flow succeeds
- [ ] Callback URLs configured correctly
- [ ] User claims include tenant information
- [ ] Session management working

### PHI API Integration
- [ ] PHI API validates tokens via JWKS
- [ ] PHI API accepts requests with valid tokens
- [ ] Token verification working end-to-end
- [ ] Scope validation working

### Database Integration
- [ ] Tenant resolution working
- [ ] User-tenant membership validated
- [ ] Module toggles respected
- [ ] Audit logs stored correctly

## ✅ Performance

### Response Times
- [ ] Health check < 100ms
- [ ] JWKS endpoint < 200ms
- [ ] Token minting < 500ms
- [ ] Sanity check < 1000ms

### Caching
- [ ] JWKS cached for 5 minutes
- [ ] Health check not cached
- [ ] API responses have appropriate cache headers

## ✅ Monitoring

### Logs
- [ ] Structured JSON logs
- [ ] Error logging configured
- [ ] Audit trail complete
- [ ] No PHI in logs

### Metrics
- [ ] Token mint requests tracked
- [ ] Authentication success/failure rates
- [ ] Rate limit violations
- [ ] Database connection health

## ✅ Error Handling

### Error Responses
- [ ] 401 for authentication failures
- [ ] 403 for CORS violations
- [ ] 429 for rate limit exceeded
- [ ] 500 for server errors
- [ ] Proper error messages (no sensitive data)

### Fallbacks
- [ ] Rate limiting falls back to in-memory
- [ ] Database connection retries
- [ ] AWS Secrets Manager retries
- [ ] Graceful degradation

## 🔧 Debug Commands

```bash
# Check JWKS
curl https://core.healthcore.systems/.well-known/jwks.json

# Test health
curl https://core.healthcore.systems/api/health

# Test sanity
curl "https://core.healthcore.systems/api/sanity?token=your-admin-token"

# Test token minting
curl -X POST https://core.healthcore.systems/api/tokens/mint \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <auth0-token>" \
  -d '{"audience": "https://api.corehealth.cloud", "scope": "read:file"}'

# Verify token
echo "eyJhbGciOiJSUzI1NiIs..." | base64 -d | jq .
```

## 🚨 Rollback Plan

If issues are detected:

1. **Immediate**: Revert to previous deployment
2. **Database**: Restore from backup if needed
3. **Keys**: Revert to previous JWT key if token validation fails
4. **Auth0**: Revert callback URLs if authentication fails

## 📞 Support Contacts

- **Technical Issues**: support@corehealth.systems
- **Security Issues**: security@corehealth.systems
- **Emergency**: +1-XXX-XXX-XXXX

