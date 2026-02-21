import express from "express";
import { authenticateToken } from "../middleware/auth.js";
import { findClosestExchangeRate } from "../services/exchangeRateService.js";
import sql from "../config/database.js";

const router = express.Router();

/**
 * GET /api/exchange-rates/availability
 * Check if exchange rate is available for a specific date and currency
 * Only uses rates on or before the transaction date (no future rates)
 * Query params: date (YYYY-MM-DD), currency (3-letter code)
 */
router.get("/availability", authenticateToken, async (req, res) => {
  const { date, currency } = req.query;
  const userId = req.user.userId;

  try {
    // Validate inputs
    if (!date || !currency) {
      return res.status(400).json({ 
        error: "Missing required parameters: date and currency" 
      });
    }

    // Validate date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
      return res.status(400).json({ 
        error: "Invalid date format. Expected YYYY-MM-DD" 
      });
    }

    // Get user's base currency
    const [user] = await sql`
      SELECT base_currency 
      FROM users 
      WHERE id = ${userId}
    `;

    const baseCurrency = user?.base_currency || 'USD';

    // If transaction currency is same as base currency, no conversion needed
    if (currency === baseCurrency) {
      return res.json({
        available: true,
        exactMatch: true,
        requiresManualInput: false,
        rate: 1,
        date: date,
        rateDate: date,
        daysDifference: 0,
        severity: 'none',
        rateDisplay: null // No need to show rate for same currency
      });
    }

    // Handle when transaction currency is USD but base currency is not
    if (currency === 'USD') {
      // Need to get base currency rate to show conversion
      const baseRateInfo = await findClosestExchangeRate(baseCurrency, date);
      
      if (!baseRateInfo) {
        return res.json({
          available: false,
          exactMatch: false,
          requiresManualInput: true,
          rate: null,
          rateDate: null,
          daysDifference: null,
          severity: 'critical',
          rateDisplay: null
        });
      }
      
      // Determine severity for base currency rate
      let severity = 'none';
      if (baseRateInfo.daysDifference === 0) {
        severity = 'none';
      } else if (baseRateInfo.daysDifference <= 3) {
        severity = 'info';
      } else if (baseRateInfo.daysDifference <= 14) {
        severity = 'recent';
      } else if (baseRateInfo.daysDifference <= 30) {
        severity = 'outdated';
      } else {
        severity = 'old';
      }
      
      return res.json({
        available: true,
        exactMatch: baseRateInfo.exactMatch,
        requiresManualInput: false,
        rate: baseRateInfo.rate,
        date: date,
        rateDate: baseRateInfo.date,
        daysDifference: baseRateInfo.daysDifference,
        severity,
        rateDisplay: {
          from: 'USD',
          to: baseCurrency,
          value: baseRateInfo.rate
        }
      });
    }

    // Find most recent rate on or before transaction date for non-USD currencies
    const rateInfo = await findClosestExchangeRate(currency, date);

    if (!rateInfo) {
      // No rate found before this date
      return res.json({
        available: false,
        exactMatch: false,
        requiresManualInput: true,
        rate: null,
        rateDate: null,
        daysDifference: null,
        severity: 'critical',
        rateDisplay: null
      });
    }

    // Determine severity based on days difference
    let severity = 'none';
    if (rateInfo.daysDifference === 0) {
      severity = 'none';
    } else if (rateInfo.daysDifference <= 3) {
      severity = 'info'; // Blue banner, 0-3 days old
    } else if (rateInfo.daysDifference <= 14) {
      severity = 'recent'; // Blue banner, 4-14 days old
    } else if (rateInfo.daysDifference <= 30) {
      severity = 'outdated'; // Orange banner, 15-30 days old
    } else {
      severity = 'old'; // Red banner, 31+ days old
    }

    // Prepare rate display information
    // All rates stored as "1 USD = X currency" in database
    // For income/expense: Show "1 [transactionCurrency] = X [baseCurrency]"
    // User wants to see their input currency (EUR) converting to their base (CAD)
    let rateDisplay = {
      from: null,
      to: null,
      value: null
    };

    if (baseCurrency === 'USD') {
      // Base is USD, transaction in other currency: show "1 [currency] = X USD"
      // Invert the rate (if DB has 0.84, show 1/0.84 = 1.19)
      rateDisplay = {
        from: currency,
        to: 'USD',
        value: 1 / rateInfo.rate
      };
    } else if (currency === 'USD') {
      // Transaction in USD, base is other currency: show "1 USD = X [baseCurrency]"
      const baseRateInfo = await findClosestExchangeRate(baseCurrency, date);
      if (baseRateInfo) {
        rateDisplay = {
          from: 'USD',
          to: baseCurrency,
          value: baseRateInfo.rate
        };
      }
    } else {
      // Both non-USD (e.g., CAD base, EUR transaction)
      // User wants: "1 EUR = ? CAD"
      // DB has: 1 USD = 0.62 EUR and 1 USD = 1.35 CAD
      // Calculate: 1 EUR = (1.35 / 0.62) CAD = 2.18 CAD
      const baseRateInfo = await findClosestExchangeRate(baseCurrency, date);
      if (baseRateInfo) {
        // Show: 1 transactionCurrency = X baseCurrency
        const effectiveRate = baseRateInfo.rate / rateInfo.rate;
        rateDisplay = {
          from: currency,
          to: baseCurrency,
          value: effectiveRate
        };
      } else {
        // Fallback: show USD intermediary
        rateDisplay = {
          from: 'USD',
          to: currency,
          value: rateInfo.rate,
          note: `Conversion via USD`
        };
      }
    }

    // Rate found
    res.json({
      available: true,
      exactMatch: rateInfo.exactMatch,
      requiresManualInput: false,
      rate: rateInfo.rate,
      date: date, // Transaction date
      rateDate: rateInfo.date, // Actual rate date
      daysDifference: rateInfo.daysDifference,
      severity,
      rateDisplay
    });

  } catch (error) {
    console.error("Error checking exchange rate availability:", error);
    res.status(500).json({ error: "Failed to check exchange rate availability" });
  }
});

export default router;
