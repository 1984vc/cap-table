import { defineWorkersConfig } from "@cloudflare/vitest-pool-workers/config";

export default defineWorkersConfig({
  test: {
    poolOptions: {
      workers: {
        wrangler: { configPath: "./wrangler.local.toml" },
        miniflare: {
          // Set up the database with the schema for testing
          d1Databases: {
            DB: "startup-finance-worksheets-local"
          },
          d1Persist: true,
        },
      },
    },
  },
});
