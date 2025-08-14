#!/usr/bin/env node

import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const workerDir = join(__dirname, '..');

console.log('🗄️  Setting up staging database manually...');

try {
  // List all databases to see what exists
  console.log('📋 Listing all D1 databases...');
  try {
    const listResult = execSync(
      `pnpm exec wrangler d1 list`, 
      { cwd: workerDir, encoding: 'utf8', stdio: 'inherit' }
    );
  } catch (error) {
    console.log('⚠️  Could not list databases:', error.message);
  }

  // Check current schema of staging database (REMOTE)
  console.log('\n🔍 Checking current REMOTE staging database schema...');
  try {
    const schemaResult = execSync(
      `pnpm exec wrangler d1 execute startup-finance-worksheets-staging --config wrangler.staging.toml --remote --command "SELECT name FROM sqlite_master WHERE type='table';"`, 
      { cwd: workerDir, encoding: 'utf8', stdio: 'inherit' }
    );
  } catch (error) {
    console.log('❌ Could not check remote schema - database might not exist or be accessible');
    console.log('Error:', error.message);
  }

  // Try to run migrations (REMOTE)
  console.log('\n🔧 Running database migrations on REMOTE database...');
  try {
    const migrationResult = execSync(
      `pnpm exec wrangler d1 execute startup-finance-worksheets-staging --config wrangler.staging.toml --remote --file migrations/0001_initial_schema.sql`, 
      { cwd: workerDir, encoding: 'utf8', stdio: 'inherit' }
    );
    console.log('✅ Migrations completed successfully');
  } catch (error) {
    console.log('❌ Migration failed:', error.message);
  }

  // Verify the schema after migration (REMOTE)
  console.log('\n✅ Verifying final REMOTE database schema...');
  try {
    const finalSchemaResult = execSync(
      `pnpm exec wrangler d1 execute startup-finance-worksheets-staging --config wrangler.staging.toml --remote --command "SELECT name FROM sqlite_master WHERE type='table';"`, 
      { cwd: workerDir, encoding: 'utf8', stdio: 'inherit' }
    );
  } catch (error) {
    console.log('❌ Could not verify final remote schema:', error.message);
  }

} catch (error) {
  console.error('❌ Database setup failed:', error.message);
  process.exit(1);
}
