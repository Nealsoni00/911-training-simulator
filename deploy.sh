#!/bin/bash

# 911 Training Simulator - Vercel Deployment Script
echo "🚀 Deploying 911 Training Simulator to Vercel..."

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Please run this script from the project root."
    exit 1
fi

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "⚠️  Warning: .env file not found. Creating from template..."
    cp .env.example .env
    echo "📝 Please edit .env file with your API keys before continuing."
    echo "   Required keys: REACT_APP_OPENAI_API_KEY, REACT_APP_DEEPGRAM_API_KEY"
    read -p "Press Enter when you've added your API keys to .env file..."
fi

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Build the project to check for errors
echo "🔨 Building project..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Build failed. Please fix errors before deploying."
    exit 1
fi

echo "✅ Build successful!"

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "📥 Installing Vercel CLI..."
    npm install -g vercel
fi

# Deploy to Vercel
echo "🚀 Deploying to Vercel..."
vercel --prod

echo ""
echo "🎉 Deployment complete!"
echo ""
echo "📋 Next steps:"
echo "1. Go to your Vercel dashboard: https://vercel.com/dashboard"
echo "2. Navigate to your project settings"
echo "3. Add the following environment variables:"
echo "   - REACT_APP_OPENAI_API_KEY"
echo "   - REACT_APP_DEEPGRAM_API_KEY"
echo "   - REACT_APP_LIVEKIT_WS_URL (optional)"
echo "   - REACT_APP_LIVEKIT_TOKEN (optional)"
echo ""
echo "4. Redeploy the project after adding environment variables"
echo ""
echo "🔗 Your app will be available at the URL provided by Vercel"