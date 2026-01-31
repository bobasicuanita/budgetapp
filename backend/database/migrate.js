import sql from "../config/database.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigrations() {
  try {
    console.log("Running database migrations...\n");
    
    const migrationsDir = path.join(__dirname, "migrations");
    const migrationFiles = [
      "add_email_verification.sql",
      "add_token_blacklist.sql",
      "add_password_reset.sql"
    ];
    
    for (const file of migrationFiles) {
      console.log(`Running migration: ${file}`);
      
      const migrationSQL = fs.readFileSync(
        path.join(migrationsDir, file),
        "utf-8"
      );
      
      await sql.unsafe(migrationSQL);
      console.log(`✅ ${file} completed`);
    }
    
    console.log("\n✅ All migrations completed successfully!");
    
    await sql.end();
    process.exit(0);
  } catch (error) {
    console.error("\n❌ Migration failed:", error);
    await sql.end();
    process.exit(1);
  }
}

runMigrations();
