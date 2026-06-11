#!/bin/bash
# Deploy API to Railway

echo "🚀 Deploying API to Railway..."

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo "❌ Railway CLI not found. Install it with:"
    echo "   npm install -g @railway/cli"
    exit 1
fi

# Login to Railway (if not already)
echo "📦 Checking Railway login..."
railway whoami || railway login

# Link to project (if not already linked)
echo "🔗 Linking to Railway project..."
railway link

# Deploy
echo "🚀 Deploying..."
railway up --service api

echo "✅ Deployment complete!"
echo "   Check status at: https://railway.app/dashboard"
