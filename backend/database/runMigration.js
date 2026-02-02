import sql from "../config/database.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigration() {
  const migrationFile = process.argv[2];
  
  if (!migrationFile) {
    console.error("❌ Error: Please provide a migration file name");
    console.log("Usage: npm run db:migrate-run migrations/003_onboarding_wallets.sql");
    process.exit(1);
  }

  const migrationPath = path.join(__dirname, migrationFile);

  if (!fs.existsSync(migrationPath)) {
    console.error(`❌ Error: Migration file not found: ${migrationPath}`);
    process.exit(1);
  }

  console.log(`🔄 Running migration: ${migrationFile}`);
  console.log(`📁 Path: ${migrationPath}`);
  console.log("");

  try {
    // Read the SQL file
    const migrationSQL = fs.readFileSync(migrationPath, "utf8");

    // Execute the migration
    await sql.unsafe(migrationSQL);

    console.log("✅ Migration completed successfully!");
    
    // Show created tables
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `;
    
    console.log("\n📊 Current tables:");
    tables.forEach(table => {
      console.log(`  - ${table.table_name}`);
    });

  } catch (error) {
    console.error("❌ Migration failed:");
    console.error(error.message);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

runMigration();
