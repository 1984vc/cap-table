# Startup Finance - Development Setup

This project consists of a React app (`app/`) and a Cloudflare Worker (`worker/`) that work together to provide a startup finance calculator with real-time collaboration features.

## Development Modes

### 1. Production Mode (Default)
The app connects to the deployed Cloudflare Worker in production.

```bash
npm run dev
```

This runs:
- App on `http://localhost:5173` (connects to production worker)
- Worker locally on `http://localhost:8787` (for testing)

### 2. Local Development Mode
Both app and worker run locally with full integration.

```bash
npm run dev:local
```

This runs:
- App on `http://localhost:5173` (connects to local worker)
- Worker on `http://localhost:8787`

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
| `npm run dev` | Production mode - app connects to deployed worker |
| `npm run dev:local` | Local mode - both app and worker run locally |
| `npm run dev:app` | Run only the app (production backend) |
| `npm run dev:worker` | Run only the worker locally |
| `npm run build` | Build both app and deploy worker |
| `npm run build:app` | Build app only |
| `npm run build:worker` | Deploy worker to Cloudflare |

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
