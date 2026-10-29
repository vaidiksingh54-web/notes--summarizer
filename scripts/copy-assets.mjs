import { cpSync, copyFileSync, existsSync } from "node:fs";
import { execSync } from "node:child_process";

for (const directory of ["css", "js"]) {
  const dirPath = `frontend/${directory}`;
  if (existsSync(dirPath)) {
    cpSync(dirPath, `dist/${directory}`, { recursive: true });
  }
}



if (existsSync("frontend/favicon.svg")) {
  copyFileSync("frontend/favicon.svg", "dist/favicon.svg");
}

