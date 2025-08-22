#!/bin/bash

echo "🚀 Setting up local development environment for Startup Finance..."

# Check if pnpm is installed
if ! command -v pnpm &> /dev/null; then
    echo "❌ pnpm is not installed. Please install pnpm first:"
    echo "   npm install -g pnpm"
    exit 1
fi

echo "📦 Installing root dependencies..."
pnpm install

echo "📦 Installing worker dependencies..."
cd worker && pnpm install
cd ..

echo "📦 Installing app dependencies..."
cd app && pnpm install
cd ..

echo "🗄️  Initializing local database..."
cd worker && pnpm run db:init
cd ..

echo "⚙️  Configuring environment..."
if [ ! -f "app/.env.local" ]; then
    echo "VITE_USE_LOCAL_WORKER=true" > app/.env.local
    echo "✅ Created app/.env.local"
else
    echo "✅ app/.env.local already exists"
fi

echo ""
echo "🎉 Setup complete! You can now start local development:"
echo ""
echo "   pnpm run dev:local    # Start both worker and app locally"
echo "   pnpm run dev:cloud    # Start app with production worker"
echo ""
echo "📍 Local URLs:"
echo "   Worker: http://localhost:8787"
echo "   App:    http://localhost:5173"
echo ""
echo "🗄️  Local data is stored in worker/.miniflare/"
echo "   To reset: rm -rf worker/.miniflare && cd worker && pnpm run db:init"
