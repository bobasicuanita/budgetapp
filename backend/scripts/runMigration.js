import sql from "../config/database.js";
import fs from "fs";

/**
 * Run a specific migration file
 * Usage: node scripts/runMigration.js <migration-file>
 * Example: node scripts/runMigration.js 005_update_wallet_types.sql
 */

async function runMigration() {
  const migrationFile = process.argv[2];
  
  if (!migrationFile) {
    console.error("❌ Please provide a migration file name");
    console.log("Usage: node scripts/runMigration.js <migration-file>");
    console.log("Example: node scripts/runMigration.js 005_update_wallet_types.sql");
    process.exit(1);
  }

  try {
    const migrationPath = `./database/migrations/${migrationFile}`;
    
    if (!fs.existsSync(migrationPath)) {
      console.error(`❌ Migration file not found: ${migrationPath}`);
      process.exit(1);
    }

    console.log(`🔄 Running migration: ${migrationFile}\n`);
    
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    await sql.unsafe(migrationSQL);
    
    console.log(`✅ Migration completed successfully!`);

  } catch (error) {
    console.error("❌ Migration failed:", error.message);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

runMigration();
