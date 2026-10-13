import "dotenv/config";
import express from "express";
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
      server: { middlewareMode: true },
      appType: "mpa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res, next) => {
      if (req.path.startsWith("/api")) return next();
      res.sendFile("index.html", { root: distPath });
    });
  }

  app.listen(PORT, HOST, () => {
    console.log(`CogniStudy AI server listening at http://${HOST}:${PORT}`);
  });
}

startServer();
