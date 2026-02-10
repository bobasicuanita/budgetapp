import express from "express";
import sql from "../config/database.js";
import { authenticateToken } from "../middleware/auth.js";
import { isValidName, validationMessages } from "../utils/validation.js";

const router = express.Router();

/**
 * POST /api/onboarding/complete
 * Complete user onboarding - save user info, base currency, and first wallet
 */
router.post("/complete", authenticateToken, async (req, res) => {
  const { first_name, last_name, base_currency, wallet } = req.body;
  const userId = req.user.userId;

  try {
    // Validate mandatory fields
    if (!base_currency || base_currency.length !== 3) {
      return res.status(400).json({ 
        error: "Valid base_currency is required (3-letter ISO code)" 
      });
    }

    if (!wallet || !wallet.type) {
      return res.status(400).json({ 
        error: "Wallet type is required" 
      });
    }

    // Validate name fields (if provided)
    if (first_name && !isValidName(first_name)) {
      return res.status(400).json({ 
        error: validationMessages.name.invalid
      });
    }

    if (first_name && first_name.length > 50) {
      return res.status(400).json({ 
        error: "First name must not exceed 50 characters"
      });
    }

    if (last_name && !isValidName(last_name)) {
      return res.status(400).json({ 
        error: validationMessages.name.invalid
      });
    }

    if (last_name && last_name.length > 50) {
      return res.status(400).json({ 
        error: "Last name must not exceed 50 characters"
      });
    }

    // Validate wallet type
    const validTypes = ['cash', 'bank', 'digital_wallet'];
    if (!validTypes.includes(wallet.type)) {
      return res.status(400).json({ 
        error: `Invalid wallet type for onboarding. Must be one of: ${validTypes.join(', ')}` 
      });
    }

    // Validate wallet name length (if provided)
    if (wallet.name && wallet.name.length > 32) {
      return res.status(400).json({ 
        error: "Wallet name must not exceed 32 characters"
      });
    }

    // Default starting_balance to 0 if not provided
    const startingBalance = wallet.starting_balance ?? 0;
    
    // Default currency to base_currency if not provided
    const walletCurrency = wallet.currency || base_currency;
    
    // Default include_in_balance to true if not provided
    const includeInBalance = wallet.include_in_balance ?? true;

    // Auto-assign icon and color based on type
    const { icon, color } = getWalletDefaults(wallet.type);

    // Start transaction
    await sql.begin(async (sql) => {
      // Build user name from first_name and last_name (if provided)
      let fullName = null;
      if (first_name || last_name) {
        fullName = [first_name, last_name].filter(Boolean).join(' ');
      }

      // Update user with name, base currency, and mark onboarding complete
      await sql`
        UPDATE users 
        SET 
          name = ${fullName},
          base_currency = ${base_currency.toUpperCase()},
          onboarding_completed = TRUE,
          onboarding_completed_at = NOW()
        WHERE id = ${userId}
      `;

      // Generate smart wallet name if not provided
      const walletName = wallet.name || await generateWalletName(sql, userId, wallet.type);

      // Create the first wallet
      const [createdWallet] = await sql`
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
          ${wallet.type},
          ${walletCurrency.toUpperCase()},
          ${startingBalance},
          ${startingBalance},
          ${wallet.icon || icon},
          ${wallet.color || color},
          ${includeInBalance}
        )
        RETURNING *
      `;

      return createdWallet;
    });

    res.status(200).json({
      message: "Onboarding completed successfully!",
      redirect: "/dashboard"
    });

  } catch (error) {
    console.error("Onboarding error:", error);
    res.status(500).json({ error: "Failed to complete onboarding" });
  }
});

/**
 * GET /api/onboarding/status
 * Check if user has completed onboarding
 */
router.get("/status", authenticateToken, async (req, res) => {
  const userId = req.user.userId;

  try {
    const [user] = await sql`
      SELECT 
        onboarding_completed, 
        base_currency,
        onboarding_completed_at
      FROM users 
      WHERE id = ${userId}
    `;

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({
      completed: user.onboarding_completed || false,
      baseCurrency: user.base_currency,
      completedAt: user.onboarding_completed_at
    });

  } catch (error) {
    console.error("Error fetching onboarding status:", error);
    res.status(500).json({ error: "Failed to fetch onboarding status" });
  }
});

/**
 * GET /api/wallets
 * Get all wallets for authenticated user
 */
router.get("/wallets", authenticateToken, async (req, res) => {
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
router.post("/wallets", authenticateToken, async (req, res) => {
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
    res.status(500).json({ error: "Failed to create wallet" });
  }
});

/**
 * PUT /api/onboarding/wallets/:id
 * Update an existing wallet
 */
router.put("/wallets/:id", authenticateToken, async (req, res) => {
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
    res.status(500).json({ error: "Failed to update wallet" });
  }
});

// ===== HELPER FUNCTIONS =====

/**
 * Generate smart wallet name based on type and existing wallets
 * Examples: "Cash Wallet 1", "Bank Account 2", "Digital Wallet 3", etc.
 */
async function generateWalletName(sql, userId, type) {
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

function getWalletDefaults(type) {
  const defaults = {
    cash: { icon: '💵', color: 'green' },
    bank: { icon: '🏦', color: 'blue' },
    digital_wallet: { icon: '📱', color: 'purple' }
  };
  return defaults[type] || { icon: '💼', color: 'gray' };
}

export default router;
