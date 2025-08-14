# Startup Finance - Development Setup

This project consists of a React app (`app/`) and a Cloudflare Worker (`worker/`) that work together to provide a startup finance calculator with real-time collaboration features.

## Development Modes

### 1. Local Development Mode (Recommended)
Both app and worker run locally with full Miniflare emulation - **no Cloudflare account required**.

```bash
pnpm run dev:local
```

This runs:
- App on `http://localhost:5173` (connects to local worker)
- Worker on `http://localhost:8787` (using Miniflare)
- Local SQLite database with full persistence
- Durable Objects emulation for WebSocket support

### 2. Cloud Development Mode
The app connects to the deployed Cloudflare Worker in production.

```bash
pnpm run dev:cloud
```

This runs:
- App on `http://localhost:5173` (connects to production worker)
- Worker locally on `http://localhost:8787` (requires Cloudflare account)

## Environment Configuration

The app automatically detects the environment and configures the backend URL:

- **Production builds**: Always use the deployed Cloudflare Worker
- **Development mode**: Use production worker by default
- **Local development**: Set `VITE_USE_LOCAL_WORKER=true` to use local worker

### Environment Variables

- `VITE_BACKEND_URL`: Override backend URL (optional)
- `VITE_USE_LOCAL_WORKER`: Set to `true` to use localhost:8787 in development

### Worker Configuration

The worker is configured via `worker/wrangler.jsonc` and includes:
- Durable Objects for real-time state management
- Static asset serving for the built app
- WebSocket support for real-time collaboration

## Project Structure

```
├── app/                    # React frontend
│   ├── src/
│   │   ├── app/           # Main app components
│   │   └── library/       # Shared calculation library
│   ├── vite.config.ts     # Vite config with proxy setup
│   └── package.json
├── worker/                # Cloudflare Worker backend
│   ├── src/
│   ├── public/           # Built app assets (from app build)
│   ├── wrangler.jsonc    # Worker configuration
│   └── package.json
└── package.json          # Root package with dev scripts
```

## Development Workflow

### Initial Setup
```bash
npm run install:all
```

### Development Commands

| Command | Description |
|---------|-------------|
| `pnpm run dev` | Local mode - both app and worker run locally (Miniflare) |
| `pnpm run dev:local` | Same as above - full local development |
| `pnpm run dev:cloud` | Cloud mode - app connects to deployed worker |
| `pnpm run dev:staging` | Frontend-only development against staging backend |
| `pnpm run dev:production` | Frontend-only development against production backend |
| `pnpm run setup:local` | Initialize local database for Miniflare |
| `pnpm run install:all` | Install dependencies for all packages |
| `pnpm run build` | Build app for production |
| `pnpm run build:staging` | Build app for staging environment |
| `pnpm run build:production` | Build app for production environment |
| `pnpm run build:local` | Build app for local development |
| `pnpm run clean` | Clean all node_modules and local data |

### Worker-specific Commands

| Command | Description |
|---------|-------------|
| `cd worker && pnpm run dev:local` | Start worker with Miniflare |
| `cd worker && pnpm run dev:miniflare` | Start worker with wrangler local mode |
| `cd worker && pnpm run dev` | Start worker with Cloudflare (requires account) |
| `cd worker && pnpm run db:init` | Initialize local SQLite database |

### Switching Between Modes

**To use production worker:**
```bash
npm run dev
```

**To use local worker:**
```bash
npm run dev:local
```

The local mode automatically sets `VITE_USE_LOCAL_WORKER=true` to configure the app to use `http://localhost:8787`.

## API Proxy Configuration

The Vite dev server is configured with a proxy that forwards `/api/*` requests to the worker:
- In production mode: requests go to the deployed worker
- In local mode: requests go to `http://localhost:8787`

This eliminates CORS issues during development.

## Local Development with Miniflare

The project uses Miniflare for local development, providing a complete Cloudflare Workers environment without requiring a Cloudflare account.

### Features Supported Locally

✅ **Full API compatibility** - All endpoints work exactly like production  
✅ **WebSocket connections** - Real-time updates via Durable Objects  
✅ **Database persistence** - SQLite-based D1 emulation  
✅ **Static asset serving** - Serves the React app  
✅ **Hot reloading** - Automatic restart on code changes  

### Local Storage

Miniflare stores data locally in `worker/.miniflare/`:
- `.miniflare/d1/` - SQLite database files
- `.miniflare/durable-objects/` - Durable Object state  
- `.miniflare/cache/` - Cache API data

This directory is gitignored and persists between restarts.

### Troubleshooting Local Development

**Database Issues:**
```bash
cd worker && rm -rf .miniflare/d1 && pnpm run db:init
```

**Port Conflicts:**
Modify the port in `worker/miniflare.config.js` if 8787 is in use.

## WebSocket Support

The app supports real-time collaboration via WebSockets:
- Production: `wss://your-worker.workers.dev`
- Local: `ws://localhost:8787`

The backend service automatically handles the protocol switching based on the configured backend URL.

## Testing

Run tests for the app:
```bash
cd app && npm test
```

## Deployment

### Manual Deployment

Deploy the worker to Cloudflare:
```bash
npm run build:worker
```

Build the app for production:
```bash
npm run build:app
```

The built app is automatically placed in `worker/public/` and served by the worker.

### GitHub Actions Deployment

The project includes automated deployment via GitHub Actions (`.github/workflows/deploy-cloudflare.yml`):

1. **Triggers**: Pushes to `main` branch and pull requests
2. **Process**:
   - Builds the React app using `pnpm`
   - Installs worker dependencies using `npm`
   - Deploys to Cloudflare Workers using `wrangler`

**Required GitHub Secrets:**
- `CLOUDFLARE_API_TOKEN`: Your Cloudflare API token with Workers:Edit permissions

**Setup Instructions:**
1. Generate a Cloudflare API token at https://dash.cloudflare.com/profile/api-tokens
2. Add the token as `CLOUDFLARE_API_TOKEN` in your GitHub repository secrets
3. Push to `main` branch to trigger deployment

The worker will serve the React app from the root path (`/`) while maintaining API routes at `/api/objects/*`.
