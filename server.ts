import "dotenv/config";
import express from "express";
import fs from "node:fs";
import path from "node:path";
import { createApp } from "./backend/src/app.ts";

const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || "0.0.0.0";
const isProduction = process.env.NODE_ENV === "production";

async function startServer() {
  const app = createApp();

  if (!isProduction) {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        allowedHosts: true,
        hmr: process.env.DISABLE_HMR !== "true",
      },
      appType: "mpa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), "dist");
    app.use(express.static(distPath, { extensions: ["html"] }));
    app.get("*", (req, res, next) => {
      if (req.path.startsWith("/api")) return next();
      const cleanPath = req.path.replace(/^\/+|\/+$/g, "");
      if (cleanPath) {
        const candidateHtml = path.join(distPath, `${cleanPath}.html`);
        if (fs.existsSync(candidateHtml)) {
          res.sendFile(candidateHtml);
          return;
        }
      }
      const notFoundHtml = path.join(distPath, "404.html");
      if (cleanPath && fs.existsSync(notFoundHtml)) {
        res.status(404).sendFile(notFoundHtml);
        return;
      }
      res.sendFile("index.html", { root: distPath });
    });
  }

  app.listen(PORT, HOST, () => {
    console.log(`CogniStudy AI server listening at http://${HOST}:${PORT}`);
  });
}

startServer();
