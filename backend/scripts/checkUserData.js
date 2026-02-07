import sql from "../config/database.js";

/**
 * Check user data after onboarding
 * Shows user info, wallets, and refresh tokens
 */

async function checkUserData() {
  try {
    const email = process.argv[2];
    
    if (!email) {
      console.log("❌ Please provide an email address");
      console.log("Usage: node scripts/checkUserData.js user@example.com\n");
      
      // Show all users
      const users = await sql`
        SELECT id, email, name, base_currency, onboarding_completed, created_at
        FROM users
        ORDER BY created_at DESC
        LIMIT 10
      `;
      
      if (users.length > 0) {
        console.log("📋 Recent Users:");
        users.forEach(u => {
          console.log(`  - ${u.email} (ID: ${u.id}) ${u.onboarding_completed ? '✅' : '⏳'}`);
        });
      } else {
        console.log("📋 No users found");
      }
      
      return;
    }

    console.log(`\n🔍 Checking data for: ${email}\n`);

    // Get user
    const [user] = await sql`
      SELECT 
        id, 
        email, 
        name, 
        base_currency, 
        onboarding_completed,
        onboarding_completed_at,
        created_at,
        last_login_at
      FROM users 
      WHERE email = ${email.toLowerCase()}
    `;

    if (!user) {
      console.log("❌ User not found\n");
      return;
    }

    // Display user info
    console.log("👤 User Information:");
    console.log(`   Email: ${user.email}`);
    console.log(`   Name: ${user.name || '(not set)'}`);
    console.log(`   Base Currency: ${user.base_currency || '(not set)'}`);
    console.log(`   Onboarding: ${user.onboarding_completed ? '✅ Completed' : '⏳ Pending'}`);
    if (user.onboarding_completed_at) {
      console.log(`   Completed At: ${user.onboarding_completed_at.toLocaleString()}`);
    }
    console.log(`   Created: ${user.created_at.toLocaleString()}`);
    if (user.last_login_at) {
      console.log(`   Last Login: ${user.last_login_at.toLocaleString()}`);
    }
    console.log("");

    // Get wallets
    const wallets = await sql`
      SELECT 
        id,
        name,
        type,
        currency,
        starting_balance,
        current_balance,
        icon,
        color,
        is_active,
        created_at
      FROM wallets
      WHERE user_id = ${user.id}
      ORDER BY created_at ASC
    `;

    if (wallets.length > 0) {
      console.log("💰 Wallets:");
      wallets.forEach((w, i) => {
        const status = w.is_active ? '✅' : '❌';
        console.log(`   ${i + 1}. ${status} ${w.name}`);
        console.log(`      Type: ${w.type}`);
        console.log(`      Currency: ${w.currency}`);
        console.log(`      Starting Balance: ${w.starting_balance}`);
        console.log(`      Current Balance: ${w.current_balance}`);
        console.log(`      Icon: ${w.icon} | Color: ${w.color}`);
        console.log(`      Created: ${w.created_at.toLocaleString()}`);
        console.log("");
      });

      // Calculate total
      const total = wallets
        .filter(w => w.is_active)
        .reduce((sum, w) => sum + parseFloat(w.current_balance), 0);
      
      console.log(`   💵 Total Balance: ${total.toFixed(2)} ${user.base_currency || ''}`);
      console.log("");
    } else {
      console.log("💰 Wallets: None\n");
    }

    // Get refresh tokens
    const tokens = await sql`
      SELECT 
        id,
        expires_at,
        revoked,
        created_at,
        device_info
      FROM refresh_tokens
      WHERE user_id = ${user.id}
      ORDER BY created_at DESC
      LIMIT 5
    `;

    if (tokens.length > 0) {
      console.log("🔑 Refresh Tokens:");
      tokens.forEach((t, i) => {
        const status = t.revoked ? '❌ Revoked' : (t.expires_at > new Date() ? '✅ Active' : '⏰ Expired');
        console.log(`   ${i + 1}. ${status}`);
        console.log(`      Created: ${t.created_at.toLocaleString()}`);
        console.log(`      Expires: ${t.expires_at.toLocaleString()}`);
        if (t.device_info) {
          console.log(`      Device: ${t.device_info.substring(0, 60)}...`);
        }
        console.log("");
      });
    }

    console.log("✅ Check completed!\n");

  } catch (error) {
    console.error("❌ Error:", error.message);
  } finally {
    await sql.end();
  }
}

checkUserData();
