import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";

const dbPath = path.resolve(process.cwd(), "backend", "study_app.db");

if (process.argv.includes("--reset")) {
  if (fs.existsSync(dbPath)) {
    fs.unlinkSync(dbPath);
    console.log("Database reset! Starting the server (npm run dev) will regenerate fresh tables and standard demo data.");
  } else {
    console.log("No database file found to reset.");
  }
  process.exit(0);
}

if (!fs.existsSync(dbPath)) {
  console.log("No database file found at: " + dbPath);
  console.log("Start the server once (npm run dev) to automatically generate your database!");
  process.exit(0);
}

const stats = fs.statSync(dbPath);
const db = new DatabaseSync(dbPath);

console.log("\n==========================================");
console.log("      COGNISTUDY AI DATABASE STATUS       ");
console.log("==========================================");
console.log(`Database File : ${dbPath}`);
console.log(`File Size     : ${(stats.size / 1024).toFixed(2)} KB\n`);

try {
  const students = db.prepare("SELECT id, email, profile FROM students").all();
  console.log(`Students (${students.length}):`);
  for (const s of students) {
    const profile = JSON.parse(s.profile || "{}");
    console.log(`  - [${s.id}] ${profile.name || "Student"} <${s.email}> (${profile.college || "General"})`);
  }

  const items = db.prepare("SELECT type, count(*) as count FROM study_items GROUP BY type").all();
  console.log("\nSaved Study Items:");
  if (items.length === 0) {
    console.log("  (None yet)");
  } else {
    for (const item of items) {
      console.log(`  - ${item.type.toUpperCase()}: ${item.count}`);
    }
  }

  const totalItems = db.prepare("SELECT count(*) as total FROM study_items").get();
  console.log(`  Total Items: ${totalItems.total}`);

  const sessions = db.prepare("SELECT count(*) as total FROM sessions").get();
  console.log(`\nActive Login Sessions : ${sessions.total}`);

  const activities = db.prepare("SELECT count(*) as total FROM activities").get();
  console.log(`Recorded Activities   : ${activities.total}`);
} catch (err) {
  console.error("Error reading database:", err.message);
}
console.log("==========================================\n");

