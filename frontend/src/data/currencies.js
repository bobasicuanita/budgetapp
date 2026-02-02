// Static currency data (ISO 4217)

export const POPULAR_CURRENCIES = [
  { code: 'USD', name: 'US Dollar', symbol: '$', flag: '🇺🇸' },
  { code: 'EUR', name: 'Euro', symbol: '€', flag: '🇪🇺' },
  { code: 'GBP', name: 'British Pound', symbol: '£', flag: '🇬🇧' },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥', flag: '🇯🇵' },
  { code: 'CHF', name: 'Swiss Franc', symbol: 'CHF', flag: '🇨🇭' },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$', flag: '🇨🇦' },
  { code: 'AUD', name: 'Australian Dollar', symbol: 'A$', flag: '🇦🇺' },
  { code: 'CNY', name: 'Chinese Yuan', symbol: '¥', flag: '🇨🇳' },
  { code: 'INR', name: 'Indian Rupee', symbol: '₹', flag: '🇮🇳' },
  { code: 'BRL', name: 'Brazilian Real', symbol: 'R$', flag: '🇧🇷' },
];

export const ALL_CURRENCIES = [
  // Major World Currencies
  { code: 'USD', name: 'US Dollar', symbol: '$', flag: '🇺🇸', region: 'North America' },
  { code: 'EUR', name: 'Euro', symbol: '€', flag: '🇪🇺', region: 'Europe' },
  { code: 'GBP', name: 'British Pound', symbol: '£', flag: '🇬🇧', region: 'Europe' },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥', flag: '🇯🇵', region: 'Asia' },
  { code: 'CHF', name: 'Swiss Franc', symbol: 'CHF', flag: '🇨🇭', region: 'Europe' },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$', flag: '🇨🇦', region: 'North America' },
  { code: 'AUD', name: 'Australian Dollar', symbol: 'A$', flag: '🇦🇺', region: 'Oceania' },
  { code: 'NZD', name: 'New Zealand Dollar', symbol: 'NZ$', flag: '🇳🇿', region: 'Oceania' },
  
  // Asian Currencies
  { code: 'CNY', name: 'Chinese Yuan', symbol: '¥', flag: '🇨🇳', region: 'Asia' },
  { code: 'HKD', name: 'Hong Kong Dollar', symbol: 'HK$', flag: '🇭🇰', region: 'Asia' },
  { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$', flag: '🇸🇬', region: 'Asia' },
  { code: 'INR', name: 'Indian Rupee', symbol: '₹', flag: '🇮🇳', region: 'Asia' },
  { code: 'KRW', name: 'South Korean Won', symbol: '₩', flag: '🇰🇷', region: 'Asia' },
  { code: 'THB', name: 'Thai Baht', symbol: '฿', flag: '🇹🇭', region: 'Asia' },
  { code: 'MYR', name: 'Malaysian Ringgit', symbol: 'RM', flag: '🇲🇾', region: 'Asia' },
  { code: 'PHP', name: 'Philippine Peso', symbol: '₱', flag: '🇵🇭', region: 'Asia' },
  { code: 'IDR', name: 'Indonesian Rupiah', symbol: 'Rp', flag: '🇮🇩', region: 'Asia' },
  { code: 'VND', name: 'Vietnamese Dong', symbol: '₫', flag: '🇻🇳', region: 'Asia' },
  { code: 'PKR', name: 'Pakistani Rupee', symbol: '₨', flag: '🇵🇰', region: 'Asia' },
  { code: 'BDT', name: 'Bangladeshi Taka', symbol: '৳', flag: '🇧🇩', region: 'Asia' },
  
  // Middle East
  { code: 'AED', name: 'UAE Dirham', symbol: 'د.إ', flag: '🇦🇪', region: 'Middle East' },
  { code: 'SAR', name: 'Saudi Riyal', symbol: '﷼', flag: '🇸🇦', region: 'Middle East' },
  { code: 'ILS', name: 'Israeli Shekel', symbol: '₪', flag: '🇮🇱', region: 'Middle East' },
  { code: 'TRY', name: 'Turkish Lira', symbol: '₺', flag: '🇹🇷', region: 'Middle East' },
  { code: 'QAR', name: 'Qatari Riyal', symbol: 'ر.ق', flag: '🇶🇦', region: 'Middle East' },
  { code: 'KWD', name: 'Kuwaiti Dinar', symbol: 'د.ك', flag: '🇰🇼', region: 'Middle East' },
  
  // European Currencies (Non-Euro)
  { code: 'NOK', name: 'Norwegian Krone', symbol: 'kr', flag: '🇳🇴', region: 'Europe' },
  { code: 'SEK', name: 'Swedish Krona', symbol: 'kr', flag: '🇸🇪', region: 'Europe' },
  { code: 'DKK', name: 'Danish Krone', symbol: 'kr', flag: '🇩🇰', region: 'Europe' },
  { code: 'PLN', name: 'Polish Zloty', symbol: 'zł', flag: '🇵🇱', region: 'Europe' },
  { code: 'CZK', name: 'Czech Koruna', symbol: 'Kč', flag: '🇨🇿', region: 'Europe' },
  { code: 'HUF', name: 'Hungarian Forint', symbol: 'Ft', flag: '🇭🇺', region: 'Europe' },
  { code: 'RON', name: 'Romanian Leu', symbol: 'lei', flag: '🇷🇴', region: 'Europe' },
  { code: 'RUB', name: 'Russian Ruble', symbol: '₽', flag: '🇷🇺', region: 'Europe' },
  { code: 'UAH', name: 'Ukrainian Hryvnia', symbol: '₴', flag: '🇺🇦', region: 'Europe' },
  
  // Americas
  { code: 'BRL', name: 'Brazilian Real', symbol: 'R$', flag: '🇧🇷', region: 'South America' },
  { code: 'MXN', name: 'Mexican Peso', symbol: '$', flag: '🇲🇽', region: 'North America' },
  { code: 'ARS', name: 'Argentine Peso', symbol: '$', flag: '🇦🇷', region: 'South America' },
  { code: 'CLP', name: 'Chilean Peso', symbol: '$', flag: '🇨🇱', region: 'South America' },
  { code: 'COP', name: 'Colombian Peso', symbol: '$', flag: '🇨🇴', region: 'South America' },
  { code: 'PEN', name: 'Peruvian Sol', symbol: 'S/', flag: '🇵🇪', region: 'South America' },
  
  // Africa
  { code: 'ZAR', name: 'South African Rand', symbol: 'R', flag: '🇿🇦', region: 'Africa' },
  { code: 'EGP', name: 'Egyptian Pound', symbol: 'E£', flag: '🇪🇬', region: 'Africa' },
  { code: 'NGN', name: 'Nigerian Naira', symbol: '₦', flag: '🇳🇬', region: 'Africa' },
  { code: 'KES', name: 'Kenyan Shilling', symbol: 'KSh', flag: '🇰🇪', region: 'Africa' },
  { code: 'MAD', name: 'Moroccan Dirham', symbol: 'د.م.', flag: '🇲🇦', region: 'Africa' },
  { code: 'GHS', name: 'Ghanaian Cedi', symbol: '₵', flag: '🇬🇭', region: 'Africa' },
];

// Helper function to get currency by code
export const getCurrencyByCode = (code) => {
  return ALL_CURRENCIES.find(c => c.code === code);
};

// Helper function to format currency amount
export const formatCurrency = (amount, currencyCode) => {
  const currency = getCurrencyByCode(currencyCode);
  if (!currency) return `${amount}`;
  
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch (error) {
    // Fallback if currency code is invalid
    return `${currency.symbol} ${Number(amount).toFixed(2)}`;
  }
};
