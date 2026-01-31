import postgres from "postgres";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function initDatabase() {
  let sql;
  
  try {
    console.log("Initializing database...");
    
    // First, connect to postgres database to create budgetapp database if needed
    const sqlAdmin = postgres({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      database: 'postgres', // Connect to default postgres database first
      username: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
    });
    
    // Create database if it doesn't exist
    try {
      await sqlAdmin.unsafe(`CREATE DATABASE ${process.env.DB_NAME || 'budgetapp'}`);
      console.log("✅ Database created");
    } catch (error) {
      if (error.code === '42P04') {
        console.log("ℹ️  Database already exists");
      } else {
        throw error;
      }
    }
    
    await sqlAdmin.end();
    
    // Now connect to the budgetapp database
    sql = postgres({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      database: process.env.DB_NAME || 'budgetapp',
      username: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
    });
    
    // Read the setup SQL file
    const setupSQL = fs.readFileSync(
      path.join(__dirname, "setup.sql"),
      "utf-8"
    );
    
    // Execute the SQL commands
    await sql.unsafe(setupSQL);
    
    console.log("✅ Database initialized successfully!");
    console.log("✅ Users table created");
    
    await sql.end();
    process.exit(0);
  } catch (error) {
    console.error("❌ Database initialization failed:", error);
    if (sql) await sql.end();
    process.exit(1);
  }
}

initDatabase();
