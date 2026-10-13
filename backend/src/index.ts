import "dotenv/config";
import { createApp } from "./app.js";

const port = Number(process.env.PORT ?? 5000);
const host = process.env.HOST ?? "127.0.0.1";

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error("PORT must be an integer between 1 and 65535.");
}

createApp().listen(port, host, () => {
  console.log(`CogniStudy API listening at http://${host}:${port}`);
  console.warn("Student accounts and study data are in memory until a database adapter is added. Data is lost on restart.");
});
