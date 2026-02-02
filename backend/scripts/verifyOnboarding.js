import sql from "../config/database.js";

async function verifyOnboarding() {
  try {
    console.log("🔍 Verifying onboarding setup...\n");

    // Check users table columns
    console.log("📋 Users table columns:");
    const userColumns = await sql`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'users'
      ORDER BY ordinal_position
    `;
    userColumns.forEach(col => {
      const nullable = col.is_nullable === 'YES' ? '(nullable)' : '(required)';
      console.log(`  - ${col.column_name}: ${col.data_type} ${nullable}`);
    });

    // Check wallets table
    console.log("\n📋 Wallets table columns:");
    const walletColumns = await sql`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'wallets'
      ORDER BY ordinal_position
    `;
    walletColumns.forEach(col => {
      const nullable = col.is_nullable === 'YES' ? '(nullable)' : '(required)';
      console.log(`  - ${col.column_name}: ${col.data_type} ${nullable}`);
    });

    // Check if any users exist
    console.log("\n👥 Users count:");
    const [{ count }] = await sql`SELECT COUNT(*) as count FROM users`;
    console.log(`  Total users: ${count}`);

    // Check if any wallets exist
    console.log("\n💰 Wallets count:");
    const [{ count: walletCount }] = await sql`SELECT COUNT(*) as count FROM wallets`;
    console.log(`  Total wallets: ${walletCount}`);

    console.log("\n✅ Onboarding setup verified!");

  } catch (error) {
    console.error("❌ Verification failed:", error.message);
  } finally {
    await sql.end();
  }
}

verifyOnboarding();
