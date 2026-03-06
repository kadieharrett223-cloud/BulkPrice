#!/usr/bin/env node

const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const fs = require("fs");

const dbSchemaPath = path.join(__dirname, "..", "src", "lib", "db-schema.ts");
const dbSchemaSource = fs.readFileSync(dbSchemaPath, "utf8");
const schemaMatch = dbSchemaSource.match(/DB_SCHEMA\s*=\s*`([\s\S]*?)`;/);
if (!schemaMatch) {
  console.error("Error loading database schema from src/lib/db-schema.ts");
  process.exit(1);
}
const DB_SCHEMA = schemaMatch[1];

const dbDir = path.join(__dirname, "..", "data");
const dbPath = path.join(dbDir, "app.db");

// Create data directory if it doesn't exist
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
  console.log(`✓ Created data directory at ${dbDir}`);
}

// Initialize database
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error("Error opening database:", err.message);
    process.exit(1);
  }

  console.log(`✓ Connected to SQLite database at ${dbPath}`);

  // Execute schema
  db.exec(DB_SCHEMA, (err) => {
    if (err) {
      console.error("Error initializing database schema:", err.message);
      process.exit(1);
    }

    console.log("✓ Database schema initialized successfully");

    // Enable pragmas for better performance
    db.serialize(() => {
      db.run("PRAGMA journal_mode = WAL");
      db.run("PRAGMA foreign_keys = ON");
      db.run("PRAGMA synchronous = NORMAL");
      console.log("✓ Database pragmas configured");

      // Close connection
      db.close((err) => {
        if (err) {
          console.error("Error closing database:", err.message);
          process.exit(1);
        }

        console.log(
          "\n✅ Database initialization complete!\n"
        );
        console.log("You can now start the application with: npm run dev");
        process.exit(0);
      });
    });
  });
});
