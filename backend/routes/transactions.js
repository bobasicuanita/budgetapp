import express from "express";
import sql from "../config/database.js";
import { authenticateToken } from "../middleware/auth.js";
import { 
  transactionShortTermLimiter, 
  transactionLongTermLimiter,
  csvExportShortTermLimiter,
  csvExportLongTermLimiter
} from "../middleware/rateLimiter.js";
import { idempotencyMiddleware } from "../middleware/idempotency.js";
import { calculateBaseCurrencyAmount } from "../utils/currencyConverter.js";
import * as currencies from '@dinero.js/currencies';

const router = express.Router();

/**
 * Get maximum liquidity for a currency as a string (to avoid floating point precision issues)
 * @param {string} currencyCode - ISO 4217 currency code
 * @returns {string} Maximum liquidity value as string
 */
function getMaxLiquidityString(currencyCode) {
  const exponent = getCurrencyDecimals(currencyCode);
  
  if (exponent === 0) {
    return '999999999999999';
  } else if (exponent === 2) {
    return '999999999999999.99';
  } else if (exponent === 3) {
    return '999999999999999.999';
  } else if (exponent === 4) {
    return '999999999999999.9999';
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
 * Get currency decimal count
 */
function getCurrencyDecimals(currencyCode) {
  try {
    const currency = currencies[currencyCode];
    return currency ? currency.exponent : 2;
  } catch (error) {
    console.error(`[getCurrencyDecimals] Error loading currency ${currencyCode}:`, error.message);
    return 2;
  }
}

/**
 * Format max liquidity for display with proper decimals
 * Manually constructs the formatted string to avoid parseFloat precision loss
 */
function formatMaxLiquidity(currencyCode) {
  const maxValueStr = getMaxLiquidityString(currencyCode);
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
    return amount / rate;
  }
  
  // If converting from USD to another currency
  if (fromCurrency === 'USD') {
    const rate = exchangeRates[toCurrency];
    if (!rate) {
      console.warn(`No exchange rate found for ${toCurrency}, using 1:1 ratio`);
      return amount;
    }
    return amount * rate;
  }
  
  // Converting between two non-USD currencies: go through USD
  const amountInUSD = convertCurrency(amount, fromCurrency, 'USD', exchangeRates);
  return convertCurrency(amountInUSD, 'USD', toCurrency, exchangeRates);
}

/**
 * Check if a transaction would exceed the maximum total liquidity
 * @param {number} userId - User ID
 * @param {string} baseCurrency - User's base currency
 * @param {Array} walletChanges - Array of {walletId, amountChange, walletCurrency}
 * @returns {Promise<{valid: boolean, error: string|null, maxAllowed: number|null}>}
 */
async function validateLiquidityLimit(userId, baseCurrency, walletChanges) {
  try {
    const MAX_TOTAL_LIQUIDITY_STR = getMaxLiquidityString(baseCurrency);
    
    // Get all wallets
    const allWallets = await sql`
      SELECT id, currency, current_balance, include_in_balance
      FROM wallets
      WHERE user_id = ${userId} AND is_archived = FALSE
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
    
    // Calculate current liquidity (ALL wallets count, not just those included in available balance)
    const baseDecimals = getCurrencyDecimals(baseCurrency);
    const currentLiquidityNum = allWallets.reduce((sum, wallet) => {
      const balance = parseFloat(wallet.current_balance);
      const converted = convertCurrency(balance, wallet.currency, baseCurrency, exchangeRates);
      return sum + converted;
    }, 0);
    
    // Convert to string with proper decimals to preserve precision
    const currentLiquidity = currentLiquidityNum.toFixed(baseDecimals);
    
    // Calculate the net change in base currency
    let netChangeInBaseCurrency = 0;
    
    for (const change of walletChanges) {
      const { walletId, amountChange, walletCurrency } = change;
      
      // Check if wallet exists
      const wallet = allWallets.find(w => w.id === walletId);
      
      if (!wallet) {
        continue; // Skip if wallet not found
      }
      
      // Convert amount change to base currency
      const changeInBaseCurrency = convertCurrency(amountChange, walletCurrency, baseCurrency, exchangeRates);
      netChangeInBaseCurrency += changeInBaseCurrency;
    }
    
    // Keep as string to preserve precision
    const projectedLiquidityStr = (parseFloat(currentLiquidity) + netChangeInBaseCurrency).toFixed(baseDecimals);
    
    if (exceedsValueString(projectedLiquidityStr, MAX_TOTAL_LIQUIDITY_STR)) {
      const availableStr = subtractFromMaxString(MAX_TOTAL_LIQUIDITY_STR, currentLiquidity, baseDecimals);
      return {
        valid: false,
        error: `This transaction would exceed the maximum total liquidity of ${formatMaxLiquidity(baseCurrency)} ${baseCurrency}.`,
        maxAllowed: Math.max(0, parseFloat(availableStr))
      };
    }
    
    return { valid: true, error: null, maxAllowed: null };
  } catch (error) {
    console.error('Error validating liquidity limit:', error);
    throw error;
  }
}

/**
 * GET /api/transactions/ids
 * Get all transaction IDs matching filters (for bulk operations)
 * Uses the same filter parameters as GET /api/transactions but returns only IDs
 */
router.get("/ids", authenticateToken, async (req, res) => {
  const userId = req.user.userId;
  
  const {
    start_date,
    end_date,
    type,
    wallet_id,
    wallet_ids,
    category_id,
    category_ids,
    tag_ids,
    search,
    min_amount,
    max_amount,
    include_future = 'false',
    currency,
    exclude_base_currency = 'false',
    counterparty
  } = req.query;

  try {
    // Default date range to current month if not provided
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    
    // First day of current month (format in local timezone, not UTC)
    const firstDay = new Date(year, month, 1);
    const defaultStartDate = start_date || `${year}-${String(month + 1).padStart(2, '0')}-01`;
    
    // Last day of current month (format in local timezone, not UTC)
    const lastDay = new Date(year, month + 1, 0);
    const lastDayNum = lastDay.getDate();
    const defaultEndDate = end_date || `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDayNum).padStart(2, '0')}`;

    const includeFuture = include_future === 'true';
    
    // Get user's base currency for currency filtering
    let userBaseCurrency = 'USD';
    if (exclude_base_currency === 'true' || currency) {
      const [user] = await sql`
        SELECT base_currency 
        FROM users 
        WHERE id = ${userId}
      `;
      userBaseCurrency = user?.base_currency || 'USD';
    }
    
    // Build WHERE conditions
    let queryParts = {
      baseWhere: `t.user_id = ${userId} 
        AND t.date >= '${defaultStartDate}'::date 
        AND t.date <= '${defaultEndDate}'::date`,
      additional: []
    };

    if (!includeFuture) {
      // Use local date instead of CURRENT_DATE to avoid timezone issues
      const todayLocal = `${year}-${String(month + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      queryParts.additional.push(`t.date <= '${todayLocal}'::date`);
    }

    if (type) {
      const types = type.split(',').map(t => t.trim()).filter(t => ['income', 'expense', 'transfer'].includes(t));
      if (types.length === 1) {
        queryParts.additional.push(`t.type = '${types[0]}'`);
      } else if (types.length > 1) {
        const typeList = types.map(t => `'${t}'`).join(',');
        queryParts.additional.push(`t.type IN (${typeList})`);
      }
    }

    const walletFilter = wallet_ids || wallet_id;
    if (walletFilter) {
      const walletIdNums = walletFilter.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
      if (walletIdNums.length === 1) {
        queryParts.additional.push(`(t.wallet_id = ${walletIdNums[0]} OR t.to_wallet_id = ${walletIdNums[0]})`);
      } else if (walletIdNums.length > 1) {
        const walletList = walletIdNums.join(',');
        queryParts.additional.push(`(t.wallet_id IN (${walletList}) OR t.to_wallet_id IN (${walletList}))`);
      }
    }

    if (exclude_base_currency === 'true') {
      queryParts.additional.push(`(
        (w.currency IS NOT NULL AND w.currency != '${userBaseCurrency}') OR 
        (tw.currency IS NOT NULL AND tw.currency != '${userBaseCurrency}')
      )`);
    } else if (currency && currency.trim()) {
      const currencyCode = currency.trim().toUpperCase();
      queryParts.additional.push(`(w.currency = '${currencyCode}' OR tw.currency = '${currencyCode}')`);
    }

    const categoryFilter = category_ids || category_id;
    if (categoryFilter) {
      const categoryArray = categoryFilter.split(',').map(id => `'${id.trim()}'`).join(',');
      queryParts.additional.push(`t.category_id IN (${categoryArray})`);
    }

    if (counterparty && counterparty.trim()) {
      const counterpartyTerm = counterparty.trim().replace(/'/g, "''");
      queryParts.additional.push(`(
        LOWER(t.merchant) = LOWER('${counterpartyTerm}') OR 
        LOWER(t.description) = LOWER('${counterpartyTerm}')
      )`);
    }

    if (search && search.trim()) {
      const searchTerm = search.trim().replace(/'/g, "''");
      queryParts.additional.push(`(
        LOWER(t.description) LIKE LOWER('%${searchTerm}%') OR 
        LOWER(t.merchant) LIKE LOWER('%${searchTerm}%')
      )`);
    }

    if (min_amount) {
      const minAmt = parseFloat(min_amount);
      queryParts.additional.push(`ABS(t.amount) >= ${minAmt}`);
    }

    if (max_amount) {
      const maxAmt = parseFloat(max_amount);
      queryParts.additional.push(`ABS(t.amount) <= ${maxAmt}`);
    }

    if (tag_ids && tag_ids.trim()) {
      const tagIdArray = tag_ids.split(',').map(id => `'${id.trim()}'`).join(',');
      const tagCount = tag_ids.split(',').length;
      queryParts.additional.push(`(
        SELECT COUNT(DISTINCT tt.tag_id)
        FROM transaction_tags tt
        WHERE tt.transaction_id = t.id
        AND tt.tag_id IN (${tagIdArray})
      ) = ${tagCount}`);
    }

    // For transfers, only show one transaction per pair (the "from" side with negative amount)
    queryParts.additional.push(`(t.type != 'transfer' OR t.amount < 0)`);
    
    // Exclude transactions from archived wallets
    queryParts.additional.push(`(w.is_archived = false OR w.is_archived IS NULL)`);
    queryParts.additional.push(`(tw.is_archived = false OR tw.is_archived IS NULL OR t.to_wallet_id IS NULL)`);
    
    // Exclude system transactions (balance adjustments) from bulk operations
    queryParts.additional.push(`t.is_system = false`);
    
    const fullWhereClause = queryParts.additional.length > 0
      ? `${queryParts.baseWhere} AND ${queryParts.additional.join(' AND ')}`
      : queryParts.baseWhere;

    // Build FROM clause (always need wallet joins to filter archived wallets)
    const queryFrom = `transactions t 
       LEFT JOIN wallets w ON t.wallet_id = w.id
       LEFT JOIN wallets tw ON t.to_wallet_id = tw.id`;

    // Get all transaction IDs matching filters
    const transactionIds = await sql.unsafe(`
      SELECT t.id
      FROM ${queryFrom}
      WHERE ${fullWhereClause}
      ORDER BY t.date DESC, t.created_at DESC
    `);

    res.json({ 
      ids: transactionIds.map(t => t.id),
      count: transactionIds.length
    });
  } catch (error) {
    console.error("Error fetching transaction IDs:", error);
    res.status(500).json({ error: "Failed to fetch transaction IDs" });
  }
});

/**
 * GET /api/transactions
 * Get transactions with filters and pagination
 * 
 * IMPORTANT: Transaction dates are stored as DATE type (not TIMESTAMP).
 * Users think in days ("Feb 12"), not times/timezones. This simplifies:
 * - Future date filtering (date > CURRENT_DATE)
 * - Date comparisons (no timezone conversion needed)
 * - User experience (consistent dates across all timezones)
 * 
 * Query params:
 * - start_date (required): Start of date range (defaults to first day of current month)
 * - end_date (required): End of date range (defaults to last day of current month)
 * - type (optional): Transaction type filter - single or comma-separated (income, expense, transfer)
 * - wallet_ids (optional): Comma-separated wallet IDs (matches source or destination - OR logic)
 * - wallet_id (optional): Single wallet ID (legacy, use wallet_ids instead)
 * - page (optional): Page number (default: 1)
 * - per_page (optional): Items per page (default: 30, max: 100)
 * - category_ids (optional): Comma-separated category IDs (matches ANY - OR logic)
 * - category_id (optional): Single category ID (legacy, use category_ids instead)
 * - tag_ids (optional): Comma-separated tag IDs (matches ALL - AND logic)
 * - search (optional): Search in description or merchant (case-insensitive)
 * - min_amount (optional): Minimum amount (absolute value)
 * - max_amount (optional): Maximum amount (absolute value)
 * - include_future (optional): Include future dated transactions (default: false)
 * - currency (optional): Filter by wallet currency code (matches source or destination wallet - OR logic)
 * - exclude_base_currency (optional): Exclude transactions in base currency, show only other currencies (default: false)
 * 
 * NOTE: For transfers, only one transaction per pair is returned (the "from" side with negative amount)
 */
router.get("/", authenticateToken, async (req, res) => {
  const userId = req.user.userId;
  
  const {
    start_date,
    end_date,
    type,
    wallet_id,
    wallet_ids,
    page = 1,
    per_page = 30,
    category_id,
    category_ids,
    tag_ids,
    search,
    min_amount,
    max_amount,
    include_future = 'false',
    currency,
    exclude_base_currency = 'false'
  } = req.query;

  try {
    // Default date range to current month if not provided
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth(); // 0-indexed
    
    // First day of current month (format in local timezone, not UTC)
    const firstDay = new Date(year, month, 1);
    const defaultStartDate = start_date || `${year}-${String(month + 1).padStart(2, '0')}-01`;
    
    // Last day of current month (format in local timezone, not UTC)
    const lastDay = new Date(year, month + 1, 0);
    const lastDayNum = lastDay.getDate();
    const defaultEndDate = end_date || `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDayNum).padStart(2, '0')}`;

    // Parse pagination
    const pageNum = parseInt(page) || 1;
    const perPage = Math.min(parseInt(per_page) || 30, 100); // Max 100 per page
    const offset = (pageNum - 1) * perPage;

    // Parse include_future
    const includeFuture = include_future === 'true';
    
    // Get user's base currency for currency filtering
    let userBaseCurrency = 'USD';
    if (exclude_base_currency === 'true' || currency) {
      const [user] = await sql`
        SELECT base_currency 
        FROM users 
        WHERE id = ${userId}
      `;
      userBaseCurrency = user?.base_currency || 'USD';
    }
    
    // Build WHERE conditions using sql.unsafe for the final query
    let queryParts = {
      baseWhere: `t.user_id = ${userId} 
        AND t.date >= '${defaultStartDate}'::date 
        AND t.date <= '${defaultEndDate}'::date`,
      additional: []
    };

    if (!includeFuture) {
      // Use local date instead of CURRENT_DATE to avoid timezone issues
      const todayLocal = `${year}-${String(month + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      queryParts.additional.push(`t.date <= '${todayLocal}'::date`);
    }

    // Handle single or multiple transaction types (comma-separated)
    if (type) {
      const types = type.split(',').map(t => t.trim()).filter(t => ['income', 'expense', 'transfer'].includes(t));
      if (types.length === 1) {
        queryParts.additional.push(`t.type = '${types[0]}'`);
      } else if (types.length > 1) {
        const typeList = types.map(t => `'${t}'`).join(',');
        queryParts.additional.push(`t.type IN (${typeList})`);
      }
    }

    // Handle wallet filter (single or multiple)
    const walletFilter = wallet_ids || wallet_id;
    if (walletFilter) {
      const walletIdNums = walletFilter.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
      if (walletIdNums.length === 1) {
        queryParts.additional.push(`(t.wallet_id = ${walletIdNums[0]} OR t.to_wallet_id = ${walletIdNums[0]})`);
      } else if (walletIdNums.length > 1) {
        const walletList = walletIdNums.join(',');
        queryParts.additional.push(`(t.wallet_id IN (${walletList}) OR t.to_wallet_id IN (${walletList}))`);
      }
    }

    // Handle currency filter
    if (exclude_base_currency === 'true') {
      // Show transactions where at least one wallet is NOT the base currency
      queryParts.additional.push(`(
        (w.currency IS NOT NULL AND w.currency != '${userBaseCurrency}') OR 
        (tw.currency IS NOT NULL AND tw.currency != '${userBaseCurrency}')
      )`);
    } else if (currency && currency.trim()) {
      const currencyCode = currency.trim().toUpperCase();
      queryParts.additional.push(`(w.currency = '${currencyCode}' OR tw.currency = '${currencyCode}')`);
    }

    // Handle category filter (single or multiple)
    const categoryFilter = category_ids || category_id;
    if (categoryFilter) {
      const categoryArray = categoryFilter.split(',').map(id => `'${id.trim()}'`).join(',');
      queryParts.additional.push(`t.category_id IN (${categoryArray})`);
    }

    if (search && search.trim()) {
      const searchTerm = search.trim().replace(/'/g, "''");
      queryParts.additional.push(`(
        LOWER(t.description) LIKE LOWER('%${searchTerm}%') OR 
        LOWER(t.merchant) LIKE LOWER('%${searchTerm}%')
      )`);
    }

    if (min_amount) {
      const minAmt = parseFloat(min_amount);
      queryParts.additional.push(`ABS(t.amount) >= ${minAmt}`);
    }

    if (max_amount) {
      const maxAmt = parseFloat(max_amount);
      queryParts.additional.push(`ABS(t.amount) <= ${maxAmt}`);
    }

    if (tag_ids && tag_ids.trim()) {
      const tagIdArray = tag_ids.split(',').map(id => `'${id.trim()}'`).join(',');
      const tagCount = tag_ids.split(',').length;
      queryParts.additional.push(`(
        SELECT COUNT(DISTINCT tt.tag_id)
        FROM transaction_tags tt
        WHERE tt.transaction_id = t.id
        AND tt.tag_id IN (${tagIdArray})
      ) = ${tagCount}`);
    }

    // For transfers, only show one transaction per pair (the "from" side with negative amount)
    queryParts.additional.push(`(t.type != 'transfer' OR t.amount < 0)`);
    
    // Exclude transactions from archived wallets
    queryParts.additional.push(`(w.is_archived = false OR w.is_archived IS NULL)`);
    queryParts.additional.push(`(tw.is_archived = false OR tw.is_archived IS NULL OR t.to_wallet_id IS NULL)`);
    
    // Exclude initial_balance system transactions (they're for internal bookkeeping only)
    queryParts.additional.push(`t.system_type IS DISTINCT FROM 'initial_balance'`);
    
    const fullWhereClause = queryParts.additional.length > 0
      ? `${queryParts.baseWhere} AND ${queryParts.additional.join(' AND ')}`
      : queryParts.baseWhere;

    // Build FROM clause for COUNT/totals queries (always need wallet joins to filter archived wallets)
    const countQueryFrom = `transactions t 
       LEFT JOIN wallets w ON t.wallet_id = w.id
       LEFT JOIN wallets tw ON t.to_wallet_id = tw.id`;

    // Get transactions with filters
    const transactions = await sql.unsafe(`
      SELECT 
        t.*,
        w.name as wallet_name,
        w.icon as wallet_icon,
        w.type as wallet_type,
        c.name as category_name,
        c.icon as category_icon,
        c.type as category_type,
        tw.name as to_wallet_name,
        tw.icon as to_wallet_icon,
        tw.currency as to_wallet_currency,
        CASE 
          WHEN t.type = 'transfer' THEN (
            SELECT pt.exchange_rate_used 
            FROM transactions pt 
            WHERE pt.user_id = t.user_id
              AND pt.type = 'transfer'
              AND pt.wallet_id = t.to_wallet_id
              AND pt.to_wallet_id = t.wallet_id
              AND pt.date = t.date
              AND pt.id != t.id
              AND pt.exchange_rate_used IS NOT NULL
              AND pt.exchange_rate_used != 1
            LIMIT 1
          )
          ELSE NULL
        END as paired_exchange_rate_used,
        CASE 
          WHEN t.type = 'transfer' THEN (
            SELECT pt.exchange_rate_date 
            FROM transactions pt 
            WHERE pt.user_id = t.user_id
              AND pt.type = 'transfer'
              AND pt.wallet_id = t.to_wallet_id
              AND pt.to_wallet_id = t.wallet_id
              AND pt.date = t.date
              AND pt.id != t.id
            LIMIT 1
          )
          ELSE NULL
        END as paired_exchange_rate_date,
        CASE 
          WHEN t.type = 'transfer' THEN (
            SELECT pt.manual_exchange_rate 
            FROM transactions pt 
            WHERE pt.user_id = t.user_id
              AND pt.type = 'transfer'
              AND pt.wallet_id = t.to_wallet_id
              AND pt.to_wallet_id = t.wallet_id
              AND pt.date = t.date
              AND pt.id != t.id
            LIMIT 1
          )
          ELSE NULL
        END as paired_manual_exchange_rate
      FROM transactions t
      LEFT JOIN wallets w ON t.wallet_id = w.id
      LEFT JOIN wallets tw ON t.to_wallet_id = tw.id
      LEFT JOIN categories c ON t.category_id = c.id
      WHERE ${fullWhereClause}
      ORDER BY t.date DESC, t.created_at DESC
      LIMIT ${perPage}
      OFFSET ${offset}
    `);

    // Get total count
    const [countResult] = await sql.unsafe(`
      SELECT COUNT(*)::int as total
      FROM ${countQueryFrom}
      WHERE ${fullWhereClause}
    `);

    const totalCount = countResult?.total || 0;
    const totalPages = Math.ceil(totalCount / perPage);

    // Get user's base currency for totals
    const [user] = await sql`
      SELECT base_currency 
      FROM users 
      WHERE id = ${userId}
    `;
    const baseCurrency = user?.base_currency || 'USD';

    // Calculate totals for ALL matching transactions (not just paginated results)
    // Use base_currency_amount for multi-currency support
    // Exclude ALL system transactions from totals (initial_balance and balance_adjustment)
    // System transactions affect wallet balance but are not real income/expenses
    const [totalsResult] = await sql.unsafe(`
      SELECT 
        COALESCE(SUM(CASE WHEN t.type = 'income' AND t.is_system = false THEN t.base_currency_amount ELSE 0 END), 0) as total_income,
        COALESCE(SUM(CASE WHEN t.type = 'expense' AND t.is_system = false THEN ABS(t.base_currency_amount) ELSE 0 END), 0) as total_expenses,
        COALESCE(
          SUM(CASE WHEN t.type = 'income' AND t.is_system = false THEN t.base_currency_amount ELSE 0 END) - 
          SUM(CASE WHEN t.type = 'expense' AND t.is_system = false THEN ABS(t.base_currency_amount) ELSE 0 END), 
          0
        ) as net_income
      FROM ${countQueryFrom}
      WHERE ${fullWhereClause}
    `);

    const totals = totalsResult ? {
      income: parseFloat(totalsResult.total_income) || 0,
      expenses: parseFloat(totalsResult.total_expenses) || 0,
      net: parseFloat(totalsResult.net_income) || 0,
      currency: baseCurrency
    } : {
      income: 0,
      expenses: 0,
      net: 0,
      currency: baseCurrency
    };

    // Get tags for each transaction
    const transactionIds = transactions.map(t => t.id);
    let transactionTags = [];
    
    if (transactionIds.length > 0) {
      transactionTags = await sql`
        SELECT tt.transaction_id, t.id as tag_id, t.name as tag_name, t.is_system
        FROM transaction_tags tt
        JOIN tags t ON tt.tag_id = t.id
        WHERE tt.transaction_id IN ${sql(transactionIds)}
      `;
    }

    // Attach tags to transactions
    const transactionsWithTags = transactions.map(transaction => ({
      ...transaction,
      tags: transactionTags
        .filter(tt => tt.transaction_id === transaction.id)
        .map(tt => ({
          id: tt.tag_id,
          name: tt.tag_name,
          is_system: tt.is_system
        }))
    }));

    res.json({
      transactions: transactionsWithTags,
      pagination: {
        page: pageNum,
        per_page: perPage,
        total_count: totalCount,
        total_pages: totalPages,
        has_next: pageNum < totalPages,
        has_prev: pageNum > 1
      },
      totals: {
        income: totals.income,
        expenses: totals.expenses,
        net: totals.net,
        currency: totals.currency
      },
      filters: {
        start_date: defaultStartDate,
        end_date: defaultEndDate,
        type: type || 'all',
        wallet_id: wallet_id || 'all',
        category_id: category_id || 'all',
        tag_ids: tag_ids || 'none',
        search: search || '',
        min_amount: min_amount || null,
        max_amount: max_amount || null,
        include_future: includeFuture,
        currency: currency || null,
        exclude_base_currency: exclude_base_currency === 'true'
      }
    });

  } catch (error) {
    console.error("Error fetching transactions:", error);
    res.status(500).json({ 
      error: "Failed to fetch transactions" 
    });
  }
});

/**
 * GET /api/transactions/csv
 * Export transactions as CSV with the same filtering as the main endpoint
 * 
 * Query params: Same as GET /api/transactions (all filters supported)
 * 
 * CSV Columns:
 * - Date, Type, Category, Amount, Currency, Wallet, To Wallet (for transfers),
 *   Merchant/Source, Description, Tags, Status, Created At
 */
router.get("/csv", authenticateToken, csvExportShortTermLimiter, csvExportLongTermLimiter, async (req, res) => {
  const userId = req.user.userId;
  const MAX_EXPORT_ROWS = 10000;
  
  const {
    start_date,
    end_date,
    type,
    wallet_id,
    wallet_ids,
    category_id,
    category_ids,
    tag_ids,
    search,
    min_amount,
    max_amount,
    include_future = 'false',
    currency,
    exclude_base_currency = 'false'
  } = req.query;

  try {
    // Default date range to current month if not provided
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    
    // First day of current month (format in local timezone, not UTC)
    const firstDay = new Date(year, month, 1);
    const defaultStartDate = start_date || `${year}-${String(month + 1).padStart(2, '0')}-01`;
    
    // Last day of current month (format in local timezone, not UTC)
    const lastDay = new Date(year, month + 1, 0);
    const lastDayNum = lastDay.getDate();
    const defaultEndDate = end_date || `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDayNum).padStart(2, '0')}`;

    // Parse include_future
    const includeFuture = include_future === 'true';
    
    // Get user's base currency for currency filtering
    let userBaseCurrency = 'USD';
    if (exclude_base_currency === 'true' || currency) {
      const [user] = await sql`
        SELECT base_currency 
        FROM users 
        WHERE id = ${userId}
      `;
      userBaseCurrency = user?.base_currency || 'USD';
    }
    
    // Build WHERE conditions (same logic as main endpoint)
    let queryParts = {
      baseWhere: `t.user_id = ${userId} 
        AND t.date >= '${defaultStartDate}'::date 
        AND t.date <= '${defaultEndDate}'::date`,
      additional: []
    };

    if (!includeFuture) {
      // Use local date instead of CURRENT_DATE to avoid timezone issues
      const todayLocal = `${year}-${String(month + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      queryParts.additional.push(`t.date <= '${todayLocal}'::date`);
    }

    // Handle transaction types
    if (type) {
      const types = type.split(',').map(t => t.trim()).filter(t => ['income', 'expense', 'transfer'].includes(t));
      if (types.length === 1) {
        queryParts.additional.push(`t.type = '${types[0]}'`);
      } else if (types.length > 1) {
        const typeList = types.map(t => `'${t}'`).join(',');
        queryParts.additional.push(`t.type IN (${typeList})`);
      }
    }

    // Handle wallet filter
    const walletFilter = wallet_ids || wallet_id;
    if (walletFilter) {
      const walletIdNums = walletFilter.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
      if (walletIdNums.length === 1) {
        queryParts.additional.push(`(t.wallet_id = ${walletIdNums[0]} OR t.to_wallet_id = ${walletIdNums[0]})`);
      } else if (walletIdNums.length > 1) {
        const walletList = walletIdNums.join(',');
        queryParts.additional.push(`(t.wallet_id IN (${walletList}) OR t.to_wallet_id IN (${walletList}))`);
      }
    }

    // Handle currency filter
    if (exclude_base_currency === 'true') {
      // Show transactions where at least one wallet is NOT the base currency
      queryParts.additional.push(`(
        (w.currency IS NOT NULL AND w.currency != '${userBaseCurrency}') OR 
        (tw.currency IS NOT NULL AND tw.currency != '${userBaseCurrency}')
      )`);
    } else if (currency && currency.trim()) {
      const currencyCode = currency.trim().toUpperCase();
      queryParts.additional.push(`(w.currency = '${currencyCode}' OR tw.currency = '${currencyCode}')`);
    }

    // Handle category filter
    const categoryFilter = category_ids || category_id;
    if (categoryFilter) {
      const categoryArray = categoryFilter.split(',').map(id => `'${id.trim()}'`).join(',');
      queryParts.additional.push(`t.category_id IN (${categoryArray})`);
    }

    // Handle search
    if (search && search.trim()) {
      const searchTerm = search.trim().replace(/'/g, "''");
      queryParts.additional.push(`(
        LOWER(t.description) LIKE LOWER('%${searchTerm}%') OR 
        LOWER(t.merchant) LIKE LOWER('%${searchTerm}%')
      )`);
    }

    // Handle amount range
    if (min_amount) {
      const minAmt = parseFloat(min_amount);
      queryParts.additional.push(`ABS(t.amount) >= ${minAmt}`);
    }

    if (max_amount) {
      const maxAmt = parseFloat(max_amount);
      queryParts.additional.push(`ABS(t.amount) <= ${maxAmt}`);
    }

    // Handle tags
    if (tag_ids && tag_ids.trim()) {
      const tagIdArray = tag_ids.split(',').map(id => `'${id.trim()}'`).join(',');
      const tagCount = tag_ids.split(',').length;
      queryParts.additional.push(`(
        SELECT COUNT(DISTINCT tt.tag_id)
        FROM transaction_tags tt
        WHERE tt.transaction_id = t.id
        AND tt.tag_id IN (${tagIdArray})
      ) = ${tagCount}`);
    }

    // For transfers, only show one transaction per pair
    queryParts.additional.push(`(t.type != 'transfer' OR t.amount < 0)`);
    
    // Exclude transactions from archived wallets
    queryParts.additional.push(`(w.is_archived = false OR w.is_archived IS NULL)`);
    queryParts.additional.push(`(tw.is_archived = false OR tw.is_archived IS NULL OR t.to_wallet_id IS NULL)`);
    
    const fullWhereClause = queryParts.additional.length > 0
      ? `${queryParts.baseWhere} AND ${queryParts.additional.join(' AND ')}`
      : queryParts.baseWhere;

    // Build FROM clause for COUNT query (always need wallet joins to filter archived wallets)
    const countQueryFrom = `transactions t 
       LEFT JOIN wallets w ON t.wallet_id = w.id
       LEFT JOIN wallets tw ON t.to_wallet_id = tw.id`;

    // First, count the transactions to check if it exceeds max limit
    const countResult = await sql.unsafe(`
      SELECT COUNT(*) as total
      FROM ${countQueryFrom}
      WHERE ${fullWhereClause}
    `);
    
    const totalTransactions = parseInt(countResult[0].total);
    
    // Check if export exceeds max rows limit
    if (totalTransactions > MAX_EXPORT_ROWS) {
      return res.status(400).json({
        error: "Your export is too large. Please narrow your date range.",
        totalRows: totalTransactions,
        maxRows: MAX_EXPORT_ROWS
      });
    }

    // Get all transactions (no pagination for CSV export)
    const transactions = await sql.unsafe(`
      SELECT 
        t.*,
        w.name as wallet_name,
        c.name as category_name,
        tw.name as to_wallet_name
      FROM transactions t
      LEFT JOIN wallets w ON t.wallet_id = w.id
      LEFT JOIN wallets tw ON t.to_wallet_id = tw.id
      LEFT JOIN categories c ON t.category_id = c.id
      WHERE ${fullWhereClause}
      ORDER BY t.date DESC, t.created_at DESC
    `);

    // Get tags for each transaction
    const transactionIds = transactions.map(t => t.id);
    let transactionTags = [];
    
    if (transactionIds.length > 0) {
      transactionTags = await sql`
        SELECT tt.transaction_id, t.name as tag_name
        FROM transaction_tags tt
        JOIN tags t ON tt.tag_id = t.id
        WHERE tt.transaction_id IN ${sql(transactionIds)}
      `;
    }

    // Build CSV content with proper formatting for both Excel and Google Sheets
    // Use comma delimiter (RFC 4180 standard) for universal compatibility
    // Use \r\n line endings (Windows standard)
    const csvHeader = 'Date,Type,Category,Amount,Currency,Wallet,To Wallet,Merchant/Source,Description,Tags,System Type,Status,Created At\r\n';
    
    const csvRows = transactions.map(t => {
      // Get tags for this transaction
      const tags = transactionTags
        .filter(tt => tt.transaction_id === t.id)
        .map(tt => tt.tag_name)
        .join('; ');
      
      // Format merchant/source field
      let merchantSource = '';
      if (t.type === 'transfer') {
        merchantSource = '';
      } else if (t.type === 'income') {
        merchantSource = t.merchant || '';
      } else {
        merchantSource = t.merchant || '';
      }
      
      // Escape CSV special characters (quotes, commas, newlines)
      // Always quote fields to ensure proper parsing in all applications
      const escapeCSV = (value) => {
        if (value === null || value === undefined) return '""';
        const str = String(value);
        // Quote and escape all fields for maximum compatibility
        return `"${str.replace(/"/g, '""')}"`;
      };
      
      return [
        escapeCSV(t.date.toISOString().split('T')[0]), // Date
        escapeCSV(t.type), // Type
        escapeCSV(t.category_name || ''), // Category
        escapeCSV(Math.abs(t.amount)), // Amount (absolute value)
        escapeCSV(t.currency), // Currency
        escapeCSV(t.wallet_name || ''), // Wallet
        escapeCSV(t.to_wallet_name || ''), // To Wallet
        escapeCSV(merchantSource), // Merchant/Source
        escapeCSV(t.description || ''), // Description
        escapeCSV(tags), // Tags
        escapeCSV(t.system_type || ''), // System Type (initial_balance, balance_adjustment, or empty)
        escapeCSV(t.status || 'actual'), // Status
        escapeCSV(t.created_at.toISOString()) // Created At
      ].join(',');
    }).join('\r\n');

    // Add UTF-8 BOM for Excel compatibility
    const BOM = '\uFEFF';
    const csvContent = BOM + csvHeader + csvRows;

    // Set headers for file download with proper charset
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="transactions_${defaultStartDate}_to_${defaultEndDate}.csv"`);
    
    res.send(csvContent);

  } catch (error) {
    console.error("Error exporting transactions to CSV:", error);
    res.status(500).json({ 
      error: "Failed to export transactions" 
    });
  }
});

/**
 * POST /api/transactions
 * Create a new transaction (income, expense, or transfer)
 * 
 * Rate limits:
 * - 5 requests per 10 seconds
 * - 20 requests per hour
 * 
 * Requires Idempotency-Key header
 */
router.post("/", 
  authenticateToken, 
  transactionShortTermLimiter, 
  transactionLongTermLimiter, 
  idempotencyMiddleware, 
  async (req, res) => {
  const {
    transactionType,
    amount,
    walletId,
    fromWalletId,
    toWalletId,
    category,
    suggestedTags = [],
    customTags = [],
    date,
    merchant,
    counterparty,
    description,
    manualExchangeRate = null
  } = req.body;

  const userId = req.user.userId;

  try {
    // Validate transaction type
    const validTypes = ['income', 'expense', 'transfer'];
    if (!transactionType || !validTypes.includes(transactionType)) {
      return res.status(400).json({ 
        error: "Valid transaction type is required (income, expense, or transfer)" 
      });
    }

    // Validate amount
    if (!amount || isNaN(amount) || parseFloat(amount) <= 0) {
      return res.status(400).json({ 
        error: "Valid positive amount is required" 
      });
    }

    const amountValue = parseFloat(amount);

    // Validate date
    if (!date) {
      return res.status(400).json({ 
        error: "Date is required" 
      });
    }

    // Validate merchant length
    if (merchant && merchant.length > 80) {
      return res.status(400).json({ 
        error: "Merchant must not exceed 80 characters" 
      });
    }

    // Validate counterparty length
    if (counterparty && counterparty.length > 80) {
      return res.status(400).json({ 
        error: "Counterparty must not exceed 80 characters" 
      });
    }

    // Validate description length
    if (description && description.length > 200) {
      return res.status(400).json({ 
        error: "Description must not exceed 200 characters" 
      });
    }

    // Validate based on transaction type
    if (transactionType === 'transfer') {
      // Transfer validation
      if (!fromWalletId || !toWalletId) {
        return res.status(400).json({ 
          error: "Both from_wallet and to_wallet are required for transfers" 
        });
      }

      if (fromWalletId === toWalletId) {
        return res.status(400).json({ 
          error: "Cannot transfer to the same wallet" 
        });
      }

      if (category) {
        return res.status(400).json({ 
          error: "Transfers cannot have a category" 
        });
      }

      if (suggestedTags.length > 0 || customTags.length > 0) {
        return res.status(400).json({ 
          error: "Transfers cannot have tags" 
        });
      }
    } else {
      // Income/Expense validation
      if (!walletId) {
        return res.status(400).json({ 
          error: "Wallet is required for income and expense transactions" 
        });
      }

      if (!category) {
        return res.status(400).json({ 
          error: "Category is required for income and expense transactions" 
        });
      }

      // Validate tag limit (max 5)
      const totalTags = suggestedTags.length + customTags.length;
      if (totalTags > 5) {
        return res.status(400).json({ 
          error: "Cannot add more than 5 tags" 
        });
      }
    }

    // Get user's base currency for exchange rate calculations
    const [user] = await sql`
      SELECT base_currency 
      FROM users 
      WHERE id = ${userId}
    `;
    const baseCurrency = user?.base_currency || 'USD';

    // Start transaction
    const result = await sql.begin(async (sql) => {
      // Handle new tag creation
      const processedCustomTags = [];
      
      for (const tag of customTags) {
        if (tag.isNew) {
          // Create new user tag
          const [newTag] = await sql`
            INSERT INTO tags (user_id, name, is_system)
            VALUES (${userId}, ${tag.name}, false)
            RETURNING id, name
          `;
          processedCustomTags.push(newTag.id);
        } else {
          // Use existing tag ID
          processedCustomTags.push(tag.id);
        }
      }

      // Combine all tag IDs
      const allTagIds = [...suggestedTags, ...processedCustomTags];

      if (transactionType === 'transfer') {
        // Handle transfer: create 2 transactions
        
        // Verify both wallets belong to user
        const wallets = await sql`
          SELECT id, current_balance, type, currency, created_at 
          FROM wallets 
          WHERE id IN (${fromWalletId}, ${toWalletId}) 
          AND user_id = ${userId}
          AND is_archived = FALSE
        `;

        if (wallets.length !== 2) {
          throw new Error("One or both wallets not found or archived");
        }

        const fromWallet = wallets.find(w => w.id === parseInt(fromWalletId));
        const toWallet = wallets.find(w => w.id === parseInt(toWalletId));
        
        // Validate transaction date is not before wallet creation dates
        const transactionDate = new Date(date);
        transactionDate.setHours(0, 0, 0, 0);
        
        const fromWalletCreated = new Date(fromWallet.created_at);
        fromWalletCreated.setHours(0, 0, 0, 0);
        if (transactionDate < fromWalletCreated) {
          const formattedDate = fromWalletCreated.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
          return res.status(400).json({ 
            error: `Transactions can't be dated before the wallet's starting balance (${formattedDate})` 
          });
        }
        
        const toWalletCreated = new Date(toWallet.created_at);
        toWalletCreated.setHours(0, 0, 0, 0);
        if (transactionDate < toWalletCreated) {
          const formattedDate = toWalletCreated.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
          return res.status(400).json({ 
            error: `Transactions can't be dated before the wallet's starting balance (${formattedDate})` 
          });
        }

        // Check if from_wallet would be overdrawn (only for cash wallets)
        if (fromWallet.type === 'cash' && fromWallet.current_balance < amountValue) {
          return res.status(400).json({ 
            error: "Insufficient balance in source wallet. Cash wallets cannot be overdrawn." 
          });
        }

        // Step 1: Convert FROM wallet amount to base currency
        // This gives us the "value" of the transfer in base currency terms
        const fromExchangeInfo = await calculateBaseCurrencyAmount({
          amount: -amountValue, // Negative because it's leaving the FROM wallet
          walletCurrency: fromWallet.currency,
          baseCurrency,
          transactionDate: date,
          manualRate: manualExchangeRate
        });

        // The base currency amount represents the "true value" of the transfer
        // e.g., 50,000 JPY = ~$322.93 USD
        const transferValueInBase = Math.abs(fromExchangeInfo.base_currency_amount);

        // Step 2: Convert that base currency amount to TO wallet's currency
        let toWalletAmount;
        let toExchangeInfo;
        
        if (toWallet.currency === baseCurrency) {
          // TO wallet uses base currency, so the amount is the transfer value
          toWalletAmount = transferValueInBase;
          toExchangeInfo = {
            base_currency_amount: transferValueInBase,
            exchange_rate_date: null,
            exchange_rate_used: null,
            manual_exchange_rate: false
          };
        } else if (fromWallet.currency === toWallet.currency) {
          // Same currency, no conversion needed
          toWalletAmount = amountValue;
          toExchangeInfo = fromExchangeInfo;
        } else {
          // Different currency from base - need to convert base → TO currency
          // Get rate for TO currency (1 USD = X TO currency)
          const { findClosestExchangeRate } = await import('../services/exchangeRateService.js');
          const toRateInfo = await findClosestExchangeRate(toWallet.currency, date);
          
          if (!toRateInfo) {
            throw new Error(`No exchange rate found for ${toWallet.currency} on or before ${date}. Please provide a manual exchange rate.`);
          }
          
          // Convert: base currency (USD) → TO currency
          toWalletAmount = transferValueInBase * toRateInfo.rate;
          
          toExchangeInfo = {
            base_currency_amount: transferValueInBase, // Should be same as fromExchangeInfo
            exchange_rate_date: toRateInfo.date,
            exchange_rate_used: toRateInfo.rate,
            manual_exchange_rate: false
          };
        }

        // Create "from" transaction (negative)
        const [fromTransaction] = await sql`
          INSERT INTO transactions (
            user_id, wallet_id, to_wallet_id, type, amount, 
            currency, description, date, is_system, status,
            base_currency_amount, exchange_rate_date, exchange_rate_used, manual_exchange_rate
          )
          VALUES (
            ${userId}, ${fromWalletId}, ${toWalletId}, 'transfer', ${-amountValue},
            ${fromWallet.currency}, ${description || null}, ${date}, false, 'actual',
            ${fromExchangeInfo.base_currency_amount}, ${fromExchangeInfo.exchange_rate_date}, 
            ${fromExchangeInfo.exchange_rate_used}, ${fromExchangeInfo.manual_exchange_rate}
          )
          RETURNING *
        `;

        // Create "to" transaction (positive, using converted amount in TO wallet's currency)
        const [toTransaction] = await sql`
          INSERT INTO transactions (
            user_id, wallet_id, to_wallet_id, type, amount, 
            currency, description, date, is_system, status,
            base_currency_amount, exchange_rate_date, exchange_rate_used, manual_exchange_rate
          )
          VALUES (
            ${userId}, ${toWalletId}, ${fromWalletId}, 'transfer', ${toWalletAmount},
            ${toWallet.currency}, ${description || null}, ${date}, false, 'actual',
            ${toExchangeInfo.base_currency_amount}, ${toExchangeInfo.exchange_rate_date}, 
            ${toExchangeInfo.exchange_rate_used}, ${toExchangeInfo.manual_exchange_rate}
          )
          RETURNING *
        `;

        // Update wallet balances
        // Deduct from FROM wallet (in FROM currency)
        await sql`
          UPDATE wallets 
          SET current_balance = current_balance - ${amountValue}
          WHERE id = ${fromWalletId}
        `;

        // Add to TO wallet (in TO currency, converted amount)
        await sql`
          UPDATE wallets 
          SET current_balance = current_balance + ${toWalletAmount}
          WHERE id = ${toWalletId}
        `;

        return { 
          success: true, 
          transactions: [fromTransaction, toTransaction],
          type: 'transfer'
        };

      } else {
        // Handle income/expense
        
        // Verify wallet belongs to user
        const [wallet] = await sql`
          SELECT id, current_balance, type, currency, created_at 
          FROM wallets 
          WHERE id = ${walletId} AND user_id = ${userId} AND is_archived = FALSE
        `;

        if (!wallet) {
          throw new Error("Wallet not found or archived");
        }
        
        // Validate transaction date is not before wallet creation date
        const transactionDate = new Date(date);
        transactionDate.setHours(0, 0, 0, 0);
        const walletCreated = new Date(wallet.created_at);
        walletCreated.setHours(0, 0, 0, 0);
        
        if (transactionDate < walletCreated) {
          const formattedDate = walletCreated.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
          return res.status(400).json({ 
            error: `Transactions can't be dated before the wallet's starting balance (${formattedDate})` 
          });
        }

        // Verify category belongs to user or is system, and matches transaction type
        const [categoryData] = await sql`
          SELECT id, type 
          FROM categories 
          WHERE id = ${category} 
          AND (user_id = ${userId} OR user_id IS NULL)
        `;

        if (!categoryData) {
          throw new Error("Category not found");
        }

        if (categoryData.type !== transactionType) {
          throw new Error(`Category type must match transaction type (${transactionType})`);
        }

        // For expenses, check if wallet can be overdrawn (only cash wallets)
        if (transactionType === 'expense') {
          if (wallet.type === 'cash' && wallet.current_balance < amountValue) {
            return res.status(400).json({ 
              error: "Insufficient balance. Cash wallets cannot be overdrawn." 
            });
          }
        }

        // Calculate actual amount (negative for expense)
        const actualAmount = transactionType === 'expense' ? -amountValue : amountValue;

        // Calculate base currency amount
        const exchangeInfo = await calculateBaseCurrencyAmount({
          amount: actualAmount,
          walletCurrency: wallet.currency,
          baseCurrency,
          transactionDate: date,
          manualRate: manualExchangeRate
        });

        // Create transaction
        const [transaction] = await sql`
          INSERT INTO transactions (
            user_id, wallet_id, type, amount, currency, 
            merchant, counterparty, description, category_id, date, is_system, status,
            base_currency_amount, exchange_rate_date, exchange_rate_used, manual_exchange_rate
          )
          VALUES (
            ${userId}, ${walletId}, ${transactionType}, ${actualAmount}, 
            ${wallet.currency}, ${merchant || null}, ${counterparty || null}, ${description || null}, ${category}, ${date}, false, 'actual',
            ${exchangeInfo.base_currency_amount}, ${exchangeInfo.exchange_rate_date}, 
            ${exchangeInfo.exchange_rate_used}, ${exchangeInfo.manual_exchange_rate}
          )
          RETURNING *
        `;

        // Insert transaction tags
        if (allTagIds.length > 0) {
          for (const tagId of allTagIds) {
            await sql`
              INSERT INTO transaction_tags (transaction_id, tag_id)
              VALUES (${transaction.id}, ${tagId})
            `;
          }
        }

        // Validate liquidity limit before updating balance
        if (actualAmount > 0) { // Only validate for income (positive amounts)
          const liquidityCheck = await validateLiquidityLimit(userId, baseCurrency, [
            { walletId, amountChange: actualAmount, walletCurrency: wallet.currency }
          ]);
          
          if (!liquidityCheck.valid) {
            throw new Error(liquidityCheck.error);
          }
        }
        
        // Update wallet balance
        await sql`
          UPDATE wallets 
          SET current_balance = current_balance + ${actualAmount}
          WHERE id = ${walletId}
        `;

        return { 
          success: true, 
          transaction,
          type: transactionType
        };
      }
    });

    res.status(201).json({
      message: "Transaction created successfully",
      ...result
    });

  } catch (error) {
    console.error("Error creating transaction:", error);
    
    // Check if error is numeric overflow
    if (error.message && error.message.includes('numeric field overflow')) {
      // Get user's base currency for error message
      const [user] = await sql`SELECT base_currency FROM users WHERE id = ${userId}`;
      const baseCurrency = user?.base_currency || 'USD';
      
      return res.status(400).json({ 
        error: `This transaction would exceed the maximum allowed wallet balance of ${formatMaxLiquidity(baseCurrency)}` 
      });
    }
    
    res.status(500).json({ 
      error: error.message || "Failed to create transaction" 
    });
  }
});

/**
 * DELETE /api/transactions/:id
 * Delete a transaction and update wallet balances
 */
router.delete("/:id", authenticateToken, async (req, res) => {
  const { id } = req.params;
  const userId = req.user.userId;

  try {
    // Begin transaction
    await sql.begin(async (sql) => {
      // Get transaction details before deleting
      const transaction = await sql`
        SELECT * FROM transactions 
        WHERE id = ${id} AND user_id = ${userId}
      `;

      if (transaction.length === 0) {
        throw new Error("Transaction not found");
      }

      const txn = transaction[0];

      // Handle wallet balance updates and deletions based on transaction type
      if (txn.type === 'transfer') {
        // For transfers, find and delete the paired transaction
        // Match paired transaction by swapped wallets and created within 5 seconds
        const pairedTransaction = await sql`
          SELECT * FROM transactions 
          WHERE user_id = ${userId}
            AND type = 'transfer'
            AND wallet_id = ${txn.to_wallet_id}
            AND to_wallet_id = ${txn.wallet_id}
            AND id != ${id}
            AND created_at BETWEEN (${txn.created_at}::timestamp - interval '5 seconds') 
                               AND (${txn.created_at}::timestamp + interval '5 seconds')
          ORDER BY created_at DESC
          LIMIT 1
        `;

        // Reverse the balance change for the current transaction's wallet
        // If amount is negative (source wallet), subtracting it adds money back
        // If amount is positive (destination wallet), subtracting it removes money
        await sql`
          UPDATE wallets 
          SET current_balance = current_balance - ${txn.amount}
          WHERE id = ${txn.wallet_id} AND user_id = ${userId}
        `;

        // Delete transaction tags for current transaction
        await sql`
          DELETE FROM transaction_tags 
          WHERE transaction_id = ${id}
        `;

        // Delete the current transaction
        await sql`
          DELETE FROM transactions 
          WHERE id = ${id} AND user_id = ${userId}
        `;

        // If paired transaction exists, delete it too
        if (pairedTransaction.length > 0) {
          const paired = pairedTransaction[0];
          
          // Reverse the balance change for paired transaction's wallet
          await sql`
            UPDATE wallets 
            SET current_balance = current_balance - ${paired.amount}
            WHERE id = ${paired.wallet_id} AND user_id = ${userId}
          `;

          // Delete transaction tags for paired transaction
          await sql`
            DELETE FROM transaction_tags 
            WHERE transaction_id = ${paired.id}
          `;

          // Delete the paired transaction
          await sql`
            DELETE FROM transactions 
            WHERE id = ${paired.id} AND user_id = ${userId}
          `;
        }
      } else {
        // For income/expense, reverse the amount
        // Income has positive amount, expense has negative amount
        await sql`
          UPDATE wallets 
          SET current_balance = current_balance - ${txn.amount}
          WHERE id = ${txn.wallet_id} AND user_id = ${userId}
        `;

        // Delete transaction tags
        await sql`
          DELETE FROM transaction_tags 
          WHERE transaction_id = ${id}
        `;

        // Delete the transaction
        await sql`
          DELETE FROM transactions 
          WHERE id = ${id} AND user_id = ${userId}
        `;
      }
    });

    res.json({ 
      message: "Transaction deleted successfully" 
    });

  } catch (error) {
    console.error("Error deleting transaction:", error);
    res.status(500).json({ 
      error: error.message || "Failed to delete transaction" 
    });
  }
});

/**
 * POST /api/transactions/bulk-delete
 * Delete multiple transactions and update wallet balances
 */
router.post("/bulk-delete", authenticateToken, async (req, res) => {
  const { transactionIds } = req.body;
  const userId = req.user.userId;

  // Validate input
  if (!Array.isArray(transactionIds) || transactionIds.length === 0) {
    return res.status(400).json({ error: "Invalid transaction IDs array" });
  }

  try {
    await sql.begin(async (sql) => {
      // Track paired transaction IDs to avoid duplicate processing
      const processedPairedIds = new Set();

      for (const id of transactionIds) {
        // Skip if this is a paired transaction that was already processed
        if (processedPairedIds.has(id)) {
          continue;
        }

        // Fetch the transaction to ensure it belongs to the user
        const transaction = await sql`
          SELECT * FROM transactions 
          WHERE id = ${id} AND user_id = ${userId}
        `;

        if (transaction.length === 0) {
          throw new Error(`Transaction ${id} not found or unauthorized`);
        }

        const trans = transaction[0];

        // Handle transfer type (paired transactions)
        if (trans.type === "transfer") {
          // Get the paired transaction
          const pairedTransaction = await sql`
            SELECT * FROM transactions 
            WHERE user_id = ${userId}
              AND type = 'transfer'
              AND wallet_id = ${trans.to_wallet_id}
              AND to_wallet_id = ${trans.wallet_id}
              AND id != ${id}
              AND created_at BETWEEN (${trans.created_at}::timestamp - interval '5 seconds') 
                                 AND (${trans.created_at}::timestamp + interval '5 seconds')
            ORDER BY created_at DESC
            LIMIT 1
          `;

          // Reverse the amount for the source wallet
          await sql`
            UPDATE wallets 
            SET current_balance = current_balance - ${trans.amount}
            WHERE id = ${trans.wallet_id} AND user_id = ${userId}
          `;

          // Delete transaction tags for current transaction
          await sql`
            DELETE FROM transaction_tags 
            WHERE transaction_id = ${id}
          `;

          // Delete the current transaction
          await sql`
            DELETE FROM transactions 
            WHERE id = ${id} AND user_id = ${userId}
          `;

          // If paired transaction exists, delete it too
          if (pairedTransaction.length > 0) {
            const paired = pairedTransaction[0];
            processedPairedIds.add(paired.id);

            // Reverse the amount for the destination wallet
            await sql`
              UPDATE wallets 
              SET current_balance = current_balance - ${paired.amount}
              WHERE id = ${paired.wallet_id} AND user_id = ${userId}
            `;

            // Delete transaction tags for paired transaction
            await sql`
              DELETE FROM transaction_tags 
              WHERE transaction_id = ${paired.id}
            `;

            // Delete the paired transaction
            await sql`
              DELETE FROM transactions 
              WHERE id = ${paired.id} AND user_id = ${userId}
            `;
          }
        } else {
          // For income/expense, reverse the amount
          // Income has positive amount, expense has negative amount
          await sql`
            UPDATE wallets 
            SET current_balance = current_balance - ${trans.amount}
            WHERE id = ${trans.wallet_id} AND user_id = ${userId}
          `;

          // Delete transaction tags
          await sql`
            DELETE FROM transaction_tags 
            WHERE transaction_id = ${id}
          `;

          // Delete the transaction
          await sql`
            DELETE FROM transactions 
            WHERE id = ${id} AND user_id = ${userId}
          `;
        }
      }
    });

    res.json({ 
      message: "Transactions deleted successfully",
      count: transactionIds.length
    });
  } catch (error) {
    console.error("Error bulk deleting transactions:", error);
    res.status(500).json({ 
      error: error.message || "Failed to bulk delete transactions" 
    });
  }
});

/**
 * PUT /api/transactions/:id
 * Update a transaction and recalculate wallet balances
 * 
 * Rate limits:
 * - 5 requests per 10 seconds
 * - 20 requests per hour
 * 
 * Requires Idempotency-Key header
 */
router.put("/:id", 
  authenticateToken, 
  transactionShortTermLimiter, 
  transactionLongTermLimiter, 
  idempotencyMiddleware, 
  async (req, res) => {
  const { id } = req.params;
  const userId = req.user.userId;
  const {
    amount,
    walletId,
    fromWalletId,
    toWalletId,
    category,
    suggestedTags = [],
    customTags = [],
    date,
    merchant,
    counterparty,
    description,
    manualExchangeRate = null
  } = req.body;

  try {
    // Get user's base currency for exchange rate calculations
    const [user] = await sql`
      SELECT base_currency 
      FROM users 
      WHERE id = ${userId}
    `;
    const baseCurrency = user?.base_currency || 'USD';

    await sql.begin(async (sql) => {
      // Get the existing transaction
      const existingTxn = await sql`
        SELECT * FROM transactions 
        WHERE id = ${id} AND user_id = ${userId}
      `;

      if (existingTxn.length === 0) {
        throw new Error("Transaction not found");
      }

      const oldTxn = existingTxn[0];

      // Validate amount
      if (!amount || isNaN(amount) || parseFloat(amount) <= 0) {
        throw new Error("Valid positive amount is required");
      }

      const amountValue = parseFloat(amount);

      // Validate date
      if (!date) {
        throw new Error("Date is required");
      }

      // Validate merchant length
      if (merchant && merchant.length > 80) {
        throw new Error("Merchant must not exceed 80 characters");
      }

      // Validate counterparty length
      if (counterparty && counterparty.length > 80) {
        throw new Error("Counterparty must not exceed 80 characters");
      }

      // Validate description length
      if (description && description.length > 200) {
        throw new Error("Description must not exceed 200 characters");
      }

      if (oldTxn.type === 'transfer') {
        // TRANSFER UPDATE
        if (!fromWalletId || !toWalletId) {
          throw new Error("Both source and destination wallets are required for transfers");
        }

        if (fromWalletId === toWalletId) {
          throw new Error("Source and destination wallets must be different");
        }

        // Get wallets
        const [fromWallet] = await sql`
          SELECT * FROM wallets 
          WHERE id = ${fromWalletId} AND user_id = ${userId} AND is_archived = FALSE
        `;

        const [toWallet] = await sql`
          SELECT * FROM wallets 
          WHERE id = ${toWalletId} AND user_id = ${userId} AND is_archived = FALSE
        `;

        if (!fromWallet || !toWallet) {
          throw new Error("One or both wallets not found or archived");
        }
        
        // Validate transaction date is not before wallet creation dates
        const transactionDate = new Date(date);
        transactionDate.setHours(0, 0, 0, 0);
        
        const fromWalletCreated = new Date(fromWallet.created_at);
        fromWalletCreated.setHours(0, 0, 0, 0);
        if (transactionDate < fromWalletCreated) {
          const formattedDate = fromWalletCreated.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
          throw new Error(`Transactions can't be dated before the wallet's starting balance (${formattedDate})`);
        }
        
        const toWalletCreated = new Date(toWallet.created_at);
        toWalletCreated.setHours(0, 0, 0, 0);
        if (transactionDate < toWalletCreated) {
          const formattedDate = toWalletCreated.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
          throw new Error(`Transactions can't be dated before the wallet's starting balance (${formattedDate})`);
        }

        // Check overdraft for cash wallets only
        if (fromWallet.type === 'cash') {
          const balanceAfterReversal = fromWallet.current_balance - oldTxn.amount;
          const balanceAfterNewTxn = balanceAfterReversal - amountValue;
          
          if (balanceAfterNewTxn < 0) {
            throw new Error("Insufficient balance in source wallet. Cash wallets cannot be overdrawn.");
          }
        }

        // Find the paired transaction
        const pairedTxn = await sql`
          SELECT * FROM transactions 
          WHERE user_id = ${userId}
            AND type = 'transfer'
            AND wallet_id = ${oldTxn.to_wallet_id}
            AND to_wallet_id = ${oldTxn.wallet_id}
            AND date = ${oldTxn.date}
            AND id != ${id}
          ORDER BY id DESC
          LIMIT 1
        `;

        // Step 1: Convert FROM wallet amount to base currency
        const fromExchangeInfo = await calculateBaseCurrencyAmount({
          amount: -amountValue,
          walletCurrency: fromWallet.currency,
          baseCurrency,
          transactionDate: date,
          manualRate: manualExchangeRate
        });

        const transferValueInBase = Math.abs(fromExchangeInfo.base_currency_amount);
        
        console.log(`[Transfer UPDATE] ${amountValue} ${fromWallet.currency} = ${transferValueInBase} ${baseCurrency}`);

        // Step 2: Convert that base currency amount to TO wallet's currency
        let toWalletAmount;
        let toExchangeInfo;
        
        if (toWallet.currency === baseCurrency) {
          toWalletAmount = transferValueInBase;
          toExchangeInfo = {
            base_currency_amount: transferValueInBase,
            exchange_rate_date: null,
            exchange_rate_used: null,
            manual_exchange_rate: false
          };
        } else if (fromWallet.currency === toWallet.currency) {
          toWalletAmount = amountValue;
          toExchangeInfo = fromExchangeInfo;
        } else {
          const { findClosestExchangeRate } = await import('../services/exchangeRateService.js');
          const toRateInfo = await findClosestExchangeRate(toWallet.currency, date);
          
          if (!toRateInfo) {
            throw new Error(`No exchange rate found for ${toWallet.currency} on or before ${date}. Please provide a manual exchange rate.`);
          }
          
          toWalletAmount = transferValueInBase * toRateInfo.rate;
          
          toExchangeInfo = {
            base_currency_amount: transferValueInBase,
            exchange_rate_date: toRateInfo.date,
            exchange_rate_used: toRateInfo.rate,
            manual_exchange_rate: false
          };
        }
        
        console.log(`[Transfer UPDATE] TO wallet receives: ${toWalletAmount} ${toWallet.currency}`);

        // Reverse old balance changes
        await sql`
          UPDATE wallets 
          SET current_balance = current_balance - ${oldTxn.amount}
          WHERE id = ${oldTxn.wallet_id} AND user_id = ${userId}
        `;

        if (pairedTxn.length > 0) {
          await sql`
            UPDATE wallets 
            SET current_balance = current_balance - ${pairedTxn[0].amount}
            WHERE id = ${pairedTxn[0].wallet_id} AND user_id = ${userId}
          `;
        }

        // Update the current transaction (source wallet)
        const [updatedFromTxn] = await sql`
          UPDATE transactions 
          SET 
            wallet_id = ${fromWalletId},
            to_wallet_id = ${toWalletId},
            amount = ${-amountValue},
            date = ${date},
            description = ${description || null},
            base_currency_amount = ${fromExchangeInfo.base_currency_amount},
            exchange_rate_date = ${fromExchangeInfo.exchange_rate_date},
            exchange_rate_used = ${fromExchangeInfo.exchange_rate_used},
            manual_exchange_rate = ${fromExchangeInfo.manual_exchange_rate},
            updated_at = NOW()
          WHERE id = ${id} AND user_id = ${userId}
          RETURNING *
        `;

        // Update or create paired transaction (destination wallet, using converted amount)
        if (pairedTxn.length > 0) {
          await sql`
            UPDATE transactions 
            SET 
              wallet_id = ${toWalletId},
              to_wallet_id = ${fromWalletId},
              amount = ${toWalletAmount},
              date = ${date},
              description = ${description || null},
              base_currency_amount = ${toExchangeInfo.base_currency_amount},
              exchange_rate_date = ${toExchangeInfo.exchange_rate_date},
              exchange_rate_used = ${toExchangeInfo.exchange_rate_used},
              manual_exchange_rate = ${toExchangeInfo.manual_exchange_rate},
              updated_at = NOW()
            WHERE id = ${pairedTxn[0].id} AND user_id = ${userId}
          `;
        } else {
          // Create paired transaction if it doesn't exist (using converted amount)
          await sql`
            INSERT INTO transactions (
              user_id, wallet_id, to_wallet_id, type, amount, 
              currency, description, date, is_system, status,
              base_currency_amount, exchange_rate_date, exchange_rate_used, manual_exchange_rate
            )
            VALUES (
              ${userId}, ${toWalletId}, ${fromWalletId}, 'transfer', ${toWalletAmount},
              ${toWallet.currency}, ${description || null}, ${date}, false, 'actual',
              ${toExchangeInfo.base_currency_amount}, ${toExchangeInfo.exchange_rate_date},
              ${toExchangeInfo.exchange_rate_used}, ${toExchangeInfo.manual_exchange_rate}
            )
          `;
        }

        // Apply new balance changes
        // Deduct from FROM wallet (in FROM currency)
        await sql`
          UPDATE wallets 
          SET current_balance = current_balance - ${amountValue}
          WHERE id = ${fromWalletId} AND user_id = ${userId}
        `;

        // Add to TO wallet (in TO currency, converted amount)
        await sql`
          UPDATE wallets 
          SET current_balance = current_balance + ${toWalletAmount}
          WHERE id = ${toWalletId} AND user_id = ${userId}
        `;

        res.json({ 
          message: "Transfer updated successfully",
          transaction: updatedFromTxn
        });

      } else {
        // INCOME/EXPENSE UPDATE
        if (!category) {
          throw new Error("Category is required for income and expense transactions");
        }

        if (!walletId) {
          throw new Error("Wallet is required");
        }

        // Get wallet
        const [wallet] = await sql`
          SELECT * FROM wallets 
          WHERE id = ${walletId} AND user_id = ${userId} AND is_archived = FALSE
        `;

        if (!wallet) {
          throw new Error("Wallet not found or archived");
        }
        
        // Validate transaction date is not before wallet creation date
        const transactionDate = new Date(date);
        transactionDate.setHours(0, 0, 0, 0);
        const walletCreated = new Date(wallet.created_at);
        walletCreated.setHours(0, 0, 0, 0);
        
        if (transactionDate < walletCreated) {
          const formattedDate = walletCreated.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
          throw new Error(`Transactions can't be dated before the wallet's starting balance (${formattedDate})`);
        }

        // Calculate actual amount based on type
        const actualAmount = oldTxn.type === 'expense' ? -amountValue : amountValue;

        // Calculate exchange rate info
        const exchangeInfo = await calculateBaseCurrencyAmount({
          amount: actualAmount,
          walletCurrency: wallet.currency,
          baseCurrency,
          transactionDate: date,
          manualRate: manualExchangeRate
        });

        // Check overdraft for cash wallets on expenses
        if (oldTxn.type === 'expense' && wallet.type === 'cash') {
          const balanceAfterReversal = wallet.current_balance - oldTxn.amount;
          const balanceAfterNewTxn = balanceAfterReversal + actualAmount;
          
          if (balanceAfterNewTxn < 0) {
            throw new Error("Insufficient balance. Cash wallets cannot be overdrawn.");
          }
        }

        // Reverse old balance change
        await sql`
          UPDATE wallets 
          SET current_balance = current_balance - ${oldTxn.amount}
          WHERE id = ${oldTxn.wallet_id} AND user_id = ${userId}
        `;

        // Update transaction
        const [updatedTxn] = await sql`
          UPDATE transactions 
          SET 
            wallet_id = ${walletId},
            amount = ${actualAmount},
            category_id = ${category},
            merchant = ${merchant || null},
            counterparty = ${counterparty || null},
            description = ${description || null},
            date = ${date},
            base_currency_amount = ${exchangeInfo.base_currency_amount},
            exchange_rate_date = ${exchangeInfo.exchange_rate_date},
            exchange_rate_used = ${exchangeInfo.exchange_rate_used},
            manual_exchange_rate = ${exchangeInfo.manual_exchange_rate},
            updated_at = NOW()
          WHERE id = ${id} AND user_id = ${userId}
          RETURNING *
        `;

        // Apply new balance change
        await sql`
          UPDATE wallets 
          SET current_balance = current_balance + ${actualAmount}
          WHERE id = ${walletId} AND user_id = ${userId}
        `;

        // Handle tags
        // Delete existing tag associations
        await sql`
          DELETE FROM transaction_tags 
          WHERE transaction_id = ${id}
        `;

        // Process tags
        const tagIds = [];

        // Add suggested tags
        for (const tagId of suggestedTags) {
          tagIds.push(tagId);
        }

        // Process custom tags
        for (const tag of customTags) {
          if (tag.isNew) {
            // Create new tag
            const [newTag] = await sql`
              INSERT INTO tags (name, user_id)
              VALUES (${tag.name}, ${userId})
              ON CONFLICT (name, user_id) DO UPDATE
              SET name = EXCLUDED.name
              RETURNING id
            `;
            tagIds.push(newTag.id);
          } else {
            tagIds.push(tag.id);
          }
        }

        // Insert tag associations
        if (tagIds.length > 0) {
          for (const tagId of tagIds) {
            await sql`
              INSERT INTO transaction_tags (transaction_id, tag_id)
              VALUES (${id}, ${tagId})
              ON CONFLICT (transaction_id, tag_id) DO NOTHING
            `;
          }
        }

        res.json({ 
          message: "Transaction updated successfully",
          transaction: updatedTxn
        });
      }
    });

  } catch (error) {
    console.error("Error updating transaction:", error);
    
    // Check if error is numeric overflow
    if (error.message && error.message.includes('numeric field overflow')) {
      // Get user's base currency for error message (user is fetched at start of route)
      const [user] = await sql`SELECT base_currency FROM users WHERE id = ${userId}`;
      const baseCurrency = user?.base_currency || 'USD';
      
      return res.status(400).json({ 
        error: `This transaction would exceed the maximum allowed wallet balance of ${formatMaxLiquidity(baseCurrency)}` 
      });
    }
    
    res.status(500).json({ 
      error: error.message || "Failed to update transaction" 
    });
  }
});

export default router;
