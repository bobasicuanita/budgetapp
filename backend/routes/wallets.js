import express from "express";
import sql from "../config/database.js";
import { authenticateToken } from "../middleware/auth.js";

const router = express.Router();

/**
 * GET /api/wallets
 * Get all wallets for authenticated user
 */
router.get("/", authenticateToken, async (req, res) => {
  const userId = req.user.userId;

  try {
    // Get user's base currency
    const [user] = await sql`
      SELECT base_currency 
      FROM users 
      WHERE id = ${userId}
    `;

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
        include_in_balance,
        created_at
      FROM wallets
      WHERE user_id = ${userId} AND is_active = TRUE
      ORDER BY created_at ASC
    `;

    // Calculate total net worth (in base currency - for now just sum all)
    const totalNetWorth = wallets.reduce((sum, wallet) => {
      return sum + parseFloat(wallet.current_balance);
    }, 0);

    res.json({
      wallets,
      totalNetWorth,
      baseCurrency: user?.base_currency || 'USD'
    });

  } catch (error) {
    console.error("Error fetching wallets:", error);
    res.status(500).json({ error: "Failed to fetch wallets" });
  }
});

/**
 * POST /api/wallets
 * Add a new wallet
 */
router.post("/", authenticateToken, async (req, res) => {
  const { name, type, currency, starting_balance, icon, color, include_in_balance } = req.body;
  const userId = req.user.userId;

  try {
    // Validate wallet type (currency-based accounts only)
    const validTypes = ['cash', 'bank', 'digital_wallet'];
    if (!type || !validTypes.includes(type)) {
      return res.status(400).json({ 
        error: `Invalid wallet type. Must be one of: ${validTypes.join(', ')}` 
      });
    }

    // Validate wallet name length (if provided)
    if (name && name.length > 32) {
      return res.status(400).json({ 
        error: "Wallet name must not exceed 32 characters"
      });
    }

    // Default starting_balance to 0 if not provided
    const startingBalance = starting_balance ?? 0;
    
    // Default include_in_balance to true if not provided
    const includeInBalance = include_in_balance ?? true;

    // Get user's base currency as default
    const [user] = await sql`SELECT base_currency FROM users WHERE id = ${userId}`;
    const walletCurrency = currency || user.base_currency || 'EUR';

    // Get defaults
    const { icon: defaultIcon, color: defaultColor } = getWalletDefaults(type);
    
    // Generate smart wallet name if not provided
    const walletName = name || await generateWalletName(sql, userId, type);

    // Create wallet
    const [wallet] = await sql`
      INSERT INTO wallets (
        user_id,
        name,
        type,
        currency,
        starting_balance,
        current_balance,
        icon,
        color,
        include_in_balance
      )
      VALUES (
        ${userId},
        ${walletName},
        ${type},
        ${walletCurrency.toUpperCase()},
        ${startingBalance},
        ${startingBalance},
        ${icon || defaultIcon},
        ${color || defaultColor},
        ${includeInBalance}
      )
      RETURNING *
    `;

    res.status(201).json({
      message: "Wallet created successfully",
      wallet
    });

  } catch (error) {
    console.error("Error creating wallet:", error);
    
    // Check if error is numeric overflow
    if (error.message && error.message.includes('numeric field overflow')) {
      return res.status(400).json({ 
        error: "Starting balance exceeds the maximum allowed wallet balance of 9,999,999,999,999" 
      });
    }
    
    res.status(500).json({ error: "Failed to create wallet" });
  }
});

/**
 * PUT /api/wallets/:id
 * Update an existing wallet
 */
router.put("/:id", authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { name, type, currency, starting_balance, include_in_balance } = req.body;
  const userId = req.user.userId;

  try {
    // Verify wallet belongs to user
    const [existingWallet] = await sql`
      SELECT * FROM wallets 
      WHERE id = ${id} AND user_id = ${userId}
    `;

    if (!existingWallet) {
      return res.status(404).json({ error: "Wallet not found" });
    }

    // Validate wallet type (currency-based accounts only)
    if (type) {
      const validTypes = ['cash', 'bank', 'digital_wallet'];
      if (!validTypes.includes(type)) {
        return res.status(400).json({ 
          error: `Invalid wallet type. Must be one of: ${validTypes.join(', ')}` 
        });
      }
    }

    // Validate wallet name length (if provided)
    if (name && name.length > 50) {
      return res.status(400).json({ 
        error: "Wallet name must not exceed 50 characters"
      });
    }

    // Build update object with only provided fields
    const updates = {};
    if (name !== undefined) updates.name = name;
    if (type !== undefined) {
      updates.type = type;
      // Update icon and color based on new type
      const { icon, color } = getWalletDefaults(type);
      updates.icon = icon;
      updates.color = color;
    }
    if (currency !== undefined) updates.currency = currency.toUpperCase();
    if (starting_balance !== undefined) updates.starting_balance = starting_balance;
    if (include_in_balance !== undefined) updates.include_in_balance = include_in_balance;

    // Update wallet
    const [updatedWallet] = await sql`
      UPDATE wallets 
      SET 
        ${sql(updates)},
        updated_at = NOW()
      WHERE id = ${id} AND user_id = ${userId}
      RETURNING *
    `;

    res.status(200).json({
      message: "Wallet updated successfully",
      wallet: updatedWallet
    });

  } catch (error) {
    console.error("Error updating wallet:", error);
    
    // Check if error is numeric overflow
    if (error.message && error.message.includes('numeric field overflow')) {
      return res.status(400).json({ 
        error: "Balance exceeds the maximum allowed wallet balance of 9,999,999,999,999" 
      });
    }
    
    res.status(500).json({ error: "Failed to update wallet" });
  }
});

// ===== HELPER FUNCTIONS =====

/**
 * Generate smart wallet name based on type and existing wallets
 * Examples: "Cash Wallet 1", "Bank Account 2", "Digital Wallet 3", etc.
 */
export async function generateWalletName(sql, userId, type) {
  // Get wallet type display name
  const typeNames = {
    cash: 'Cash',
    bank: 'Bank Account',
    digital_wallet: 'Digital Wallet'
  };
  const typeName = typeNames[type] || 'Wallet';

  // Count existing wallets of this type for the user
  const [result] = await sql`
    SELECT COUNT(*) as count
    FROM wallets
    WHERE user_id = ${userId} AND type = ${type}
  `;

  const count = parseInt(result.count);
  const nextNumber = count + 1;

  // Cash needs "Wallet" suffix, others already have descriptive names
  if (type === 'cash') {
    return `${typeName} Wallet ${nextNumber}`;
  } else {
    return `${typeName} ${nextNumber}`;
  }
}

export function getWalletDefaults(type) {
  const defaults = {
    cash: { icon: '💵', color: 'green' },
    bank: { icon: '🏦', color: 'blue' },
    digital_wallet: { icon: '📱', color: 'purple' }
  };
  return defaults[type] || { icon: '💼', color: 'gray' };
}

export default router;
