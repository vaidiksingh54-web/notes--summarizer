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

  app.get("/CogniStudy_AI_Presentation.pdf", (_req, res, next) => {
    const pdfPath = path.resolve(process.cwd(), "CogniStudy_AI_Presentation.pdf");
    if (fs.existsSync(pdfPath)) {
      res.type("application/pdf");
      res.sendFile(pdfPath);
      return;
    }
    next();
  });

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

  const server = app.listen(PORT, HOST, () => {
    console.log(`CogniStudy AI server listening at http://${HOST}:${PORT}`);
  });

  server.on("error", (err) => {
    console.error(`Server failed to bind ${HOST}:${PORT}:`, err);
    process.exit(1);
  });
}

startServer().catch((err) => {
  console.error("Fatal error starting CogniStudy AI server:", err);
  process.exit(1);
});
