// Wallet type constants used across the application
// Wallets are for currency-based accounts only

export const WALLET_TYPES = [
  { value: 'cash', label: '💵 Cash' },
  { value: 'bank', label: '🏦 Bank Account' },
  { value: 'digital_wallet', label: '📱 Digital Wallet' }
];

// Helper function to get wallet type by value
export const getWalletTypeByValue = (value) => {
  return WALLET_TYPES.find(type => type.value === value);
};

// Helper function to get wallet type label
export const getWalletTypeLabel = (value) => {
  const walletType = getWalletTypeByValue(value);
  return walletType ? walletType.label : value;
};
