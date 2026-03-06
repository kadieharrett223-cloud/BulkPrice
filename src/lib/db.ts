import sqlite3 from "sqlite3";
import { open, Database } from "sqlite";
import { DB_SCHEMA } from "./db-schema";
import path from "path";

let db: Database | null = null;

const dbPath = process.env.DATABASE_URL || path.join(process.cwd(), "data", "app.db");

export async function initDb(): Promise<Database> {
  if (db) return db;

  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });

    // Set pragmas for better performance
    await db.exec("PRAGMA journal_mode = WAL");
    await db.exec("PRAGMA foreign_keys = ON");
    await db.exec("PRAGMA synchronous = NORMAL");

    // Initialize schema
    await db.exec(DB_SCHEMA);

    console.log("Database initialized successfully at:", dbPath);
    return db;
  } catch (error) {
    console.error("Database initialization error:", error);
    throw error;
  }
}

export function getDb(): Database {
  if (!db) {
    throw new Error("Database not initialized. Call initDb() first.");
  }
  return db;
}

export async function closeDb(): Promise<void> {
  if (db) {
    await db.close();
    db = null;
  }
}
