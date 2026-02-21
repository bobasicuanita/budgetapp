import sql from '../config/database.js';

const EXCHANGE_RATE_API_URL = 'https://api.exchangerate.host/timeframe';
const API_KEY = process.env.EXCHANGE_RATE_API_KEY;

/**
 * Fetches exchange rates from exchangerate.host API for a specific date
 * @param {string} date - Date in YYYY-MM-DD format
 * @returns {Promise<Object>} Exchange rates data
 */
export async function fetchExchangeRates(date) {
  const url = `${EXCHANGE_RATE_API_URL}?start_date=${date}&end_date=${date}&access_key=${API_KEY}`;
  
  try {
    const response = await fetch(url);
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(`API returned error: ${JSON.stringify(data)}`);
    }
    
    return data;
  } catch (error) {
    console.error('Error fetching exchange rates:', error);
    throw error;
  }
}

/**
 * Stores exchange rates in the database with UTC date
 * @param {string} date - Date in YYYY-MM-DD format (UTC)
 * @param {Object} quotes - Quotes object from API response (e.g., { "USDEUR": 0.84, ... })
 * @returns {Promise<number>} Number of rates stored
 */
export async function storeExchangeRates(date, quotes) {
  try {
    let storedCount = 0;
    
    // Check if rates already exist for this date (don't overwrite)
    const [existingRates] = await sql`
      SELECT COUNT(*) as count
      FROM exchange_rates
      WHERE date = ${date}::date
    `;
    
    if (existingRates && parseInt(existingRates.count) > 0) {
      console.log(`ℹ Rates for ${date} (UTC) already exist (${existingRates.count} currencies). Skipping.`);
      return 0;
    }
    
    // Extract currency codes and rates from quotes object
    for (const [key, rate] of Object.entries(quotes)) {
      // Key format is "USDXXX" where XXX is the target currency
      if (key.startsWith('USD')) {
        const currencyCode = key.substring(3); // Extract the target currency code
        
        // Insert the rate for this date and currency (no update, only insert)
        await sql`
          INSERT INTO exchange_rates (date, currency_code, rate)
          VALUES (${date}, ${currencyCode}, ${rate})
          ON CONFLICT (date, currency_code) DO NOTHING
        `;
        
        storedCount++;
      }
    }
    
    console.log(`✓ Stored ${storedCount} exchange rates for ${date} (UTC)`);
    return storedCount;
  } catch (error) {
    console.error('Error storing exchange rates:', error);
    throw error;
  }
}

/**
 * Fetches and stores today's exchange rates (using UTC date)
 * @returns {Promise<Object>} Result object with success status and details
 */
export async function fetchAndStoreTodayRates() {
  // Get today's date in UTC
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  const day = String(now.getUTCDate()).padStart(2, '0');
  const today = `${year}-${month}-${day}`; // Format: YYYY-MM-DD (UTC)
  
  console.log(`\n[Exchange Rates] Fetching rates for ${today} (UTC)...`);
  
  try {
    // Fetch rates from API
    const data = await fetchExchangeRates(today);
    
    // Extract quotes for the date
    const quotes = data.quotes[today];
    
    if (!quotes) {
      throw new Error(`No quotes found for date ${today}`);
    }
    
    // Store rates in database
    const storedCount = await storeExchangeRates(today, quotes);
    
    console.log(`[Exchange Rates] ✓ Successfully stored ${storedCount} rates for ${today}\n`);
    
    return {
      success: true,
      date: today,
      count: storedCount,
    };
  } catch (error) {
    console.error(`[Exchange Rates] ✗ Failed to fetch/store rates for ${today}:`, error.message);
    throw error;
  }
}

/**
 * Gets exchange rate for a specific currency and date
 * @param {string} currencyCode - 3-letter currency code
 * @param {string} date - Date in YYYY-MM-DD format (optional, defaults to today UTC)
 * @returns {Promise<number|null>} Exchange rate or null if not found
 */
export async function getExchangeRate(currencyCode, date = null) {
  try {
    // Get today's date in UTC
    let targetDate = date;
    if (!targetDate) {
      const now = new Date();
      const year = now.getUTCFullYear();
      const month = String(now.getUTCMonth() + 1).padStart(2, '0');
      const day = String(now.getUTCDate()).padStart(2, '0');
      targetDate = `${year}-${month}-${day}`;
    }
    
    const [result] = await sql`
      SELECT rate
      FROM exchange_rates
      WHERE currency_code = ${currencyCode}
        AND date = ${targetDate}::date
    `;
    
    return result?.rate || null;
  } catch (error) {
    console.error('Error getting exchange rate:', error);
    throw error;
  }
}

/**
 * Finds the most recent available exchange rate on or before a target date
 * NEVER uses future dates (no forecasting)
 * @param {string} currencyCode - 3-letter currency code
 * @param {string} targetDate - Target date in YYYY-MM-DD format (UTC)
 * @returns {Promise<Object|null>} Exchange rate info or null if not found
 */
export async function findClosestExchangeRate(currencyCode, targetDate) {
  try {
    // Look for rate on or before the target date (NEVER use future dates)
    const [rateResult] = await sql`
      SELECT rate, date, 
        (${targetDate}::date - date) as days_diff
      FROM exchange_rates
      WHERE currency_code = ${currencyCode}
        AND date <= ${targetDate}::date
      ORDER BY date DESC
      LIMIT 1
    `;
    
    if (!rateResult) {
      return null;
    }
    
    const daysDiff = parseInt(rateResult.days_diff);
    
    return {
      rate: parseFloat(rateResult.rate),
      date: rateResult.date.toISOString().split('T')[0],
      exactMatch: daysDiff === 0,
      daysDifference: daysDiff,
    };
  } catch (error) {
    console.error('Error finding closest exchange rate:', error);
    throw error;
  }
}

/**
 * Gets the most recent exchange rates available in the database
 * @returns {Promise<{date: string, count: number}|null>} Most recent date and count of rates
 */
export async function getMostRecentRatesDate() {
  try {
    const [result] = await sql`
      SELECT date, COUNT(*) as count
      FROM exchange_rates
      GROUP BY date
      ORDER BY date DESC
      LIMIT 1
    `;
    
    if (!result) return null;
    
    return {
      date: result.date.toISOString().split('T')[0],
      count: parseInt(result.count),
    };
  } catch (error) {
    console.error('Error getting most recent rates date:', error);
    throw error;
  }
}

/**
 * Copies exchange rates from a previous date to today (UTC)
 * Used as fallback when API fetch fails
 * Does not overwrite existing rates
 * @param {string} sourceDate - Date to copy rates from (YYYY-MM-DD UTC)
 * @param {string} targetDate - Date to copy rates to (YYYY-MM-DD UTC)
 * @returns {Promise<number>} Number of rates copied
 */
export async function copyExchangeRates(sourceDate, targetDate) {
  try {
    console.log(`[Exchange Rates] Copying rates from ${sourceDate} to ${targetDate} (UTC)...`);
    
    const result = await sql`
      INSERT INTO exchange_rates (date, currency_code, rate)
      SELECT ${targetDate}, currency_code, rate
      FROM exchange_rates
      WHERE date = ${sourceDate}
      ON CONFLICT (date, currency_code) DO NOTHING
    `;
    
    const copiedCount = result.count;
    console.log(`✓ Copied ${copiedCount} exchange rates from ${sourceDate} to ${targetDate} (UTC)`);
    
    return copiedCount;
  } catch (error) {
    console.error('Error copying exchange rates:', error);
    throw error;
  }
}
