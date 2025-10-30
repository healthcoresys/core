#!/bin/bash

# Core Systems Broker Deployment Script
# Deploy to core.healthcore.systems

set -e

echo "🚀 Starting deployment to core.healthcore.systems..."

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI not found. Installing..."
    npm install -g vercel
fi

# Check if user is logged in to Vercel
if ! vercel whoami &> /dev/null; then
    echo "❌ Not logged in to Vercel. Please login first:"
    echo "   vercel login"
    exit 1
fi

# Generate JWT keys if they don't exist
if [ ! -f "public/jwks.json" ]; then
    echo "🔑 Generating JWT keys..."
    npm run keys:gen
fi

# Verify JWKS
echo "🔍 Verifying JWKS..."
npm run jwks:verify

# Build the project
echo "🏗️  Building project..."
npm run build

# Deploy to Vercel
echo "🚀 Deploying to Vercel..."
vercel --prod

echo "✅ Deployment complete!"
echo ""
echo "🔍 Post-deployment verification:"
echo "1. Health check: curl https://core.healthcore.systems/api/health"
echo "2. JWKS endpoint: curl https://core.healthcore.systems/.well-known/jwks.json"
echo "3. Sanity check: curl \"https://core.healthcore.systems/api/sanity?token=YOUR_ADMIN_TOKEN\""
echo ""
echo "📋 Don't forget to:"
echo "- Configure environment variables in Vercel dashboard"
echo "- Set up Auth0 callback URLs"
echo "- Configure your database"
echo "- Test the complete flow"
