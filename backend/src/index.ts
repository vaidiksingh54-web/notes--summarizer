import "dotenv/config";
import { createApp } from "./app.ts";

const port = Number(process.env.PORT ?? 3000);
const host = process.env.HOST ?? "0.0.0.0";

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error("PORT must be an integer between 1 and 65535.");
}

createApp().listen(port, host, () => {
  console.log(`CogniStudy API listening at http://${host}:${port}`);
  console.log("CogniStudy API server is ready with persistent SQLite storage.");
});
