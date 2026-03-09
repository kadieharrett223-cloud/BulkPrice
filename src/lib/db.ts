import sqlite3 from "sqlite3";
import { open, Database } from "sqlite";
import { DB_SCHEMA } from "./db-schema";
import { PG_SCHEMA } from "./db-schema-postgres";
import path from "path";
import { Pool } from "pg";

let db: Database | null = null;
let pool: Pool | null = null;

const postgresUrl = process.env.POSTGRES_URL || process.env.DATABASE_URL;
const sqlitePath = process.env.SQLITE_DATABASE_PATH || path.join(process.cwd(), "data", "app.db");
const isPostgresConnection = Boolean(postgresUrl && postgresUrl.startsWith("postgres"));

// Universal database adapter
export interface DbAdapter {
  get(sql: string, params?: any[]): Promise<any>;
  all(sql: string, params?: any[]): Promise<any[]>;
  run(sql: string, params?: any[]): Promise<any>;
  exec(sql: string): Promise<any>;
}

let pgClient: any = null;

async function initPostgres(): Promise<DbAdapter> {
  if (!postgresUrl) {
    throw new Error("POSTGRES_URL environment variable required for production");
  }

  pool = new Pool({
    connectionString: postgresUrl,
    ssl: postgresUrl.includes("localhost") ? false : { rejectUnauthorized: false },
  });

  const client = await pool.connect();

  // Initialize schema - split into individual statements
  try {
    const statements = PG_SCHEMA.split(";").filter((s) => s.trim());
    for (const statement of statements) {
      if (statement.trim()) {
        try {
          await client.query(statement);
        } catch (err) {
          const message = (err as any)?.message || "";
          if (!message.includes("already exists")) {
            console.error("Schema statement error:", err);
          }
        }
      }
    }
    console.log("PostgreSQL database initialized successfully");
  } catch (error) {
    console.log("Schema initialization error:", error);
  } finally {
    client.release();
  }

  const pgMigrations = [
    "ALTER TABLE products ADD COLUMN IF NOT EXISTS shop TEXT",
    "ALTER TABLE variants ADD COLUMN IF NOT EXISTS shop TEXT",
    "ALTER TABLE priceHistory ADD COLUMN IF NOT EXISTS shop TEXT",
    "ALTER TABLE scheduledChanges ADD COLUMN IF NOT EXISTS shop TEXT",
    "ALTER TABLE scheduledChangeItems ADD COLUMN IF NOT EXISTS shop TEXT",
    "ALTER TABLE activityLog ADD COLUMN IF NOT EXISTS shop TEXT",
    "ALTER TABLE rollbackSnapshots ADD COLUMN IF NOT EXISTS shop TEXT",
  ];

  try {
    const migrateClient = await pool.connect();
    for (const migration of pgMigrations) {
      try {
        await migrateClient.query(migration);
      } catch {
        // Ignore migration errors on already-migrated databases
      }
    }
    migrateClient.release();
  } catch {
    // Ignore migration connection errors during boot
  }

  function toPgQuery(query: string): string {
    let index = 0;
    return query.replace(/\?/g, () => {
      index += 1;
      return `$${index}`;
    });
  }

  const keyMap: Record<string, string> = {
    shopifyid: "shopifyId",
    productid: "productId",
    producttype: "productType",
    compareatprice: "compareAtPrice",
    variantid: "variantId",
    oldprice: "oldPrice",
    newprice: "newPrice",
    oldcompareatprice: "oldCompareAtPrice",
    newcompareatprice: "newCompareAtPrice",
    changetype: "changeType",
    fixedamount: "fixedAmount",
    changegroupid: "changeGroupId",
    starttime: "startTime",
    endtime: "endTime",
    autorevert: "autoRevert",
    scheduledchangeid: "scheduledChangeId",
    originalprice: "originalPrice",
    affectedcount: "affectedCount",
    variantsnapshots: "variantSnapshots",
    expiresat: "expiresAt",
    basecurrency: "baseCurrency",
    currencyrates: "currencyRates",
    lastupdated: "lastUpdated",
    apikey: "apiKey",
    apipassword: "apiPassword",
    createdat: "createdAt",
    updatedat: "updatedAt",
    isonline: "isOnline",
    accesstoken: "accessToken",
    onlineaccessinfo: "onlineAccessInfo",
    userid: "userId",
  };

  function normalizeRow(row: any): any {
    if (!row || typeof row !== "object" || Array.isArray(row)) {
      return row;
    }
    const normalized: Record<string, any> = {};
    Object.entries(row).forEach(([key, value]) => {
      const mappedKey = keyMap[key] || key;
      normalized[mappedKey] = value;
    });
    return normalized;
  }

  // Return adapter that mimics SQLite interface
  return {
    async get(query: string, params: any[] = []) {
      if (!pool) throw new Error("PostgreSQL pool not initialized");
      const result = await pool.query(toPgQuery(query), params);
      return result.rows[0] ? normalizeRow(result.rows[0]) : null;
    },
    async all(query: string, params: any[] = []) {
      if (!pool) throw new Error("PostgreSQL pool not initialized");
      const result = await pool.query(toPgQuery(query), params);
      return result.rows.map((row) => normalizeRow(row));
    },
    async run(query: string, params: any[] = []) {
      if (!pool) throw new Error("PostgreSQL pool not initialized");
      return pool.query(toPgQuery(query), params);
    },
    async exec(query: string) {
      if (!pool) throw new Error("PostgreSQL pool not initialized");
      const statements = query.split(";").filter((s) => s.trim());
      for (const statement of statements) {
        if (statement.trim()) {
          await pool.query(statement);
        }
      }
    },
  };
}

async function initSQLite(): Promise<Database> {
  db = await open({
    filename: sqlitePath,
    driver: sqlite3.Database,
  });

  // Set pragmas for better performance
  await db.exec("PRAGMA journal_mode = WAL");
  await db.exec("PRAGMA foreign_keys = ON");
  await db.exec("PRAGMA synchronous = NORMAL");

  // Initialize schema
  await db.exec(DB_SCHEMA);

  const migrations = [
    "ALTER TABLE products ADD COLUMN shop TEXT",
    "ALTER TABLE variants ADD COLUMN shop TEXT",
    "ALTER TABLE priceHistory ADD COLUMN shop TEXT",
    "ALTER TABLE scheduledChanges ADD COLUMN shop TEXT",
    "ALTER TABLE scheduledChangeItems ADD COLUMN shop TEXT",
    "ALTER TABLE activityLog ADD COLUMN shop TEXT",
    "ALTER TABLE rollbackSnapshots ADD COLUMN shop TEXT",
  ];

  for (const migration of migrations) {
    try {
      await db.exec(migration);
    } catch {
      // Ignore duplicate-column migration attempts
    }
  }

  console.log("SQLite database initialized successfully at:", sqlitePath);
  return db;
}

export async function initDb(): Promise<DbAdapter> {
  if (db || pgClient) return pgClient || db!;

  try {
    if (isPostgresConnection) {
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
  if (pool) {
    await pool.end();
    pool = null;
  }
  pgClient = null;
}
