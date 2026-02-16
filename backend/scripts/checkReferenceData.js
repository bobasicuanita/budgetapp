import sql from "../config/database.js";

async function checkReferenceData() {
  try {
    console.log("\n=== Categories ===");
    const categories = await sql`
      SELECT id, name, type, icon, is_system
      FROM categories
      ORDER BY type, name
      LIMIT 10
    `;
    console.table(categories);
    console.log(`Total categories: ${categories.length}`);

    console.log("\n=== Tags ===");
    const tags = await sql`
      SELECT id, name, is_system
      FROM tags
      ORDER BY name
      LIMIT 10
    `;
    console.table(tags);
    console.log(`Total tags: ${tags.length}`);

    console.log("\n=== Category-Tag Suggestions ===");
    const suggestions = await sql`
      SELECT category_id, tag_id
      FROM category_tag_suggestions
      LIMIT 10
    `;
    console.table(suggestions);
    console.log(`Total suggestions: ${suggestions.length}`);

  } catch (error) {
    console.error("Error:", error);
  } finally {
    await sql.end();
  }
}

checkReferenceData();
