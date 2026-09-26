// Bundles ui/main.tsx and inlines the JS and CSS into dist/ui.html (Figma plugins load one HTML file).
// Usage: node scripts/build-ui.mjs [--watch]
import * as esbuild from "esbuild";
import { mkdirSync, writeFileSync } from "fs";
import path from "path";
import { caseCollisions } from "./css-check.mjs";

const OUT = "dist/ui.html";

// @create-figma-plugin/ui imports its global CSS as "!../css/base.css".
const globalCss = {
  name: "global-css",
  setup(build) {
    build.onResolve({ filter: /^!/ }, (args) => ({ path: path.resolve(args.resolveDir, args.path.slice(1)) }));
  },
};

const inlineHtml = {
  name: "inline-html",
  setup(build) {
    build.onEnd(async (result) => {
      if (result.errors.length) return;
      const file = (ext) => result.outputFiles.find((f) => f.path.endsWith(ext))?.text ?? "";
      const clashes = caseCollisions(file(".css"));
      if (clashes.length) throw new Error(`CSS class names differ only by case: ${JSON.stringify(clashes)}`);
      // Minify JS names in a second pass so CSS module class names (strings) stay long.
      const { code } = await esbuild.transform(file(".js"), { minify: true, target: "es2017" });
      // Keep a literal </script> inside the bundle from closing the tag.
      const js = code.replace(/<\/script/gi, "<\\/script");
      const html = `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<style>${file(".css")}</style>
</head>
<body>
<div id="root"></div>
<script>${js}</script>
</body>
</html>
`;
      mkdirSync(path.dirname(OUT), { recursive: true });
      writeFileSync(OUT, html);
      console.log(`Built ${OUT} (${(html.length / 1024).toFixed(1)} KB)`);
    });
  },
};

const options = {
  entryPoints: ["ui/main.tsx"],
  bundle: true,
  write: false,
  outdir: "dist/ui-build",
  format: "iife",
  target: "es2017",
  // Keep CSS module class names readable: minified ones like ".jo" and ".Jo" clash in quirks mode.
  minifyWhitespace: true,
  minifySyntax: true,
  minifyIdentifiers: false,
  jsx: "automatic",
  jsxImportSource: "preact",
  loader: { ".module.css": "local-css", ".css": "css" },
  plugins: [globalCss, inlineHtml],
  logLevel: "warning",
};

if (process.argv.includes("--watch")) {
  const ctx = await esbuild.context(options);
  await ctx.watch();
} else {
  await esbuild.build(options);
}
