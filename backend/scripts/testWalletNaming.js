import sql from "../config/database.js";

/**
 * Test script to verify wallet naming logic
 * Shows how wallet names would be generated for a user
 */

async function testWalletNaming() {
  try {
    console.log("🧪 Testing Wallet Naming Logic\n");
    
    // Get a test user (or create one)
    let [user] = await sql`
      SELECT id, email FROM users LIMIT 1
    `;
    
    if (!user) {
      console.log("⚠️  No users found. Please create a user first.");
      return;
    }

    console.log(`Testing with user: ${user.email} (ID: ${user.id})\n`);

    // Show existing wallets
    const existingWallets = await sql`
      SELECT id, name, type, starting_balance
      FROM wallets
      WHERE user_id = ${user.id}
      ORDER BY type, created_at
    `;

    if (existingWallets.length > 0) {
      console.log("📋 Existing Wallets:");
      existingWallets.forEach((w, i) => {
        console.log(`  ${i + 1}. ${w.name} (${w.type}) - Balance: ${w.starting_balance}`);
      });
      console.log("");
    } else {
      console.log("📋 No existing wallets\n");
    }

    // Simulate wallet name generation for each type
    console.log("🔮 Next Generated Wallet Names:");
    const types = ['cash', 'bank', 'digital_wallet'];
    
    for (const type of types) {
      const [result] = await sql`
        SELECT COUNT(*) as count
        FROM wallets
        WHERE user_id = ${user.id} AND type = ${type}
      `;
      
      const count = parseInt(result.count);
      const nextNumber = count + 1;
      
      const typeNames = {
        cash: 'Cash',
        bank: 'Bank Account',
        digital_wallet: 'Digital Wallet'
      };
      
      const typeName = typeNames[type];
      const needsWalletSuffix = type === 'cash';
      
      const generatedName = needsWalletSuffix
        ? `${typeName} Wallet ${nextNumber}`
        : `${typeName} ${nextNumber}`;
      
      console.log(`  ${type.padEnd(18)} → "${generatedName}" (${count} existing)`);
    }

    console.log("\n✅ Test completed!");

  } catch (error) {
    console.error("❌ Error:", error.message);
  } finally {
    await sql.end();
  }
}

testWalletNaming();
