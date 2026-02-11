import sql from "../config/database.js";

async function checkWalletsTable() {
  try {
    // Check if wallets table exists and its structure
    const columns = await sql`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'wallets'
      ORDER BY ordinal_position
    `;

    console.log("Wallets table structure:");
    console.table(columns);

  } catch (error) {
    console.error("Error:", error);
  } finally {
    await sql.end();
  }
}

checkWalletsTable();
