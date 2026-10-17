import { cpSync, copyFileSync, existsSync } from "node:fs";
import { execSync } from "node:child_process";

for (const directory of ["css", "js"]) {
  const dirPath = `frontend/${directory}`;
  if (existsSync(dirPath)) {
    cpSync(dirPath, `dist/${directory}`, { recursive: true });
  }
}

// Bundle firebase.js with esbuild so all browsers resolve Firebase imports without bare specifier errors
try {
  execSync("npx esbuild frontend/js/firebase.js --bundle --format=esm --outfile=frontend/js/firebase.bundle.js --minify", { stdio: "inherit" });
  execSync("npx esbuild frontend/js/firebase.js --bundle --format=esm --outfile=dist/js/firebase.bundle.js --minify", { stdio: "inherit" });
} catch (error) {
  console.warn("Could not bundle firebase.bundle.js:", error);
}

if (existsSync("frontend/favicon.svg")) {
  copyFileSync("frontend/favicon.svg", "dist/favicon.svg");
}

