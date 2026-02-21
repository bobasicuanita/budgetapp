import express from "express";
import sql from "../config/database.js";
import { authenticateToken } from "../middleware/auth.js";
import * as currencies from '@dinero.js/currencies';

const router = express.Router();

/**
 * Get maximum net worth for a currency as a string (to avoid floating point precision issues)
 * @param {string} currencyCode - ISO 4217 currency code
 * @returns {string} Maximum net worth value as string
 */
function getMaxNetWorthString(currencyCode) {
  const exponent = getCurrencyDecimals(currencyCode);
  
  if (exponent === 0) {
    return '999999999999999'; // 999,999,999,999,999
  } else if (exponent === 2) {
    return '999999999999999.99'; // 999,999,999,999,999.99
  } else if (exponent === 3) {
    return '999999999999999.999'; // 999,999,999,999,999.999
  } else if (exponent === 4) {
    return '999999999999999.9999'; // For currencies with 4 decimals
  } else {
    return '999999999999999';
  }
}

/**
 * Compare if value1 > value2 using string comparison (avoids floating point issues)
 * @param {number} value1 - First value
 * @param {string} value2String - Second value as string (the max)
 * @returns {boolean} True if value1 exceeds value2
 */
function exceedsValue(value1, value2String) {
  // Convert value1 to string with proper decimal places
  const decimals = value2String.includes('.') ? value2String.split('.')[1].length : 0;
  const value1Str = value1.toFixed(decimals);
  
  // Split both values
  const v1Parts = value1Str.split('.');
  const v2Parts = value2String.split('.');
  
  const v1Integer = v1Parts[0];
  const v2Integer = v2Parts[0];
  const v1Decimal = v1Parts[1] || '0'.repeat(decimals);
  const v2Decimal = v2Parts[1] || '0'.repeat(decimals);
  
  // Compare integer parts first
  if (v1Integer.length !== v2Integer.length) {
    return v1Integer.length > v2Integer.length;
  }
  
  if (v1Integer !== v2Integer) {
    return v1Integer > v2Integer;
  }
  
  // Integer parts are equal, compare decimal parts
  return v1Decimal > v2Decimal;
}

/**
 * Compare two string values (both as strings to preserve precision)
 * @param {string} value1String - First value as string
 * @param {string} value2String - Second value as string (the max)
 * @returns {boolean} True if value1 > value2 (strictly greater than)
 */
function exceedsValueString(value1String, value2String) {
  // Split both values
  const v1Parts = value1String.split('.');
  const v2Parts = value2String.split('.');
  
  const v1Integer = v1Parts[0];
  const v2Integer = v2Parts[0];
  const v1Decimal = v1Parts[1] || '';
  const v2Decimal = v2Parts[1] || '';
  
  // Pad decimals to same length for comparison
  const maxDecimalLen = Math.max(v1Decimal.length, v2Decimal.length);
  const v1DecimalPadded = v1Decimal.padEnd(maxDecimalLen, '0');
  const v2DecimalPadded = v2Decimal.padEnd(maxDecimalLen, '0');
  
  // Compare integer parts first
  if (v1Integer.length !== v2Integer.length) {
    return v1Integer.length > v2Integer.length;
  }
  
  if (v1Integer !== v2Integer) {
    return v1Integer > v2Integer;
  }
  
  // Integer parts are equal, compare decimal parts
  return v1DecimalPadded > v2DecimalPadded;
}

/**
 * Subtract value2 from value1String, preserving precision using BigInt for integer parts
 * @param {string} value1String - First value as string (the max)
 * @param {number} value2 - Value to subtract
 * @param {number} decimals - Number of decimal places to preserve
 * @returns {string} Result of subtraction as string
 */
