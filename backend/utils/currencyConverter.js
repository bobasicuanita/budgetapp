import { findClosestExchangeRate } from '../services/exchangeRateService.js';

/**
 * Calculate base currency amount for a transaction
 * @param {Object} params
 * @param {number} params.amount - Transaction amount in wallet currency
 * @param {string} params.walletCurrency - Wallet currency code
 * @param {string} params.baseCurrency - User's base currency code
 * @param {string} params.transactionDate - Transaction date (YYYY-MM-DD)
 * @param {number|null} params.manualRate - Optional manual exchange rate
 * @returns {Promise<Object>} Exchange rate info and base currency amount
 */
export async function calculateBaseCurrencyAmount({
  amount,
  walletCurrency,
  baseCurrency,
  transactionDate,
  manualRate = null
}) {
  // If same currency, no conversion needed
  if (walletCurrency === baseCurrency) {
    return {
      base_currency_amount: amount,
      exchange_rate_date: null,
      exchange_rate_used: null,
      manual_exchange_rate: false
    };
  }

  let rateInfo;
  
  // Use manual rate if provided
  if (manualRate && manualRate > 0) {
    rateInfo = {
      rate: manualRate,
      date: transactionDate,
      exactMatch: false,
      daysDifference: 0,
      manual: true
    };
  } else {
    // Find most recent rate on or before transaction date
    rateInfo = await findClosestExchangeRate(walletCurrency, transactionDate);
    
    if (!rateInfo) {
      throw new Error(`No exchange rate found for ${walletCurrency} on or before ${transactionDate}. Please provide a manual exchange rate.`);
    }
    
    rateInfo.manual = false;
  }

  // Convert amount to base currency
  // IMPORTANT: All exchange rates are stored as "1 USD = X currency" (API format)
  // This is NOT an assumption about user's base currency - it's how exchangerate.host stores data
  // The USD checks below are required for correct conversion math
  
  // Rate format from DB: 1 USD = X currency
  // To convert from currency to USD: amount / rate
  // To convert from USD to currency: amount * rate
  
  let baseCurrencyAmount;
  
  if (baseCurrency === 'USD') {
    // Converting to USD (base is USD)
    baseCurrencyAmount = amount / rateInfo.rate;
  } else if (walletCurrency === 'USD') {
    // Converting from USD to non-USD base currency
    baseCurrencyAmount = amount * rateInfo.rate;
  } else {
    // Converting between two non-USD currencies via USD intermediary
    // Step 1: Convert transaction currency to USD
    const amountInUSD = amount / rateInfo.rate;
    
    // Step 2: Convert USD to base currency (on or before transaction date)
    const baseRateInfo = await findClosestExchangeRate(baseCurrency, transactionDate);
    if (!baseRateInfo) {
      throw new Error(`No exchange rate found for ${baseCurrency} on or before ${transactionDate}`);
    }
    
    // Step 3: Convert USD to base currency
    baseCurrencyAmount = amountInUSD * baseRateInfo.rate;
  }

  return {
    base_currency_amount: baseCurrencyAmount,
    exchange_rate_date: rateInfo.date,
    exchange_rate_used: rateInfo.rate,
    manual_exchange_rate: rateInfo.manual
  };
}

/**
 * Convert currency using stored exchange rate
 * Used for displaying amounts in base currency
 * @param {number} amount - Amount in source currency
 * @param {string} fromCurrency - Source currency code
 * @param {string} toCurrency - Target currency code
 * @param {number} rate - Exchange rate (1 USD = X fromCurrency)
 * @returns {number} Converted amount
 */
export function convertWithRate(amount, fromCurrency, toCurrency, rate) {
  if (fromCurrency === toCurrency) {
    return amount;
  }

  if (toCurrency === 'USD') {
    return amount / rate;
  }

  if (fromCurrency === 'USD') {
    return amount * rate;
  }

  // For non-USD pairs, this is simplified
  // In practice, we store base_currency_amount, so this shouldn't be needed
  return amount / rate;
}
