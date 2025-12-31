#!/bin/bash

# Quick deployment script for Raastaa Backend
# Choose your platform and deploy!

echo "🚀 Raastaa Backend Deployment"
echo ""
echo "Choose deployment platform:"
echo "1) Render.com (Easiest, Singapore region)"
echo "2) Fly.io (Mumbai region - Best for Bangalore!)"
echo "3) Railway.app (Simple, good DX)"
echo ""
read -p "Enter choice (1-3): " choice

case $choice in
  1)
    echo ""
    echo "📦 Deploying to Render.com..."
    echo ""
    echo "Steps:"
    echo "1. Push code to GitHub:"
    echo "   git push origin main"
    echo ""
    echo "2. Go to https://dashboard.render.com/"
    echo "3. Click 'New +' → 'Blueprint'"
    echo "4. Select your raastaa-backend repository"
    echo "5. Render will detect render.yaml and deploy everything!"
    echo ""
    echo "Your API will be at: https://raastaa-api.onrender.com"
    ;;
    
  2)
    echo ""
    echo "✈️  Deploying to Fly.io (Mumbai)..."
    echo ""
    
    # Check if flyctl is installed
    if ! command -v flyctl &> /dev/null; then
        echo "Installing Fly CLI..."
        brew install flyctl
    fi
    
    echo "Logging in to Fly.io..."
    fly auth login
    
    echo ""
    echo "Launching app in Mumbai region..."
    fly launch --region bom --name raastaa-backend
    
    echo ""
    echo "Creating PostgreSQL database..."
    fly postgres create --name raastaa-db --region bom
    fly postgres attach raastaa-db
    
    echo ""
    echo "Creating Redis..."
    fly redis create --name raastaa-redis --region bom
    
    echo ""
    echo "Setting secrets..."
    JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")
    JWT_REFRESH_SECRET=$(node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")
    
    fly secrets set JWT_SECRET="$JWT_SECRET"
    fly secrets set JWT_REFRESH_SECRET="$JWT_REFRESH_SECRET"
    
    echo ""
    echo "Deploying application..."
    fly deploy
    
    echo ""
    echo "✅ Deployment complete!"
    echo "Your API: https://raastaa-backend.fly.dev"
    ;;
    
  3)
    echo ""
    echo "🚂 Deploying to Railway..."
    echo ""
    
    # Check if railway CLI is installed
    if ! command -v railway &> /dev/null; then
        echo "Installing Railway CLI..."
        npm install -g @railway/cli
    fi
    
    echo "Logging in to Railway..."
    railway login
    
    echo ""
    echo "Initializing project..."
    railway init
    
    echo ""
    echo "Adding PostgreSQL..."
    railway add --plugin postgresql
    
    echo ""
    echo "Adding Redis..."
    railway add --plugin redis
    
    echo ""
    echo "Deploying..."
    railway up
    
    echo ""
    echo "✅ Deployment complete!"
    echo "Run 'railway open' to view your dashboard"
    ;;
    
  *)
    echo "Invalid choice"
    exit 1
    ;;
esac

echo ""
echo "🎉 Next steps:"
echo "1. Test your API: curl https://your-api-url/health"
echo "2. Update iOS Backend.swift with your production URL"
echo "3. Build and test the iOS app"
echo ""
echo "Need help? Check DEPLOYMENT.md"