function subtractFromMaxString(value1String, value2, decimals) {
  // Split the max into integer and decimal parts
  const maxParts = value1String.split('.');
  const maxIntegerStr = maxParts[0];
  const maxDecimalStr = maxParts[1] || '0';
  
  // Split value2 into integer and decimal parts
  const value2Str = value2.toFixed(decimals);
  const value2Parts = value2Str.split('.');
  const value2IntegerStr = value2Parts[0];
  const value2DecimalStr = value2Parts[1] || '0';
  
  // Use BigInt for integer arithmetic
  const maxIntegerBig = BigInt(maxIntegerStr);
  const value2IntegerBig = BigInt(value2IntegerStr);
  
  // Convert decimals to integers for precise subtraction
  const maxDecimalInt = parseInt(maxDecimalStr.padEnd(decimals, '0'), 10);
  const value2DecimalInt = parseInt(value2DecimalStr.padEnd(decimals, '0'), 10);
  
  // Subtract decimals
  let resultDecimalInt = maxDecimalInt - value2DecimalInt;
  let resultIntegerBig = maxIntegerBig - value2IntegerBig;
  
  // Handle borrow
  if (resultDecimalInt < 0) {
    resultIntegerBig -= 1n;
    resultDecimalInt += Math.pow(10, decimals);
  }
  
  // Convert back to string
  const resultIntegerStr = resultIntegerBig.toString();
  const resultDecimalStr = resultDecimalInt.toString().padStart(decimals, '0');
  
  if (decimals > 0) {
    return `${resultIntegerStr}.${resultDecimalStr}`;
  } else {
    return resultIntegerStr;
  }
}

/**
 * Get currency decimal count (for display purposes)
 */
function getCurrencyDecimals(currencyCode) {
  try {
    const currency = currencies[currencyCode];
    return currency ? currency.exponent : 2;
  } catch (error) {
    console.error(`[getCurrencyDecimals] Error loading currency ${currencyCode}:`, error.message);
    return 2; // Default to 2 decimals
  }
}

/**
 * Format max net worth for display with proper decimals
 * Manually constructs the formatted string to avoid parseFloat precision loss
 */
function formatMaxNetWorth(currencyCode) {
  const maxValueStr = getMaxNetWorthString(currencyCode);
  const decimals = getCurrencyDecimals(currencyCode);
  
  // Split into integer and decimal parts
  const parts = maxValueStr.split('.');
  const integerPart = parts[0];
  const decimalPart = parts[1] || '';
  
  // Format integer part with thousands separators
  const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  
  // Construct final formatted string
  if (decimals > 0 && decimalPart) {
    return `${formattedInteger}.${decimalPart}`;
  } else {
    return formattedInteger;
  }
}

/**
 * Helper function to convert amount from one currency to another using exchange rates
 * @param {number} amount - Amount to convert
 * @param {string} fromCurrency - Source currency code
 * @param {string} toCurrency - Target currency code (base currency)
 * @param {Object} exchangeRates - Map of currency codes to USD rates
 * @returns {number} Converted amount in target currency
 */
function convertCurrency(amount, fromCurrency, toCurrency, exchangeRates) {
  // If same currency, no conversion needed
  if (fromCurrency === toCurrency) {
    return amount;
  }
  
  // If converting to USD (our base for all rates)
  if (toCurrency === 'USD') {
    const rate = exchangeRates[fromCurrency];
    if (!rate) {
      console.warn(`No exchange rate found for ${fromCurrency}, using 1:1 ratio`);
      return amount;
    }
    // Rate is USD to fromCurrency (e.g., USDEUR = 0.84 means 1 USD = 0.84 EUR)
    // To convert EUR to USD: amount / rate (e.g., 100 EUR / 0.84 = 119.05 USD)
    return amount / rate;
  }
  
  // If converting from USD to another currency
  if (fromCurrency === 'USD') {
    const rate = exchangeRates[toCurrency];
    if (!rate) {
      console.warn(`No exchange rate found for ${toCurrency}, using 1:1 ratio`);
      return amount;
    }
    // Rate is USD to toCurrency (e.g., USDEUR = 0.84 means 1 USD = 0.84 EUR)
    // To convert USD to EUR: amount * rate (e.g., 100 USD * 0.84 = 84 EUR)
    return amount * rate;
  }
  
  // Converting between two non-USD currencies: go through USD
  // Example: EUR to GBP = EUR -> USD -> GBP
  const amountInUSD = convertCurrency(amount, fromCurrency, 'USD', exchangeRates);
  return convertCurrency(amountInUSD, 'USD', toCurrency, exchangeRates);
}

