import sql from "../config/database.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function migrateToPasswordless() {
  try {
    console.log("Migrating to passwordless authentication (OTP only)...\n");
    
    // Drop old tables if they exist
    console.log("Dropping old tables...");
    await sql.unsafe(`
      DROP TABLE IF EXISTS otp_codes CASCADE;
      DROP TABLE IF EXISTS magic_links CASCADE;
    `);
    
    // Modify users table
    console.log("Modifying users table...");
    await sql.unsafe(`
      -- Remove password-related columns
      ALTER TABLE users DROP COLUMN IF EXISTS password;
      ALTER TABLE users DROP COLUMN IF EXISTS email_verified;
      ALTER TABLE users DROP COLUMN IF EXISTS verification_token;
      ALTER TABLE users DROP COLUMN IF EXISTS verification_token_expires;
      ALTER TABLE users DROP COLUMN IF EXISTS reset_password_token;
      ALTER TABLE users DROP COLUMN IF EXISTS reset_password_expires;
      
      -- Add last_login_at if not exists
      ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP;
      
      -- Make name nullable (can be added later)
      ALTER TABLE users ALTER COLUMN name DROP NOT NULL;
    `);
    
    // Read and execute passwordless setup SQL
    console.log("Creating OTP table...");
    const setupSQL = fs.readFileSync(
      path.join(__dirname, "setup_passwordless.sql"),
      "utf-8"
    );
    
    await sql.unsafe(setupSQL);
    
    console.log("\n✅ Migration to passwordless authentication completed successfully!");
    console.log("✅ Users table modified (password removed)");
    console.log("✅ OTP codes table created");
    console.log("✅ Token blacklist table ready");
    console.log("ℹ️  Magic links removed (using OTP only)");
    
    await sql.end();
    process.exit(0);
  } catch (error) {
    console.error("\n❌ Migration failed:", error);
    await sql.end();
    process.exit(1);
  }
}

migrateToPasswordless();
