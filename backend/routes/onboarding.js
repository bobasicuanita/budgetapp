import express from "express";
import sql from "../config/database.js";
import { authenticateToken } from "../middleware/auth.js";

const router = express.Router();

/**
 * POST /api/onboarding/complete
 * Complete user onboarding - save base currency and first wallet
 */
router.post("/complete", authenticateToken, async (req, res) => {
  const { base_currency, wallet } = req.body;
  const userId = req.user.userId;

  try {
    // Validate inputs
    if (!base_currency || base_currency.length !== 3) {
      return res.status(400).json({ 
        error: "Valid base_currency is required (3-letter ISO code)" 
      });
    }

    if (!wallet || !wallet.type || wallet.starting_balance === undefined) {
      return res.status(400).json({ 
        error: "Wallet with type and starting_balance is required" 
      });
    }

    // Validate wallet type
    const validTypes = ['cash', 'bank', 'credit_card', 'savings', 'investment'];
    if (!validTypes.includes(wallet.type)) {
      return res.status(400).json({ 
        error: `Invalid wallet type. Must be one of: ${validTypes.join(', ')}` 
      });
    }

    // Default wallet name if not provided
    const walletName = wallet.name || getDefaultWalletName(wallet.type);
    
    // Default currency to base_currency if not provided
    const walletCurrency = wallet.currency || base_currency;

    // Auto-assign icon and color based on type
    const { icon, color } = getWalletDefaults(wallet.type);

    // Start transaction
    await sql.begin(async (sql) => {
      // Update user with base currency and mark onboarding complete
      await sql`
        UPDATE users 
        SET 
          base_currency = ${base_currency.toUpperCase()},
          onboarding_completed = TRUE,
          onboarding_completed_at = NOW()
        WHERE id = ${userId}
      `;

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
          color
        )
        VALUES (
          ${userId},
          ${walletName},
          ${wallet.type},
          ${walletCurrency.toUpperCase()},
          ${wallet.starting_balance},
          ${wallet.starting_balance},  -- current_balance = starting_balance initially
          ${wallet.icon || icon},
          ${wallet.color || color}
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
      WHERE user_id = ${userId} AND is_active = TRUE
      ORDER BY created_at ASC
    `;

    // Calculate total net worth (in base currency - for now just sum all)
    const totalNetWorth = wallets.reduce((sum, wallet) => {
      return sum + parseFloat(wallet.current_balance);
    }, 0);

    res.json({
      wallets,
      totalNetWorth
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
  const { name, type, currency, starting_balance, icon, color } = req.body;
  const userId = req.user.userId;

  try {
    // Validate
    const validTypes = ['cash', 'bank', 'credit_card', 'savings', 'investment'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({ 
        error: `Invalid wallet type. Must be one of: ${validTypes.join(', ')}` 
      });
    }

    if (starting_balance === undefined || starting_balance === null) {
      return res.status(400).json({ error: "starting_balance is required" });
    }

    // Get user's base currency as default
    const [user] = await sql`SELECT base_currency FROM users WHERE id = ${userId}`;
    const walletCurrency = currency || user.base_currency || 'EUR';

    // Get defaults
    const { icon: defaultIcon, color: defaultColor } = getWalletDefaults(type);
    const walletName = name || getDefaultWalletName(type);

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
        color
      )
      VALUES (
        ${userId},
        ${walletName},
        ${type},
        ${walletCurrency.toUpperCase()},
        ${starting_balance},
        ${starting_balance},
        ${icon || defaultIcon},
        ${color || defaultColor}
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

// ===== HELPER FUNCTIONS =====

function getDefaultWalletName(type) {
  const names = {
    cash: 'Cash',
    bank: 'Bank Account',
    credit_card: 'Credit Card',
    savings: 'Savings',
    investment: 'Investment Account'
  };
  return names[type] || 'Wallet';
}

function getWalletDefaults(type) {
  const defaults = {
    cash: { icon: '💵', color: 'green' },
    bank: { icon: '🏦', color: 'blue' },
    credit_card: { icon: '💳', color: 'red' },
    savings: { icon: '💰', color: 'amber' },
    investment: { icon: '📈', color: 'purple' }
  };
  return defaults[type] || { icon: '💼', color: 'slate' };
}

export default router;
