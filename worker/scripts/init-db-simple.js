import { Miniflare } from "miniflare";
import { readFile } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function initializeDatabase() {
  console.log("🔧 Initializing local database...");
  
  // Create a minimal Miniflare instance just for database initialization
  const mf = new Miniflare({
    name: "db-init",
    script: `
      export default {
        async fetch(request, env) {
          return new Response("Database initialization worker");
        }
      };
    `,
    compatibilityDate: "2025-06-20",
    modules: true,
    d1Databases: {
      DB: "local-db"
    },
    d1Persist: path.join(__dirname, "../.miniflare/d1"),
  });

  try {
    const db = await mf.getD1Database("DB");
    
    // Check if tables already exist
    const tables = await db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='finance_worksheets'").first();
    
    if (tables) {
      console.log("✅ Database already initialized");
      return;
    }

    // Read and execute schema
    const schemaSQL = await readFile(path.join(__dirname, "../migrations/0001_initial_schema.sql"), "utf-8");
    
    // Split and execute each statement
    const statements = schemaSQL.split(';').filter(stmt => stmt.trim());
    for (const statement of statements) {
      if (statement.trim()) {
        await db.prepare(statement).run();
      }
    }
    
    console.log("✅ Database schema initialized successfully!");
    console.log("📍 Database location: .miniflare/d1/");
    
  } catch (error) {
    console.error("❌ Error initializing database:", error);
    process.exit(1);
  } finally {
    await mf.dispose();
  }
}

initializeDatabase();
