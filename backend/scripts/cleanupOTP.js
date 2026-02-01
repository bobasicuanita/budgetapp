import sql from "../config/database.js";

async function cleanupExpiredOTP() {
  try {
    console.log("Cleaning up expired OTP codes and blacklisted tokens...");
    
    // Delete expired OTP codes
    const otpResult = await sql`
      DELETE FROM otp_codes
      WHERE expires_at < NOW()
    `;
    
    // Delete expired blacklisted tokens
    const tokenResult = await sql`
      DELETE FROM blacklisted_tokens
      WHERE expires_at < NOW()
    `;
    
    console.log(`✅ Removed ${otpResult.count} expired OTP codes`);
    console.log(`✅ Removed ${tokenResult.count} expired blacklisted tokens`);
    
    await sql.end();
    process.exit(0);
  } catch (error) {
    console.error("❌ Cleanup failed:", error);
    await sql.end();
    process.exit(1);
  }
}

cleanupExpiredOTP();
