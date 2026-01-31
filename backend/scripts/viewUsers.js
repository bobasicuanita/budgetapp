import sql from "../config/database.js";

async function viewUsers() {
  try {
    console.log("📋 Fetching all users from database...\n");
    
    const users = await sql`
      SELECT id, email, name, created_at, updated_at 
      FROM users 
      ORDER BY created_at DESC
    `;
    
    if (users.length === 0) {
      console.log("No users found in database.");
    } else {
      console.log(`Found ${users.length} user(s):\n`);
      
      users.forEach((user, index) => {
        console.log(`${index + 1}. User ID: ${user.id}`);
        console.log(`   Email: ${user.email}`);
        console.log(`   Name: ${user.name}`);
        console.log(`   Created: ${user.created_at}`);
        console.log(`   Updated: ${user.updated_at}`);
        console.log();
      });
    }
    
    await sql.end();
    process.exit(0);
  } catch (error) {
    console.error("❌ Error fetching users:", error);
    await sql.end();
    process.exit(1);
  }
}

viewUsers();
