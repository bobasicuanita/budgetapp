import postgres from "postgres";
import dotenv from "dotenv";

dotenv.config();

// Create postgres connection
// Note: dotenv.config() is called in index.js
const sql = postgres({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'budgetapp',
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

export default sql;
