import { Miniflare } from "miniflare";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const createMiniflare = () => {
  return new Miniflare({
    // Worker configuration
    name: "1984-startup-finance-worker-local",
    scriptPath: path.join(__dirname, "src/index.ts"),
    compatibilityDate: "2025-06-20",
    compatibilityFlags: ["nodejs_compat"],
    
    // Modules configuration
    modules: true,
    modulesRules: [
      { type: "ESModule", include: ["**/*.js", "**/*.mjs"] },
      { type: "Text", include: ["**/*.html"] }
    ],
    
    // Local storage for persistence
    cachePersist: path.join(__dirname, ".miniflare/cache"),
    durableObjectsPersist: path.join(__dirname, ".miniflare/durable-objects"),
    d1Persist: path.join(__dirname, ".miniflare/d1"),
    
    // Durable Objects
    durableObjects: {
      WORKSHEET_COORDINATOR: "WorksheetCoordinatorDurableObject"
    },
    
    // D1 Database
    d1Databases: {
      DB: "local-db"
    },
    
    // Static assets
    assets: {
      directory: path.join(__dirname, "public"),
      binding: "ASSETS"
    },
    
    // Development settings
    host: "localhost",
    port: 8787,
    liveReload: true,
    
    // Logging
    verbose: true,
    log: console
  });
};

// If this file is run directly, start the server
if (import.meta.url === `file://${process.argv[1]}`) {
  const mf = createMiniflare();
  
  console.log("🚀 Starting Miniflare server...");
  console.log("📍 Server will be available at: http://localhost:8787");
  console.log("🗄️  Local database will be stored in: .miniflare/d1");
  console.log("🔄 Durable Objects will be stored in: .miniflare/durable-objects");
  
  // Initialize the database with schema
  mf.getD1Database("DB").then(async (db) => {
    try {
      // Check if tables exist
      const tables = await db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='finance_worksheets'").first();
      
      if (!tables) {
        console.log("🔧 Initializing database schema...");
        const fs = await import("fs/promises");
        const schemaSQL = await fs.readFile(path.join(__dirname, "migrations/0001_initial_schema.sql"), "utf-8");
        
        // Split and execute each statement
        const statements = schemaSQL.split(';').filter(stmt => stmt.trim());
        for (const statement of statements) {
          if (statement.trim()) {
            await db.prepare(statement).run();
          }
        }
        console.log("✅ Database schema initialized successfully!");
      } else {
        console.log("✅ Database schema already exists");
      }
    } catch (error) {
      console.error("❌ Error initializing database:", error);
    }
  });
}
