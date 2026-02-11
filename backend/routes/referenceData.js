import express from "express";
import sql from "../config/database.js";
import { authenticateToken } from "../middleware/auth.js";

const router = express.Router();

/**
 * GET /api/user/reference-data
 * Get all categories and tags for the authenticated user
 * Returns both system-defined and user-defined categories and tags
 */
router.get("/reference-data", authenticateToken, async (req, res) => {
  const userId = req.user.userId;

  try {
    // Fetch categories (both system and user-defined)
    const categories = await sql`
      SELECT 
        id,
        name,
        type,
        is_system,
        created_at
      FROM categories
      WHERE is_system = TRUE OR user_id = ${userId}
      ORDER BY is_system DESC, name ASC
    `;

    // Fetch tags (both system and user-defined)
    const tags = await sql`
      SELECT 
        id,
        name,
        is_system,
        created_at
      FROM tags
      WHERE is_system = TRUE OR user_id = ${userId}
      ORDER BY is_system DESC, name ASC
    `;

    // Fetch category-tag suggestions
    const categoryTagSuggestions = await sql`
      SELECT 
        category_id,
        tag_id
      FROM category_tag_suggestions
    `;

    res.json({
      categories,
      tags,
      categoryTagSuggestions
    });

  } catch (error) {
    console.error("Error fetching reference data:", error);
    res.status(500).json({ error: "Failed to fetch reference data" });
  }
});

export default router;
