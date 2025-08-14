# Local Development with Miniflare

This guide explains how to run the startup-finance worker locally using Miniflare, without any dependency on Cloudflare services.

## Prerequisites

- Node.js 18+ 
- pnpm (or npm/yarn)

## Quick Start

1. **Install dependencies:**
   ```bash
   cd worker
   pnpm install
   ```

2. **Initialize the local database:**
   ```bash
   pnpm run db:init
   ```

3. **Start the local development server:**
   ```bash
   pnpm run dev:local
   ```

4. **Configure the frontend to use local worker:**
   In the `app/.env.local` file, set:
   ```
   VITE_USE_LOCAL_WORKER=true
   ```

5. **Start the frontend:**
   ```bash
   cd ../app
   pnpm run dev
   ```

The worker will be available at `http://localhost:8787` and the frontend at `http://localhost:5173`.

## Available Scripts

- `pnpm run dev:local` - Start Miniflare server with full local emulation
- `pnpm run dev:miniflare` - Start using wrangler with local config
- `pnpm run db:init` - Initialize the local SQLite database
- `pnpm run dev` - Start using regular wrangler (requires Cloudflare account)

## Local Storage

Miniflare stores data locally in the `.miniflare/` directory:

- `.miniflare/d1/` - SQLite database files
- `.miniflare/durable-objects/` - Durable Object state
- `.miniflare/cache/` - Cache API data

This directory is gitignored and will be created automatically.

## Features Supported Locally

✅ **Full API compatibility** - All endpoints work exactly like production
✅ **WebSocket connections** - Real-time updates via Durable Objects  
✅ **Database persistence** - SQLite-based D1 emulation
✅ **Static asset serving** - Serves the React app
✅ **Hot reloading** - Automatic restart on code changes

## Differences from Production

- Uses SQLite instead of Cloudflare D1
- Durable Objects stored locally instead of Cloudflare edge
- No geographic distribution (single local instance)
- No Cloudflare-specific optimizations

## Troubleshooting

### Database Issues
If you encounter database errors, try reinitializing:
```bash
rm -rf .miniflare/d1
pnpm run db:init
```

### Port Conflicts
If port 8787 is in use, you can modify the port in `miniflare.config.js`:
```javascript
// Change this line:
port: 8787,
// To:
port: 8788,
```

### WebSocket Connection Issues
Make sure both the worker and frontend are running, and that the frontend is configured to use the local worker.

## Development Workflow

1. Make changes to worker code in `src/`
2. Miniflare will automatically reload
3. Test changes in the frontend
4. Database changes persist between restarts

## Production Deployment

When ready to deploy, use the regular deployment commands:
```bash
pnpm run deploy
```

This will deploy to Cloudflare Workers using the production configuration in `wrangler.jsonc`.
