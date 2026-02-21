import express from "express";
import sql from "../config/database.js";
import { authenticateToken } from "../middleware/auth.js";
import { isValidName, validationMessages } from "../utils/validation.js";
import { generateWalletName, getWalletDefaults } from "./wallets.js";

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

      // If starting balance is not zero, create an initial balance system transaction
      if (startingBalance !== 0) {
        
        // Get the Initial Balance category
        const [initialBalanceCategory] = await sql`
          SELECT id FROM categories 
          WHERE name = 'Initial Balance' AND is_system = true
          LIMIT 1
        `;

        if (!initialBalanceCategory) {
          throw new Error('Initial Balance category not found. Please run migrations.');
        }

        // Create initial balance transaction
        await sql`
          INSERT INTO transactions (
            user_id,
            wallet_id,
            type,
            amount,
            currency,
            description,
            category_id,
            date,
            is_system,
            system_type,
            status,
            base_currency_amount
          )
          VALUES (
            ${userId},
            ${createdWallet.id},
            'income',
            ${startingBalance},
            ${walletCurrency.toUpperCase()},
            'Initial Balance',
            ${initialBalanceCategory.id},
            CURRENT_DATE,
            true,
            'initial_balance',
            'actual',
            ${startingBalance}
          )
        `;
        
        console.log(`[Onboarding] Created initial balance transaction for wallet ${createdWallet.id}`);
      }

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

export default router;