/**
 * GET /api/wallets
 * Get all wallets for authenticated user with proper currency conversion
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

    const baseCurrency = user?.base_currency || 'USD';

    const wallets = await sql`
      SELECT 
        w.id,
        w.name,
        w.type,
        w.currency,
        w.starting_balance,
        w.current_balance,
        w.icon,
        w.color,
        w.is_active,
        w.include_in_balance,
        w.created_at,
        EXISTS(
          SELECT 1 FROM transactions t 
          WHERE t.wallet_id = w.id 
          AND t.is_system = false
        ) as has_user_transactions
      FROM wallets w
      WHERE w.user_id = ${userId} AND w.is_active = TRUE
      ORDER BY w.created_at ASC
    `;

    // Get the most recent exchange rates
    const [latestDate] = await sql`
      SELECT DISTINCT date
      FROM exchange_rates
      ORDER BY date DESC
      LIMIT 1
    `;

    let exchangeRates = {};
    let exchangeRatesDate = null;
    
    if (latestDate) {
      exchangeRatesDate = latestDate.date;
      
      // Fetch all exchange rates for the most recent date
      // Note: Direct date comparison works in PostgreSQL
      const rates = await sql`
        SELECT currency_code, rate
        FROM exchange_rates
        WHERE date = ${latestDate.date}::date
      `;
      
      // Convert to a map: { 'EUR': 0.84, 'GBP': 0.73, ... }
      exchangeRates = rates.reduce((acc, r) => {
        acc[r.currency_code] = parseFloat(r.rate);
        return acc;
      }, {});
      
      console.log(`[Wallets] Using ${Object.keys(exchangeRates).length} exchange rates from ${exchangeRatesDate.toISOString().split('T')[0]}`);
    } else {
      console.warn('[Wallets] No exchange rates found in database. Using 1:1 conversion for all currencies.');
    }

    // Calculate total net worth and add balance_in_base_currency to each wallet
    // NOTE: ALL wallets count toward net worth (include_in_balance is for "available balance" feature)
    let totalNetWorth = 0;
    
    const walletsWithConvertedBalances = wallets.map(wallet => {
      const walletBalance = parseFloat(wallet.current_balance);
      const convertedBalance = convertCurrency(
        walletBalance, 
        wallet.currency, 
        baseCurrency, 
        exchangeRates
      );
      
      totalNetWorth += convertedBalance;
      
      return {
        ...wallet,
        balance_in_base_currency: convertedBalance
      };
    });

    res.json({
      wallets: walletsWithConvertedBalances,
      totalNetWorth,
      baseCurrency,
      exchangeRatesDate: exchangeRatesDate ? exchangeRatesDate.toISOString().split('T')[0] : null
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

    // Check if adding this wallet would exceed total net worth limit
    // NOTE: ALL wallets count toward net worth, regardless of "include_in_balance" setting
    // "include_in_balance" only affects "available balance" for spending (future feature)
    const MAX_TOTAL_NET_WORTH_STR = getMaxNetWorthString(user.base_currency);

    if (startingBalance > 0) {
      // Get all existing wallets (ALL wallets count toward net worth)
      const existingWallets = await sql`
        SELECT currency, current_balance
        FROM wallets
        WHERE user_id = ${userId}
      `;
      
      // Get exchange rates
      const [latestDate] = await sql`
        SELECT DISTINCT date
        FROM exchange_rates
        ORDER BY date DESC
        LIMIT 1
      `;
      
      let exchangeRates = {};
      if (latestDate) {
        const rates = await sql`
          SELECT currency_code, rate
          FROM exchange_rates
          WHERE date = ${latestDate.date}::date
        `;
        exchangeRates = rates.reduce((acc, r) => {
          acc[r.currency_code] = parseFloat(r.rate);
          return acc;
        }, {});
      }
      
      // Calculate current net worth (ALL wallets, not just those included in available balance)
      const baseDecimals = getCurrencyDecimals(user.base_currency);
      const currentNetWorth = existingWallets.reduce((sum, wallet) => {
        const balance = parseFloat(wallet.current_balance);
        const converted = convertCurrency(balance, wallet.currency, user.base_currency, exchangeRates);
        return sum + converted;
      }, 0);
      
      // Convert new wallet balance to base currency
      const newWalletInBaseCurrency = convertCurrency(startingBalance, walletCurrency, user.base_currency, exchangeRates);
      
      // Keep as string to preserve precision for very large numbers
      const projectedNetWorthStr = (currentNetWorth + newWalletInBaseCurrency).toFixed(baseDecimals);
      
      // Compare using string comparison to avoid floating point precision loss
      if (exceedsValueString(projectedNetWorthStr, MAX_TOTAL_NET_WORTH_STR)) {
        let formattedMax;
        const walletDecimals = getCurrencyDecimals(walletCurrency);
        
        if (walletCurrency === user.base_currency) {
          // Same currency - use string subtraction to preserve precision
          const maxAllowedStr = subtractFromMaxString(MAX_TOTAL_NET_WORTH_STR, currentNetWorth, walletDecimals);
          
          // Format with thousands separators
          const parts = maxAllowedStr.split('.');
          const formattedInteger = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
          formattedMax = walletDecimals > 0 && parts[1] ? `${formattedInteger}.${parts[1]}` : formattedInteger;
        } else {
          // Different currency - need to convert
          const maxAllowedForWallet = subtractFromMax(MAX_TOTAL_NET_WORTH_STR, currentNetWorth, walletDecimals);
          const maxInWalletCurrency = convertCurrency(parseFloat(maxAllowedForWallet), user.base_currency, walletCurrency, exchangeRates);
          formattedMax = new Intl.NumberFormat('en-US', {
            minimumFractionDigits: walletDecimals,
            maximumFractionDigits: walletDecimals
          }).format(maxInWalletCurrency);
        }

        return res.status(400).json({
          error: `Adding this wallet would exceed the maximum total net worth of ${formatMaxNetWorth(user.base_currency)} ${user.base_currency}. Maximum allowed balance for this wallet: ${formattedMax} ${walletCurrency}`
        });
      }
    }

    // Get defaults
    const { icon: defaultIcon, color: defaultColor } = getWalletDefaults(type);
    
    // Generate smart wallet name if not provided
    const walletName = name || await generateWalletName(sql, userId, type);

    // Use transaction to ensure wallet and initial balance transaction are created atomically
    const result = await sql.begin(async (sql) => {
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
        const [initialTransaction] = await sql`
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
            ${wallet.id},
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
          RETURNING *
        `;

      }

      return wallet;
    });

    res.status(201).json({
      message: "Wallet created successfully",
      wallet: result
    });

  } catch (error) {
    console.error("Error creating wallet:", error);
    
    // Check if error is numeric overflow
    if (error.message && error.message.includes('numeric field overflow')) {
      // Get user's base currency for error message
      const [user] = await sql`SELECT base_currency FROM users WHERE id = ${userId}`;
      const baseCurrency = user?.base_currency || 'USD';
      
      return res.status(400).json({ 
        error: `Starting balance exceeds the maximum allowed wallet balance of ${formatMaxNetWorth(baseCurrency)}` 
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
    // Get user's base currency (needed for error messages)
    const [user] = await sql`SELECT base_currency FROM users WHERE id = ${userId}`;
    
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
    if (include_in_balance !== undefined) updates.include_in_balance = include_in_balance;
    
    // Handle starting_balance changes
    // Only allow editing if wallet has no user-created transactions
    if (starting_balance !== undefined && starting_balance !== existingWallet.starting_balance) {
      // Check if wallet has any user transactions
      const [transactionCount] = await sql`
        SELECT COUNT(*) as count
        FROM transactions
        WHERE wallet_id = ${id}
          AND is_system = false
      `;
      
      if (parseInt(transactionCount.count) > 0) {
        return res.status(400).json({ 
          error: "Initial balance cannot be edited once transactions exist. Use Adjust Balance to correct the amount." 
        });
      }
      
      // Wallet has no user transactions, so we can update the initial balance transaction
      updates.starting_balance = starting_balance;
    }

    // Check if balance change would exceed net worth limit
    // NOTE: ALL wallets count toward net worth, regardless of "include_in_balance" setting
    const MAX_TOTAL_NET_WORTH_STR = getMaxNetWorthString(user.base_currency);

    if (starting_balance !== undefined && starting_balance !== existingWallet.starting_balance) {
      // Calculate balance difference
      const balanceDiff = starting_balance - existingWallet.starting_balance;
      
      // Only check if increasing balance (decreases are always allowed)
      if (balanceDiff > 0) {
        const walletCurrency = currency !== undefined ? currency.toUpperCase() : existingWallet.currency;
        
        // Get all existing wallets (ALL wallets count toward net worth)
        const allWallets = await sql`
          SELECT currency, current_balance
          FROM wallets
          WHERE user_id = ${userId}
        `;
        
        // Get exchange rates
        const [latestDate] = await sql`
          SELECT DISTINCT date
          FROM exchange_rates
          ORDER BY date DESC
          LIMIT 1
        `;
        
        let exchangeRates = {};
        if (latestDate) {
          const rates = await sql`
            SELECT currency_code, rate
            FROM exchange_rates
            WHERE date = ${latestDate.date}::date
          `;
          exchangeRates = rates.reduce((acc, r) => {
            acc[r.currency_code] = parseFloat(r.rate);
            return acc;
          }, {});
        }
        
        // Calculate current net worth (ALL wallets)
        const baseDecimals = getCurrencyDecimals(user.base_currency);
        const currentNetWorth = allWallets.reduce((sum, wallet) => {
          const balance = parseFloat(wallet.current_balance);
          const converted = convertCurrency(balance, wallet.currency, user.base_currency, exchangeRates);
          return sum + converted;
        }, 0);
        
        // Convert balance difference to base currency
        const balanceDiffInBaseCurrency = convertCurrency(balanceDiff, walletCurrency, user.base_currency, exchangeRates);
        
        // Keep as string to preserve precision
        const projectedNetWorthStr = (currentNetWorth + balanceDiffInBaseCurrency).toFixed(baseDecimals);
        
        console.log(`[Wallet UPDATE] Current net worth: ${currentNetWorth.toFixed(baseDecimals)}, Projected: ${projectedNetWorthStr}, Max: ${MAX_TOTAL_NET_WORTH_STR}`);
        
        if (exceedsValueString(projectedNetWorthStr, MAX_TOTAL_NET_WORTH_STR)) {
          let formattedMax;
          const walletDecimals = getCurrencyDecimals(walletCurrency);
          
          if (walletCurrency === user.base_currency) {
            // Same currency - use string subtraction and addition
            const maxAllowedIncreaseStr = subtractFromMaxString(MAX_TOTAL_NET_WORTH_STR, currentNetWorth, walletDecimals);
            const maxAllowedBalance = existingWallet.starting_balance + parseFloat(maxAllowedIncreaseStr);
            
            const maxStr = maxAllowedBalance.toFixed(walletDecimals);
            const parts = maxStr.split('.');
            const formattedInteger = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
            formattedMax = walletDecimals > 0 && parts[1] ? `${formattedInteger}.${parts[1]}` : formattedInteger;
          } else {
            // Different currency - convert
            const maxAllowedIncreaseStr = subtractFromMaxString(MAX_TOTAL_NET_WORTH_STR, currentNetWorth, getCurrencyDecimals(user.base_currency));
            const maxInWalletCurrency = convertCurrency(parseFloat(maxAllowedIncreaseStr), user.base_currency, walletCurrency, exchangeRates);
            const maxAllowedBalance = existingWallet.starting_balance + maxInWalletCurrency;
            formattedMax = new Intl.NumberFormat('en-US', {
              minimumFractionDigits: walletDecimals,
              maximumFractionDigits: walletDecimals
            }).format(maxAllowedBalance);
          }

          return res.status(400).json({
            error: `Updating this wallet would exceed the maximum total net worth of ${formatMaxNetWorth(user.base_currency)} ${user.base_currency}. Maximum allowed balance: ${formattedMax} ${walletCurrency}`
          });
        }
      }
    }

    // Update wallet (and initial balance transaction if needed)
    const result = await sql.begin(async (sql) => {
      // Update wallet
      const [updatedWallet] = await sql`
        UPDATE wallets 
        SET 
          ${sql(updates)},
          updated_at = NOW()
        WHERE id = ${id} AND user_id = ${userId}
        RETURNING *
      `;

      // If starting_balance was updated, also update the initial balance transaction
      if (starting_balance !== undefined && starting_balance !== existingWallet.starting_balance) {
        console.log(`[Wallet ${id}] Updating starting balance from ${existingWallet.starting_balance} to ${starting_balance}`);
        
        // Check if initial balance transaction exists
        const existingTransaction = await sql`
          SELECT * FROM transactions
          WHERE wallet_id = ${id}
            AND system_type = 'initial_balance'
        `;
        
        if (existingTransaction.length === 0) {
          // Initial balance transaction doesn't exist, create it
          console.log(`[Wallet ${id}] No initial balance transaction found, creating one`);
          
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
              ${id},
              'income',
              ${starting_balance},
              ${existingWallet.currency},
              'Initial Balance',
              ${initialBalanceCategory.id},
              ${existingWallet.created_at}::date,
              true,
              'initial_balance',
              'actual',
              ${starting_balance}
            )
          `;
          
          console.log(`[Wallet ${id}] Created initial balance transaction with amount ${starting_balance}`);
        } else {
          // Update existing initial balance transaction
          const updateResult = await sql`
            UPDATE transactions
            SET 
              amount = ${starting_balance},
              base_currency_amount = ${starting_balance}
            WHERE wallet_id = ${id}
              AND system_type = 'initial_balance'
            RETURNING *
          `;
          
          console.log(`[Wallet ${id}] Updated ${updateResult.length} initial balance transaction(s)`);
          if (updateResult.length > 0) {
            console.log(`[Wallet ${id}] New transaction amount: ${updateResult[0].amount}`);
          }
        }

        // Recalculate wallet's current_balance
        const [newBalance] = await sql`
          SELECT COALESCE(SUM(amount), 0) as total
          FROM transactions
          WHERE wallet_id = ${id}
            AND status = 'actual'
        `;
        
        console.log(`[Wallet ${id}] Recalculated balance from transactions: ${newBalance.total}`);

        // Update current_balance
        await sql`
          UPDATE wallets
          SET current_balance = ${newBalance.total}
          WHERE id = ${id}
        `;

        // Fetch updated wallet
        const [finalWallet] = await sql`
          SELECT * FROM wallets WHERE id = ${id}
        `;
        
        console.log(`[Wallet ${id}] Final wallet: starting_balance=${finalWallet.starting_balance}, current_balance=${finalWallet.current_balance}`);
        
        return finalWallet;
      }

      return updatedWallet;
    });

    res.status(200).json({
      message: "Wallet updated successfully",
      wallet: result
    });

  } catch (error) {
    console.error("Error updating wallet:", error);
    
    // Check if error is numeric overflow
    if (error.message && error.message.includes('numeric field overflow')) {
      // Get user's base currency for error message (user is fetched at start of route)
      const baseCurrency = user?.base_currency || 'USD';
      
      return res.status(400).json({ 
        error: `Balance exceeds the maximum allowed wallet balance of ${formatMaxNetWorth(baseCurrency)}` 
      });
    }
    
    res.status(500).json({ error: "Failed to update wallet" });
  }
});

/**
 * POST /api/wallets/:id/adjust-balance
 * Create a balance adjustment transaction to correct wallet balance
 */
