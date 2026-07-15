import { defineConfig } from "tsup";

export default defineConfig([
  {
    entry: ["src/index.ts"],
    format: ["esm", "cjs"],
    dts: true,
    clean: true,
    sourcemap: true,
  },
  {
    entry: ["src/cli.ts"],
    format: ["esm"],
    clean: false,
    sourcemap: true,
    noExternal: [/.*/], // bundle everything so CLI is self-contained
  },
]);
