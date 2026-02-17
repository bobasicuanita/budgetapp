/**
 * Amount validation utilities for preventing numeric overflow
 * Maximum allowed value in database: 9,999,999,999,999 (9.999 trillion)
 */

export const MAX_AMOUNT = 9999999999999;
export const MAX_AMOUNT_LENGTH = 13; // Maximum digits allowed

/**
 * Format the maximum amount with thousand separators for display
 */
export const formatMaxAmount = (amount) => {
  return amount.toLocaleString('en-US');
};

/**
 * Calculate maximum allowed transaction amount for a wallet
 * @param {number} currentBalance - Current wallet balance
 * @param {string} transactionType - 'income' or 'expense' or 'transfer'
 * @returns {number} - Maximum allowed amount
 */
export const calculateMaxAllowedAmount = (currentBalance, transactionType) => {
  if (transactionType === 'income' || transactionType === 'transfer-in') {
    // For income, max is the remaining space to MAX_AMOUNT
    return MAX_AMOUNT - currentBalance;
  } else if (transactionType === 'expense' || transactionType === 'transfer-out') {
    // For expense, max is the current balance (can't spend more than you have for cash wallets)
    // But we also need to prevent the wallet from going below -MAX_AMOUNT
    return Math.min(currentBalance + MAX_AMOUNT, MAX_AMOUNT);
  }
  return MAX_AMOUNT;
};

/**
 * Validate if an amount would cause overflow
 * @param {number} amount - Amount to validate
 * @param {number} currentBalance - Current wallet balance
 * @param {string} transactionType - 'income' or 'expense' or 'transfer'
 * @returns {boolean} - True if valid, false if would cause overflow
 */
export const validateAmountOverflow = (amount, currentBalance, transactionType) => {
  const newBalance = transactionType === 'income' || transactionType === 'transfer-in'
    ? currentBalance + amount
    : currentBalance - amount;
  
  return Math.abs(newBalance) <= MAX_AMOUNT;
};
