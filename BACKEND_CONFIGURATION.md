# Backend Configuration Guide

This document explains how to configure the frontend to connect to different backend environments (local, staging, production).

## Configuration Priority

The backend URL is determined in the following priority order:

1. **Explicit Override** (`VITE_BACKEND_URL`) - Highest priority
2. **Environment-specific URLs** (`VITE_STAGING_BACKEND_URL`, `VITE_PRODUCTION_BACKEND_URL`)
3. **Development mode detection** (`VITE_USE_LOCAL_WORKER`)
4. **Default production URL** - Fallback

## Environment Variables

### Core Variables

- `VITE_BACKEND_URL` - Explicit backend URL (overrides everything)
- `VITE_ENVIRONMENT` - Target environment (`staging`, `production`)
- `VITE_STAGING_BACKEND_URL` - Staging backend URL
- `VITE_PRODUCTION_BACKEND_URL` - Production backend URL
- `VITE_USE_LOCAL_WORKER` - Use local worker in development mode

## Usage Scenarios

### 1. Local Development with Local Worker

**File:** `app/.env.local`
```bash
VITE_USE_LOCAL_WORKER=true
```

**Command:**
```bash
pnpm run dev:local
```

### 2. Local Development Against Staging Backend

**Option A - Direct URL:**
```bash
# In app/.env.local or as environment variable
VITE_BACKEND_URL=https://staging-worker.workers.dev
```

**Option B - Environment mode:**
```bash
# In app/.env.local
VITE_ENVIRONMENT=staging
VITE_STAGING_BACKEND_URL=https://staging-worker.workers.dev
```

**Command:**
```bash
pnpm run dev:staging
# or
cd app && pnpm run dev:staging
```

### 3. Build for Staging Environment

**File:** `app/.env.staging`
```bash
VITE_ENVIRONMENT=staging
VITE_STAGING_BACKEND_URL=https://staging-worker.workers.dev
```

**Command:**
```bash
pnpm run build:staging
```

### 4. Build for Production Environment

**File:** `app/.env.production`
```bash
VITE_ENVIRONMENT=production
VITE_PRODUCTION_BACKEND_URL=https://production-worker.workers.dev
```

**Command:**
```bash
pnpm run build:production
```

### 5. CI/CD Pipeline Configuration

For staging deployment:
```bash
# Set environment variables in CI
VITE_ENVIRONMENT=staging
VITE_STAGING_BACKEND_URL=https://staging-worker.workers.dev

# Build command
pnpm run build:staging
```

For production deployment:
```bash
# Set environment variables in CI
VITE_ENVIRONMENT=production
VITE_PRODUCTION_BACKEND_URL=https://production-worker.workers.dev

# Build command
pnpm run build:production
```

## Available Commands

### Development Commands

| Command | Description |
|---------|-------------|
| `pnpm run dev` | Local development with local worker |
| `pnpm run dev:local` | Same as above |
| `pnpm run dev:staging` | Development mode with staging backend |
| `pnpm run dev:production` | Development mode with production backend |
| `pnpm run dev:cloud` | Development with cloud worker (requires Cloudflare) |

### Build Commands

| Command | Description |
|---------|-------------|
| `pnpm run build` | Default build (uses .env.production) |
| `pnpm run build:staging` | Build for staging environment |
| `pnpm run build:production` | Build for production environment |
| `pnpm run build:local` | Build for local development |

## Environment Files

- `.env.local` - Local development overrides
- `.env.staging` - Staging environment configuration
- `.env.production` - Production environment configuration
- `.env.example` - Documentation and examples

## Debugging

The backend service logs the selected URL to the browser console:

```
🔗 Using explicit backend URL: https://custom-worker.workers.dev
🔗 Using staging backend URL: https://staging-worker.workers.dev
🔗 Using development backend URL: http://localhost:8787
```

Check the browser console to verify which backend URL is being used.

## Examples

### Frontend-only Development Against Staging

Perfect for developers who only want to work on the frontend:

```bash
# Create app/.env.local
echo "VITE_BACKEND_URL=https://staging-worker.workers.dev" > app/.env.local

# Start development
cd app && pnpm run dev
```

### CI Pipeline for Staging

```yaml
# .github/workflows/staging.yml
env:
  VITE_ENVIRONMENT: staging
  VITE_STAGING_BACKEND_URL: https://staging-worker.workers.dev

steps:
  - name: Build for staging
    run: pnpm run build:staging
```

### Dynamic Backend Configuration

```bash
# Override at runtime
VITE_BACKEND_URL=https://custom-backend.com pnpm run dev

# Or for build
VITE_BACKEND_URL=https://custom-backend.com pnpm run build
