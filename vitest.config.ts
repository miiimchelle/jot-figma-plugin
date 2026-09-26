import path from "path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  // The UI library ships source maps without sources; skip the warnings.
  logLevel: "error",
  esbuild: { jsx: "automatic", jsxImportSource: "preact" },
  plugins: [
    {
      // @create-figma-plugin/ui imports its global CSS as "!../css/base.css".
      name: "global-css",
      enforce: "pre",
      resolveId(id, importer) {
        if (id.startsWith("!") && importer) return path.resolve(path.dirname(importer), id.slice(1));
      },
    },
  ],
  test: {
    globals: true,
    environment: "jsdom",
    include: ["tests/**/*.test.{ts,tsx}"],
    setupFiles: ["tests/setup.ts"],
    server: { deps: { inline: [/@create-figma-plugin/] } },
  },
});
