import sql from "../config/database.js";

async function checkIncomeTags() {
  try {
    console.log("\n=== Tag Suggestions for Income Categories ===");
    const results = await sql`
      SELECT 
        c.name as category,
        COUNT(*) as tag_count
      FROM category_tag_suggestions cts
      JOIN categories c ON c.id = cts.category_id
      WHERE c.type = 'income'
      GROUP BY c.name
      ORDER BY c.name
    `;
    console.table(results);
    
    console.log("\n=== All Income Categories ===");
    const incomeCategories = await sql`
      SELECT name, type
      FROM categories
      WHERE type = 'income' AND is_system = true
      ORDER BY name
    `;
    console.table(incomeCategories);

  } catch (error) {
    console.error("Error:", error);
  } finally {
    await sql.end();
  }
}

checkIncomeTags();
