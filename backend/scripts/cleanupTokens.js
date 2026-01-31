import sql from "../config/database.js";

async function cleanupExpiredTokens() {
  try {
    console.log("Cleaning up expired tokens from blacklist...");
    
    const result = await sql`
      DELETE FROM blacklisted_tokens
      WHERE expires_at < NOW()
    `;
    
    console.log(`✅ Removed ${result.count} expired tokens`);
    
    await sql.end();
    process.exit(0);
  } catch (error) {
    console.error("❌ Cleanup failed:", error);
    await sql.end();
    process.exit(1);
  }
}

cleanupExpiredTokens();
