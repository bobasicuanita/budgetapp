import * as currencies from '@dinero.js/currencies';

/**
 * Maximum allowed integer digits for any amount (15 digits)
 * This matches NUMERIC(20, 6) in the database
 */
export const MAX_INTEGER_DIGITS = 15;

/**
 * Maximum allowed amount value (15 nines)
 */
export const MAX_AMOUNT_VALUE = 999999999999999;

/**
 * Get currency information from dinero.js
 * @param {string} currencyCode - ISO 4217 currency code
 * @returns {Object|null} Currency object with base and exponent
 */
export function getDineroCurrency(currencyCode) {
  try {
    const currency = currencies[currencyCode];
    return currency || null;
  } catch {
    return null;
  }
}

/**
 * Get the number of decimal places for a currency
 * @param {string} currencyCode - ISO 4217 currency code
 * @returns {number} Number of decimal places (0-4)
 */
export function getCurrencyDecimals(currencyCode) {
  const currency = getDineroCurrency(currencyCode);
  if (!currency) return 2; // Default to 2 decimals
  
  // The exponent tells us how many decimal places
  // exponent 0 = no decimals (JPY, KRW)
  // exponent 2 = 2 decimals (USD, EUR)
  // exponent 3 = 3 decimals (BHD, KWD)
  return currency.exponent;
}

/**
 * Check if a currency supports decimal amounts
 * @param {string} currencyCode - ISO 4217 currency code
 * @returns {boolean} True if currency supports decimals
 */
export function currencySupportsDecimals(currencyCode) {
  return getCurrencyDecimals(currencyCode) > 0;
}

/**
 * Get maximum allowed amount for a currency (formatted as string with separators)
 * @param {string} currencyCode - ISO 4217 currency code
 * @returns {string} Formatted maximum amount
 */
export function getMaxAmountDisplay(currencyCode) {
  const decimals = getCurrencyDecimals(currencyCode);
  
  if (decimals === 0) {
    // No decimals: 999,999,999,999,999
    return new Intl.NumberFormat('en-US', {
      maximumFractionDigits: 0,
      minimumFractionDigits: 0,
    }).format(MAX_AMOUNT_VALUE);
  } else {
    // With decimals: 9,999,999,999,999.99 (or .999, .9999, etc.)
    // Format integer part with thousands separators
    const formattedInteger = new Intl.NumberFormat('en-US').format(MAX_AMOUNT_VALUE);
    const decimalPart = '9'.repeat(decimals);
    
    // Manually construct to avoid floating point precision issues
    return `${formattedInteger}.${decimalPart}`;
  }
}

/**
 * Validate amount against currency rules
 * @param {string} amountStr - Amount as string from input
 * @param {string} currencyCode - ISO 4217 currency code
 * @returns {Object} { valid: boolean, error: string|null }
 */
export function validateCurrencyAmount(amountStr, currencyCode) {
  if (!amountStr || amountStr.trim() === '') {
    return { valid: false, error: 'Amount is required.' };
  }
  
  const amount = parseFloat(amountStr);
  
  if (isNaN(amount)) {
    return { valid: false, error: 'Invalid amount.' };
  }
  
  if (amount <= 0) {
    return { valid: false, error: 'Amount must be greater than 0.' };
  }
  
  // Check decimal places first
  const decimals = getCurrencyDecimals(currencyCode);
  const parts = amountStr.split('.');
  
  if (decimals === 0 && parts.length > 1 && parts[1] !== '' && parseInt(parts[1]) !== 0) {
    // Currency doesn't support decimals but user entered decimal amount
    return { 
      valid: false, 
      error: `${currencyCode} does not support decimal amounts.` 
    };
  }
  
  if (parts.length > 1 && parts[1].length > decimals) {
    // Too many decimal places
    return { 
      valid: false, 
      error: `${currencyCode} supports up to ${decimals} decimal place${decimals === 1 ? '' : 's'}.` 
    };
  }
  
  // Check if amount exceeds maximum (after decimal validation)
  if (exceedsMaxAmount(amountStr, currencyCode)) {
    return { 
      valid: false, 
      error: `The maximum allowed amount for ${currencyCode} is ${getMaxAmountDisplay(currencyCode)}.` 
    };
  }
  
  return { valid: true, error: null };
}

/**
 * Get the maximum allowed value for a currency (as a number)
 * @param {string} currencyCode - ISO 4217 currency code
 * @returns {string} Maximum amount as string to preserve precision
 */
export function getMaxAmountString(currencyCode) {
  const decimals = getCurrencyDecimals(currencyCode);
  
  if (decimals === 0) {
    return '999999999999999'; // No decimals
  } else {
    const decimalPart = '9'.repeat(decimals);
    return `999999999999999.${decimalPart}`; // With decimals
  }
}

/**
 * Check if amount exceeds maximum for a given currency
 * @param {string|number} amountValue - Amount value (can be string or number)
 * @param {string} currencyCode - ISO 4217 currency code
 * @returns {boolean} True if amount exceeds maximum
 */
export function exceedsMaxAmount(amountValue, currencyCode) {
  if (!amountValue || !currencyCode) return false;
  
  // Convert to string and remove commas
  const amountStr = amountValue.toString().replace(/,/g, '');
  
  // Split by decimal point
  const parts = amountStr.split('.');
  const integerPartStr = parts[0];
  const decimalPartStr = parts[1] || '';
  
  const decimals = getCurrencyDecimals(currencyCode);
  const maxIntegerStr = '999999999999999'; // 15 nines
  
  // Check if integer part has more than 15 digits
  if (integerPartStr.length > MAX_INTEGER_DIGITS) {
    return true;
  }
  
  // If integer part is less than 15 digits, it's definitely OK
  if (integerPartStr.length < MAX_INTEGER_DIGITS) {
    return false;
  }
  
  // Integer part is exactly 15 digits
  // Compare as strings
  if (integerPartStr > maxIntegerStr) {
    return true; // e.g., "999999999999999" > "999999999999999" (impossible) or something higher
  }
  
  if (integerPartStr < maxIntegerStr) {
    return false; // Less than max
  }
  
  // Integer part is EXACTLY "999999999999999"
  // Now check decimals
  if (decimals === 0) {
    // No decimals allowed, and we have exactly 999999999999999
    // Any decimal part makes it invalid
    return decimalPartStr.length > 0 && parseInt(decimalPartStr) > 0;
  }
  
  // Currency supports decimals
  // Max decimal part is all 9s (e.g., "99" for 2 decimals, "999" for 3)
  const maxDecimalStr = '9'.repeat(decimals);
  
  // Pad decimal part with zeros if needed for comparison
  const paddedDecimalStr = decimalPartStr.padEnd(decimals, '0').substring(0, decimals);
  
  // Compare decimal parts as strings
  return paddedDecimalStr > maxDecimalStr;
}

/**
 * Get info message about currency decimal support
 * @param {string} currencyCode - ISO 4217 currency code
 * @returns {string|null} Info message or null
 */
export function getCurrencyDecimalInfo(currencyCode) {
  const decimals = getCurrencyDecimals(currencyCode);
  
  if (decimals === 0) {
    return `${currencyCode} does not support decimal amounts.`;
  }
  
  return null;
}
