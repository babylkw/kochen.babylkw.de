import * as fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";
import { examples } from "../lib/recipes.ts";

const root = fileURLToPath(new URL("../", import.meta.url));
const output = path.join(root, "dist");
await fs.rm(output, { recursive: true, force: true });
await fs.mkdir(output, { recursive: true });
for (const file of ["index.html", "favicon.svg", "bilder"]) {
  await fs.cp(path.join(root, "web", file), path.join(output, file), { recursive: true });
}
for (const recipe of examples) {
  if (recipe.photo) await fs.access(path.join(output, "bilder", recipe.photo + ".webp"));
}

await build({
  absWorkingDir: root,
  entryPoints: ["strato/einstieg.tsx"],
  bundle: true,
  minify: true,
  target: "safari15.4",
  define: { "process.env.NODE_ENV": '"production"' },
  outfile: path.join(output, "kochbuch.js"),
});
