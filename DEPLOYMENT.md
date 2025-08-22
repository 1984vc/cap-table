# Deployment Guide

This guide explains how to deploy the startup-finance application to staging and production environments.

## Overview

The application supports two deployment environments:
- **Staging**: `1984-startup-finance-worker-staging` - For testing and development
- **Production**: `1984-startup-finance-worker` - For live users

## Prerequisites

1. **Cloudflare Account**: You need a Cloudflare account with Workers enabled
2. **Wrangler CLI**: Installed and authenticated (`wrangler login`)
3. **Dependencies**: Run `pnpm run install:all` to install all dependencies

## Quick Deployment

### Deploy to Staging
```bash
pnpm run deploy:staging
```

### Deploy to Production
```bash
pnpm run deploy:production
```

## What Happens During Deployment

1. **Frontend Build**: The React app is built with environment-specific configuration
2. **Asset Copy**: Built assets are copied to the worker's public directory
3. **Database Setup** (staging only): Creates and initializes the staging database
4. **Worker Deployment**: Deploys the worker with the appropriate configuration
5. **URL Display**: Shows the deployment URLs for easy access

## Environment Configurations

### Staging Environment
- **Worker Name**: `1984-startup-finance-worker-staging`
- **Database**: `startup-finance-worksheets-staging` (auto-created)
- **URL**: `https://1984-startup-finance-worker-staging.mdp-005.workers.dev`
- **Config File**: `worker/wrangler.staging.toml`

### Production Environment
- **Worker Name**: `1984-startup-finance-worker`
- **Database**: `startup-finance-worksheets` (existing)
- **URL**: `https://1984-startup-finance-worker.mdp-005.workers.dev`
- **Config File**: `worker/wrangler.production.toml`

## Available Commands

### Root Level Commands
| Command | Description |
|---------|-------------|
| `pnpm run deploy` | Deploy to production (default) |
| `pnpm run deploy:staging` | Deploy to staging environment |
| `pnpm run deploy:production` | Deploy to production environment |

### Worker-specific Commands
| Command | Description |
|---------|-------------|
| `cd worker && pnpm run deploy` | Deploy to production |
| `cd worker && pnpm run deploy:staging` | Deploy to staging |
| `cd worker && pnpm run deploy:production` | Deploy to production |

## Testing Deployments

### Test Staging Deployment
After deploying to staging, you can test it by:

1. **Direct URL access**: Visit the staging URL directly
2. **Frontend against staging**: 
   ```bash
   VITE_BACKEND_URL=https://1984-startup-finance-worker-staging.mdp-005.workers.dev pnpm run dev
   ```
3. **Environment mode**:
   ```bash
   pnpm run dev:staging
   ```

### Test Production Deployment
After deploying to production:

1. **Direct URL access**: Visit the production URL
2. **Frontend against production**:
   ```bash
   pnpm run dev:production
   ```

## Database Management

### Staging Database
- **Auto-created**: The staging database is automatically created during first deployment
- **Migrations**: Database schema is automatically applied
- **Isolation**: Completely separate from production data

### Production Database
- **Existing**: Uses the existing production database
- **Migrations**: Manual migration management (be careful!)
- **Data**: Contains live user data

## Troubleshooting

### Database Creation Issues
If staging database creation fails:
```bash
cd worker
wrangler d1 create startup-finance-worksheets-staging --config wrangler.staging.toml
```

### Migration Issues
If database migrations fail:
```bash
cd worker
wrangler d1 execute startup-finance-worksheets-staging --config wrangler.staging.toml --file migrations/0001_initial_schema.sql
```

### Deployment Failures
1. **Check authentication**: `wrangler whoami`
2. **Check configuration**: Verify wrangler.*.toml files
3. **Check dependencies**: Run `pnpm run install:all`
4. **Check build**: Try `cd app && pnpm run build` manually

## CI/CD Integration

The project includes automated GitHub Actions workflows for deployment:

### Automated Deployments

**Production Deployment:**
- **Trigger**: Push to `v3` branch
- **Workflow**: `.github/workflows/deploy-production.yml`
- **Target**: `https://1984-startup-finance-worker.mdp-005.workers.dev`

**Staging Deployment:**
- **Trigger**: Push to `staging` branch  
- **Workflow**: `.github/workflows/deploy-staging.yml`
- **Target**: `https://1984-startup-finance-worker-staging.mdp-005.workers.dev`

### Workflow Features
- **Automatic dependency installation** with pnpm
- **Environment-specific deployment** using our deployment scripts
- **Deployment summaries** with URLs and testing instructions
- **Error handling** for database setup and migrations

### Required GitHub Secrets
- `CLOUDFLARE_API_TOKEN`: Your Cloudflare API token with Workers:Edit permissions

### Setup Instructions
1. Generate a Cloudflare API token at https://dash.cloudflare.com/profile/api-tokens
2. Add the token as `CLOUDFLARE_API_TOKEN` in your GitHub repository secrets
3. Push to `v3` branch to deploy to production
4. Push to `staging` branch to deploy to staging

### Branch Strategy
- `v3` → Production deployment
- `staging` → Staging deployment
- Other branches → No automatic deployment (manual only)

## Best Practices

1. **Test in Staging First**: Always deploy to staging before production
2. **Database Backups**: Consider backing up production database before major changes
3. **Gradual Rollouts**: Test thoroughly in staging environment
4. **Monitor Deployments**: Check worker logs after deployment
5. **Version Control**: Tag releases for easy rollback

## URLs Reference

After successful deployment, you'll see:

**Staging:**
- Worker API: `https://1984-startup-finance-worker-staging.mdp-005.workers.dev`
- Full App: `https://1984-startup-finance-worker-staging.mdp-005.workers.dev`

**Production:**
- Worker API: `https://1984-startup-finance-worker.mdp-005.workers.dev`
- Full App: `https://1984-startup-finance-worker.mdp-005.workers.dev`

## Rollback Strategy

If you need to rollback a deployment:

1. **Redeploy Previous Version**: Deploy from a previous git commit
2. **Database Rollback**: Restore database from backup (if needed)
3. **DNS/CDN**: Update any external references

## Support

For deployment issues:
1. Check the deployment logs
2. Verify Cloudflare dashboard for worker status
3. Test API endpoints directly
4. Check browser console for frontend issues
