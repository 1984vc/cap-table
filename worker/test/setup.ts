import { env } from "cloudflare:test";

// Initialize the database schema before running tests
export async function setupDatabase() {
  const schema = `
    CREATE TABLE IF NOT EXISTS finance_worksheets (
      id TEXT PRIMARY KEY,
      edit_key TEXT NOT NULL,
      worksheet_data TEXT NOT NULL,
      version INTEGER NOT NULL DEFAULT 1,
      last_modified TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
  `;

  try {
    await env.DB.exec(schema);
    console.log("✅ Test database schema initialized");
  } catch (error) {
    console.error("❌ Failed to initialize test database schema:", error);
    throw error;
  }
}
