#!/usr/bin/env node

import { execSync } from 'child_process';
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const workerDir = join(__dirname, '..');

// Parse command line arguments
const args = process.argv.slice(2);
let environment = args[0] || 'production';

// Handle case where script is called with extra arguments (like from pnpm)
// If first arg is not valid, check if second arg is valid (common with pnpm run deploy staging)
if (!['staging', 'production'].includes(environment) && args[1] && ['staging', 'production'].includes(args[1])) {
  environment = args[1];
}

// Default to production if still not valid
if (!['staging', 'production'].includes(environment)) {
  environment = 'production';
}

console.log(`🚀 Deploying to ${environment} environment...`);

try {
  // Step 1: Build the app first
  console.log('📦 Building frontend application...');
  execSync('cd ../app && pnpm run build', { 
    stdio: 'inherit', 
    cwd: workerDir 
  });

  // Step 2: Assets are already built directly to worker/public by Vite config
  console.log('✅ Assets built directly to worker/public directory');

  // Step 3: Handle database setup for staging
  if (environment === 'staging') {
    console.log('🗄️  Setting up staging database...');
    
    try {
      // Try to create the staging database
      const createDbResult = execSync(
        `pnpm exec wrangler d1 create startup-finance-worksheets-staging --config wrangler.staging.toml`, 
        { cwd: workerDir, encoding: 'utf8', stdio: 'pipe' }
      );
      
      // Extract database ID from the output
      const dbIdMatch = createDbResult.match(/database_id = "([^"]+)"/);
      if (dbIdMatch) {
        const dbId = dbIdMatch[1];
        console.log(`✅ Created staging database with ID: ${dbId}`);
        
        // Update the staging config with the real database ID
        const configPath = join(workerDir, 'wrangler.staging.toml');
        let config = readFileSync(configPath, 'utf8');
        config = config.replace('database_id = "staging-db-placeholder"', `database_id = "${dbId}"`);
        writeFileSync(configPath, config);
        console.log('✅ Updated staging configuration with database ID');
      }
    } catch (error) {
      // Database might already exist, that's okay
      console.log('ℹ️  Staging database already exists or creation failed - continuing...');
    }

    // Run migrations for staging database
    try {
      console.log('🔧 Running database migrations for staging...');
      execSync(
        `pnpm exec wrangler d1 execute startup-finance-worksheets-staging --config wrangler.staging.toml --file migrations/0001_initial_schema.sql`, 
        { stdio: 'pipe', cwd: workerDir }
      );
      console.log('✅ Database migrations completed for staging');
    } catch (error) {
      // Check if it's the expected "table already exists" error
      if (error.message.includes('already exists') || error.message.includes('SQLITE_ERROR')) {
        console.log('ℹ️  Database migrations have already been applied - skipping');
      } else {
        console.log('⚠️  Database migration warning:', error.message.split('\n')[0]);
      }
    }
  }

  // Step 4: Deploy the worker
  console.log(`🚀 Deploying worker to ${environment}...`);
  const configFile = `wrangler.${environment}.toml`;
  
  execSync(`pnpm exec wrangler deploy --config ${configFile}`, { 
    stdio: 'inherit', 
    cwd: workerDir 
  });

  // Step 5: Get the deployment URL
  const workerName = environment === 'staging' 
    ? '1984-startup-finance-worker-staging' 
    : '1984-startup-finance-worker';
  
  console.log('');
  console.log('🎉 Deployment successful!');
  console.log('');
  console.log(`📍 ${environment.toUpperCase()} URLs:`);
  console.log(`   Worker: https://${workerName}.mdp-005.workers.dev`);
  console.log(`   App:    https://${workerName}.mdp-005.workers.dev`);
  console.log('');
  
  if (environment === 'staging') {
    console.log('💡 To test frontend against this staging backend:');
    console.log(`   VITE_BACKEND_URL=https://${workerName}.mdp-005.workers.dev pnpm run dev`);
    console.log('');
    console.log('💡 Or update app/.env.staging:');
    console.log(`   VITE_STAGING_BACKEND_URL=https://${workerName}.mdp-005.workers.dev`);
  }

} catch (error) {
  console.error('❌ Deployment failed:', error.message);
  process.exit(1);
}
