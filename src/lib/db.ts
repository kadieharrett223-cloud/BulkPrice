import sqlite3 from "sqlite3";
import { open, Database } from "sqlite";
import { DB_SCHEMA } from "./db-schema";
import { PG_SCHEMA } from "./db-schema-postgres";
import path from "path";
import { neon } from "@neondatabase/serverless";

let db: Database | null = null;
let usePostgres = false;

// Check if we should use Postgres (Vercel/production) or SQLite (local dev)
const isProduction = process.env.NODE_ENV === "production" || process.env.POSTGRES_URL;
const connectionString = process.env.POSTGRES_URL || process.env.DATABASE_URL;

// Universal database adapter
export interface DbAdapter {
  get(sql: string, params?: any[]): Promise<any>;
  all(sql: string, params?: any[]): Promise<any[]>;
  run(sql: string, params?: any[]): Promise<any>;
  exec(sql: string): Promise<any>;
}

let pgClient: any = null;

async function initPostgres(): Promise<DbAdapter> {
  if (!connectionString) {
    throw new Error("POSTGRES_URL environment variable required for production");
  }

  const sql = neon(connectionString);

  // Initialize schema - split into individual statements
  try {
    const statements = PG_SCHEMA.split(';').filter(s => s.trim());
    for (const statement of statements) {
      if (statement.trim()) {
        try {
          await sql.unsafe(statement);
        } catch (err) {
          // Ignore table already exists errors
          if (!(err as any).message?.includes('already exists')) {
            console.error('Schema statement error:', err);
          }
        }
      }
    }
    console.log("PostgreSQL database initialized successfully");
  } catch (error) {
    console.log("Schema initialization error:", error);
  }

  // Helper to build parameterized query
  function buildQuery(query: string, params: any[] = []) {
    let paramIndex = 0;
    return query.replace(/\?/g, () => {
      const value = params[paramIndex++];
      if (value === null || value === undefined) return 'NULL';
      if (typeof value === 'string') return `'${value.replace(/'/g, "''")}'`;
      if (typeof value === 'number') return String(value);
      if (typeof value === 'boolean') return value ? 'true' : 'false';
      return `'${JSON.stringify(value).replace(/'/g, "''")}'`;
    });
  }

  // Return adapter that mimics SQLite interface
  return {
    async get(query: string, params: any[] = []) {
      const builtQuery = params.length > 0 ? buildQuery(query, params) : query;
      const result: any = await sql.unsafe(builtQuery);
      return result[0] || null;
    },
    async all(query: string, params: any[] = []) {
      const builtQuery = params.length > 0 ? buildQuery(query, params) : query;
      const result: any = await sql.unsafe(builtQuery);
      return result;
    },
    async run(query: string, params: any[] = []) {
      const builtQuery = params.length > 0 ? buildQuery(query, params) : query;
      return await sql.unsafe(builtQuery);
    },
    async exec(query: string) {
      const statements = query.split(';').filter(s => s.trim());
      for (const statement of statements) {
        if (statement.trim()) {
          await sql.unsafe(statement);
        }
      }
    },
  };
}

async function initSQLite(): Promise<Database> {
  const dbPath = path.join(process.cwd(), "data", "app.db");

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

  console.log("SQLite database initialized successfully at:", dbPath);
  return db;
}

export async function initDb(): Promise<DbAdapter> {
  if (db || pgClient) return pgClient || db!;

  try {
    if (isProduction && connectionString) {
      usePostgres = true;
      pgClient = await initPostgres();
      return pgClient;
    } else {
      db = await initSQLite();
      return db;
    }
  } catch (error) {
    console.error("Database initialization error:", error);
    throw error;
  }
}

export function getDb(): DbAdapter {
  if (!db && !pgClient) {
    throw new Error("Database not initialized. Call initDb() first.");
  }
  return (pgClient || db) as DbAdapter;
}

export async function closeDb(): Promise<void> {
  if (db) {
    await db.close();
    db = null;
  }
  pgClient = null;
}
