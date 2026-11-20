import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";

const dbPath = path.resolve(process.cwd(), "backend", "study_app.db");

if (process.argv.includes("--reset")) {
  if (fs.existsSync(dbPath)) {
    fs.unlinkSync(dbPath);
    console.log("Local SQLite cache reset.");
  } else {
    console.log("No local SQLite file found to reset.");
  }
  process.exit(0);
}

function isPlaceholder(val) {
  if (!val || !val.trim()) return true;
  return /your[-_]?project|your[-_]?supabase|example\.supabase\.co|placeholder|<project|YOUR_|MY_SUPABASE/i.test(val.trim());
}

async function checkSupabase() {
  const url = process.env.SUPABASE_URL?.trim();
  const key = (
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_KEY ||
    process.env.SUPABASE_SECRET_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    ""
  ).trim();

  console.log("\n==========================================");
  console.log("      COGNISTUDY AI SUPABASE STATUS       ");
  console.log("==========================================");

  if (!url || !key || isPlaceholder(url) || isPlaceholder(key)) {
    console.log("Status        : NOT CONNECTED (Missing or placeholder credentials)");
    console.log("Action Needed : Set real SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
    console.log("                and run supabase_setup.sql in Supabase SQL Editor.\n");
    return false;
  }

  const client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(6000) }),
    },
  });

  const tables = ["students", "sessions", "study_items", "activities", "notifications"];
  let allHealthy = true;

  for (const table of tables) {
    try {
      const { count, error } = await client.from(table).select("*", { count: "exact", head: true });
      if (error) {
        allHealthy = false;
        console.log(`Table [${table.padEnd(13)}] : ERROR -> ${error.message}`);
      } else {
        console.log(`Table [${table.padEnd(13)}] : OK (${count ?? 0} rows)`);
      }
    } catch (err) {
      allHealthy = false;
      console.log(`Table [${table.padEnd(13)}] : UNREACHABLE -> ${err.message}`);
    }
  }

  if (allHealthy) {
    console.log("\nResult        : 100% CONNECTED TO SUPABASE CLOUD DATABASE");
  } else {
    console.log("\nResult        : SUPABASE NEEDS ATTENTION (See table errors above)");
  }
  console.log("==========================================\n");
  return allHealthy;
}

await checkSupabase();

if (fs.existsSync(dbPath)) {
  const stats = fs.statSync(dbPath);
  const db = new DatabaseSync(dbPath);
  console.log("Local SQLite Fallback File:", dbPath, `(${(stats.size / 1024).toFixed(2)} KB)`);
  try {
    const totalStudents = db.prepare("SELECT count(*) as total FROM students").get();
    const totalItems = db.prepare("SELECT count(*) as total FROM study_items").get();
    console.log(`Local Fallback Rows       : ${totalStudents.total} students, ${totalItems.total} study items\n`);
  } catch (_err) {
    // Ignore empty fallback DB
  }
}

