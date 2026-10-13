import { cpSync, copyFileSync, existsSync } from "node:fs";
import { execSync } from "node:child_process";

for (const directory of ["css", "js"]) {
  if (existsSync(directory)) {
    cpSync(directory, `dist/${directory}`, { recursive: true });
  }
}

// Bundle firebase.js with esbuild so all browsers resolve Firebase imports without bare specifier errors
try {
  execSync("npx esbuild js/firebase.js --bundle --format=esm --outfile=dist/js/firebase.js --minify", { stdio: "inherit" });
} catch (error) {
  console.warn("Could not bundle firebase.js:", error);
}

if (existsSync("favicon.svg")) {
  copyFileSync("favicon.svg", "dist/favicon.svg");
}