router.post("/:id/adjust-balance", authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { target_balance, description, date } = req.body;
  const userId = req.user.userId;

  try {
    // Verify wallet belongs to user
    const [wallet] = await sql`
      SELECT * FROM wallets 
      WHERE id = ${id} AND user_id = ${userId}
    `;

    if (!wallet) {
      return res.status(404).json({ error: "Wallet not found" });
    }

    // Validate target_balance
    if (target_balance === undefined || target_balance === null) {
      return res.status(400).json({ error: "Target balance is required" });
    }
    
    // Validate date
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const day = now.getDate();
    const todayLocal = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    
    const adjustmentDate = date || todayLocal;
    
    // Get wallet creation date in YYYY-MM-DD format
    const walletCreatedDateObj = new Date(wallet.created_at);
    const walletCreatedDate = `${walletCreatedDateObj.getFullYear()}-${String(walletCreatedDateObj.getMonth() + 1).padStart(2, '0')}-${String(walletCreatedDateObj.getDate()).padStart(2, '0')}`;
    
    // Check if date is in the future (compare date strings)
    if (adjustmentDate > todayLocal) {
      return res.status(400).json({ error: "Adjustment date cannot be in the future" });
    }
    
    // Check if date is before wallet creation (compare date strings)
    if (adjustmentDate < walletCreatedDate) {
      return res.status(400).json({ error: "Adjustment date cannot be before wallet creation date" });
    }

    // Calculate adjustment amount
    const currentBalance = parseFloat(wallet.current_balance);
    const adjustmentAmount = parseFloat(target_balance) - currentBalance;

    // If adjustment is zero, no need to create a transaction
    if (adjustmentAmount === 0) {
      return res.status(400).json({ error: "Target balance is the same as current balance" });
    }

    // Check if balance adjustment would exceed net worth limit (only for positive adjustments)
    if (adjustmentAmount > 0) {
      // Get user's base currency
      const [user] = await sql`
        SELECT base_currency 
        FROM users 
        WHERE id = ${userId}
      `;
      
      const MAX_TOTAL_NET_WORTH_STR = getMaxNetWorthString(user.base_currency);
      
      // Get all existing wallets
      const allWallets = await sql`
        SELECT currency, current_balance
        FROM wallets
        WHERE user_id = ${userId}
      `;
      
      // Get exchange rates
      const [latestDate] = await sql`
        SELECT DISTINCT date
        FROM exchange_rates
        ORDER BY date DESC
        LIMIT 1
      `;
      
      let exchangeRates = {};
      if (latestDate) {
        const rates = await sql`
          SELECT currency_code, rate
          FROM exchange_rates
          WHERE date = ${latestDate.date}::date
        `;
        exchangeRates = rates.reduce((acc, r) => {
          acc[r.currency_code] = parseFloat(r.rate);
          return acc;
        }, {});
      }
      
      // Calculate current net worth
      const baseDecimals = getCurrencyDecimals(user.base_currency);
      const currentNetWorth = allWallets.reduce((sum, w) => {
        const balance = parseFloat(w.current_balance);
        const converted = convertCurrency(balance, w.currency, user.base_currency, exchangeRates);
        return sum + converted;
      }, 0);
      
      // Convert adjustment amount to base currency
      const adjustmentInBaseCurrency = convertCurrency(adjustmentAmount, wallet.currency, user.base_currency, exchangeRates);
      
      // Keep as string to preserve precision
      const projectedNetWorthStr = (currentNetWorth + adjustmentInBaseCurrency).toFixed(baseDecimals);
      
      console.log(`[Balance Adjustment] Current net worth: ${currentNetWorth.toFixed(baseDecimals)}, Projected: ${projectedNetWorthStr}, Max: ${MAX_TOTAL_NET_WORTH_STR}`);
      
      if (exceedsValueString(projectedNetWorthStr, MAX_TOTAL_NET_WORTH_STR)) {
        let formattedMax;
        const walletDecimals = getCurrencyDecimals(wallet.currency);
        
        if (wallet.currency === user.base_currency) {
          // Same currency - use string subtraction
          const availableStr = subtractFromMaxString(MAX_TOTAL_NET_WORTH_STR, currentNetWorth, walletDecimals);
          const maxAllowedBalance = currentBalance + parseFloat(availableStr);
          
          const maxStr = maxAllowedBalance.toFixed(walletDecimals);
          const parts = maxStr.split('.');
          const formattedInteger = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
          formattedMax = walletDecimals > 0 && parts[1] ? `${formattedInteger}.${parts[1]}` : formattedInteger;
        } else {
          // Different currency - convert
          const availableStr = subtractFromMaxString(MAX_TOTAL_NET_WORTH_STR, currentNetWorth, getCurrencyDecimals(user.base_currency));
          const maxInWalletCurrency = convertCurrency(parseFloat(availableStr), user.base_currency, wallet.currency, exchangeRates);
          const maxAllowedBalance = currentBalance + maxInWalletCurrency;
          formattedMax = new Intl.NumberFormat('en-US', {
            minimumFractionDigits: walletDecimals,
            maximumFractionDigits: walletDecimals
          }).format(maxAllowedBalance);
        }

        return res.status(400).json({
          error: `This adjustment would exceed the maximum total net worth of ${formatMaxNetWorth(user.base_currency)} ${user.base_currency}. Maximum allowed balance: ${formattedMax} ${wallet.currency}`
        });
      }
    }

    // Create balance adjustment transaction
    const result = await sql.begin(async (sql) => {
      // Get the Balance Adjustment category (income or expense based on adjustment direction)
      const transactionType = adjustmentAmount > 0 ? 'income' : 'expense';
      const [adjustmentCategory] = await sql`
        SELECT id FROM categories 
        WHERE name = 'Balance Adjustment' AND type = ${transactionType} AND is_system = true
        LIMIT 1
      `;

      if (!adjustmentCategory) {
        throw new Error('Balance Adjustment category not found. Please run migrations.');
      }
      
      // Create adjustment transaction
      const [adjustmentTransaction] = await sql`
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
          ${id},
          ${transactionType},
          ${adjustmentAmount},
          ${wallet.currency},
          ${description || 'Balance Adjustment'},
          ${adjustmentCategory.id},
          ${adjustmentDate}::date,
          true,
          'balance_adjustment',
          'actual',
          ${adjustmentAmount}
        )
        RETURNING *
      `;

      // Update wallet balance
      await sql`
        UPDATE wallets
        SET 
          current_balance = ${target_balance},
          updated_at = NOW()
        WHERE id = ${id}
      `;

      return adjustmentTransaction;
    });

    res.status(201).json({
      message: "Balance adjusted successfully",
      adjustment: result,
      old_balance: currentBalance,
      new_balance: target_balance,
      adjustment_amount: adjustmentAmount
    });

  } catch (error) {
    console.error("Error adjusting balance:", error);
    res.status(500).json({ error: "Failed to adjust balance" });
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
