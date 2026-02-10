// Static currency data (ISO 4217) organized by continent

export const ALL_CURRENCIES = [
  // North America
  { code: 'USD', name: 'US Dollar', symbol: '$', countryCode: 'US', continent: 'North America' },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$', countryCode: 'CA', continent: 'North America' },
  { code: 'MXN', name: 'Mexican Peso', symbol: '$', countryCode: 'MX', continent: 'North America' },
  { code: 'BZD', name: 'Belize Dollar', symbol: 'BZ$', countryCode: 'BZ', continent: 'North America' },
  { code: 'CRC', name: 'Costa Rican Colón', symbol: '₡', countryCode: 'CR', continent: 'North America' },
  { code: 'DOP', name: 'Dominican Peso', symbol: 'RD$', countryCode: 'DO', continent: 'North America' },
  { code: 'GTQ', name: 'Guatemalan Quetzal', symbol: 'Q', countryCode: 'GT', continent: 'North America' },
  { code: 'HNL', name: 'Honduran Lempira', symbol: 'L', countryCode: 'HN', continent: 'North America' },
  { code: 'JMD', name: 'Jamaican Dollar', symbol: 'J$', countryCode: 'JM', continent: 'North America' },
  { code: 'NIO', name: 'Nicaraguan Córdoba', symbol: 'C$', countryCode: 'NI', continent: 'North America' },
  { code: 'PAB', name: 'Panamanian Balboa', symbol: 'B/.', countryCode: 'PA', continent: 'North America' },
  { code: 'TTD', name: 'Trinidad and Tobago Dollar', symbol: 'TT$', countryCode: 'TT', continent: 'North America' },
  
  // Europe
  { code: 'EUR', name: 'Euro', symbol: '€', countryCode: 'EU', continent: 'Europe' },
  { code: 'GBP', name: 'British Pound Sterling', symbol: '£', countryCode: 'GB', continent: 'Europe' },
  { code: 'CHF', name: 'Swiss Franc', symbol: 'CHF', countryCode: 'CH', continent: 'Europe' },
  { code: 'NOK', name: 'Norwegian Krone', symbol: 'kr', countryCode: 'NO', continent: 'Europe' },
  { code: 'SEK', name: 'Swedish Krona', symbol: 'kr', countryCode: 'SE', continent: 'Europe' },
  { code: 'DKK', name: 'Danish Krone', symbol: 'kr', countryCode: 'DK', continent: 'Europe' },
  { code: 'PLN', name: 'Polish Zloty', symbol: 'zł', countryCode: 'PL', continent: 'Europe' },
  { code: 'CZK', name: 'Czech Republic Koruna', symbol: 'Kč', countryCode: 'CZ', continent: 'Europe' },
  { code: 'HUF', name: 'Hungarian Forint', symbol: 'Ft', countryCode: 'HU', continent: 'Europe' },
  { code: 'RON', name: 'Romanian Leu', symbol: 'lei', countryCode: 'RO', continent: 'Europe' },
  { code: 'RUB', name: 'Russian Ruble', symbol: '₽', countryCode: 'RU', continent: 'Europe' },
  { code: 'UAH', name: 'Ukrainian Hryvnia', symbol: '₴', countryCode: 'UA', continent: 'Europe' },
  { code: 'TRY', name: 'Turkish Lira', symbol: '₺', countryCode: 'TR', continent: 'Europe' },
  { code: 'BGN', name: 'Bulgarian Lev', symbol: 'лв.', countryCode: 'BG', continent: 'Europe' },
  { code: 'HRK', name: 'Croatian Kuna', symbol: 'kn', countryCode: 'HR', continent: 'Europe' },
  { code: 'ISK', name: 'Icelandic Króna', symbol: 'kr', countryCode: 'IS', continent: 'Europe' },
  { code: 'BAM', name: 'Bosnia-Herzegovina Convertible Mark', symbol: 'KM', countryCode: 'BA', continent: 'Europe' },
  { code: 'ALL', name: 'Albanian Lek', symbol: 'Lek', countryCode: 'AL', continent: 'Europe' },
  { code: 'AMD', name: 'Armenian Dram', symbol: 'դր.', countryCode: 'AM', continent: 'Europe' },
  { code: 'AZN', name: 'Azerbaijani Manat', symbol: 'ман.', countryCode: 'AZ', continent: 'Europe' },
  { code: 'BYN', name: 'Belarusian Ruble', symbol: 'руб.', countryCode: 'BY', continent: 'Europe' },
  { code: 'GEL', name: 'Georgian Lari', symbol: '₾', countryCode: 'GE', continent: 'Europe' },
  { code: 'MDL', name: 'Moldovan Leu', symbol: 'lei', countryCode: 'MD', continent: 'Europe' },
  { code: 'MKD', name: 'Macedonian Denar', symbol: 'ден', countryCode: 'MK', continent: 'Europe' },
  { code: 'RSD', name: 'Serbian Dinar', symbol: 'дин.', countryCode: 'RS', continent: 'Europe' },
  
  // Asia
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥', countryCode: 'JP', continent: 'Asia' },
  { code: 'CNY', name: 'Chinese Yuan', symbol: '¥', countryCode: 'CN', continent: 'Asia' },
  { code: 'HKD', name: 'Hong Kong Dollar', symbol: 'HK$', countryCode: 'HK', continent: 'Asia' },
  { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$', countryCode: 'SG', continent: 'Asia' },
  { code: 'INR', name: 'Indian Rupee', symbol: '₹', countryCode: 'IN', continent: 'Asia' },
  { code: 'KRW', name: 'South Korean Won', symbol: '₩', countryCode: 'KR', continent: 'Asia' },
  { code: 'THB', name: 'Thai Baht', symbol: '฿', countryCode: 'TH', continent: 'Asia' },
  { code: 'MYR', name: 'Malaysian Ringgit', symbol: 'RM', countryCode: 'MY', continent: 'Asia' },
  { code: 'PHP', name: 'Philippine Peso', symbol: '₱', countryCode: 'PH', continent: 'Asia' },
  { code: 'IDR', name: 'Indonesian Rupiah', symbol: 'Rp', countryCode: 'ID', continent: 'Asia' },
  { code: 'VND', name: 'Vietnamese Dong', symbol: '₫', countryCode: 'VN', continent: 'Asia' },
  { code: 'PKR', name: 'Pakistani Rupee', symbol: '₨', countryCode: 'PK', continent: 'Asia' },
  { code: 'BDT', name: 'Bangladeshi Taka', symbol: '৳', countryCode: 'BD', continent: 'Asia' },
  { code: 'AED', name: 'United Arab Emirates Dirham', symbol: 'د.إ', countryCode: 'AE', continent: 'Asia' },
  { code: 'SAR', name: 'Saudi Riyal', symbol: 'ر.س', countryCode: 'SA', continent: 'Asia' },
  { code: 'ILS', name: 'Israeli New Sheqel', symbol: '₪', countryCode: 'IL', continent: 'Asia' },
  { code: 'QAR', name: 'Qatari Rial', symbol: 'ر.ق', countryCode: 'QA', continent: 'Asia' },
  { code: 'KWD', name: 'Kuwaiti Dinar', symbol: 'د.ك', countryCode: 'KW', continent: 'Asia' },
  { code: 'BHD', name: 'Bahraini Dinar', symbol: 'د.ب', countryCode: 'BH', continent: 'Asia' },
  { code: 'IQD', name: 'Iraqi Dinar', symbol: 'د.ع', countryCode: 'IQ', continent: 'Asia' },
  { code: 'IRR', name: 'Iranian Rial', symbol: '﷼', countryCode: 'IR', continent: 'Asia' },
  { code: 'JOD', name: 'Jordanian Dinar', symbol: 'د.أ', countryCode: 'JO', continent: 'Asia' },
  { code: 'KHR', name: 'Cambodian Riel', symbol: '៛', countryCode: 'KH', continent: 'Asia' },
  { code: 'KZT', name: 'Kazakhstani Tenge', symbol: '₸', countryCode: 'KZ', continent: 'Asia' },
  { code: 'LBP', name: 'Lebanese Pound', symbol: 'ل.ل', countryCode: 'LB', continent: 'Asia' },
  { code: 'LKR', name: 'Sri Lankan Rupee', symbol: 'රු', countryCode: 'LK', continent: 'Asia' },
  { code: 'MMK', name: 'Myanma Kyat', symbol: 'K', countryCode: 'MM', continent: 'Asia' },
  { code: 'MOP', name: 'Macanese Pataca', symbol: 'MOP$', countryCode: 'MO', continent: 'Asia' },
  { code: 'NPR', name: 'Nepalese Rupee', symbol: 'रू', countryCode: 'NP', continent: 'Asia' },
  { code: 'OMR', name: 'Omani Rial', symbol: 'ر.ع', countryCode: 'OM', continent: 'Asia' },
  { code: 'SYP', name: 'Syrian Pound', symbol: 'ل.س', countryCode: 'SY', continent: 'Asia' },
  { code: 'TWD', name: 'New Taiwan Dollar', symbol: 'NT$', countryCode: 'TW', continent: 'Asia' },
  { code: 'UZS', name: 'Uzbekistan Som', symbol: 'soʻm', countryCode: 'UZ', continent: 'Asia' },
  { code: 'YER', name: 'Yemeni Rial', symbol: 'ر.ي', countryCode: 'YE', continent: 'Asia' },
  { code: 'BND', name: 'Brunei Dollar', symbol: 'B$', countryCode: 'BN', continent: 'Asia' },
  { code: 'AFN', name: 'Afghan Afghani', symbol: '؋', countryCode: 'AF', continent: 'Asia' },

  // South America
  { code: 'BRL', name: 'Brazilian Real', symbol: 'R$', countryCode: 'BR', continent: 'South America' },
  { code: 'ARS', name: 'Argentine Peso', symbol: '$', countryCode: 'AR', continent: 'South America' },
  { code: 'CLP', name: 'Chilean Peso', symbol: '$', countryCode: 'CL', continent: 'South America' },
  { code: 'COP', name: 'Colombian Peso', symbol: '$', countryCode: 'CO', continent: 'South America' },
  { code: 'PEN', name: 'Peruvian Nuevo Sol', symbol: 'S/.', countryCode: 'PE', continent: 'South America' },
  { code: 'BOB', name: 'Bolivian Boliviano', symbol: 'Bs', countryCode: 'BO', continent: 'South America' },
  { code: 'PYG', name: 'Paraguayan Guarani', symbol: '₲', countryCode: 'PY', continent: 'South America' },
  { code: 'UYU', name: 'Uruguayan Peso', symbol: '$U', countryCode: 'UY', continent: 'South America' },
  { code: 'VEF', name: 'Venezuelan Bolívar', symbol: 'Bs.F.', countryCode: 'VE', continent: 'South America' },
  
  // Oceania
  { code: 'AUD', name: 'Australian Dollar', symbol: 'A$', countryCode: 'AU', continent: 'Oceania' },
  { code: 'NZD', name: 'New Zealand Dollar', symbol: 'NZ$', countryCode: 'NZ', continent: 'Oceania' },
  { code: 'TOP', name: 'Tongan Paʻanga', symbol: 'T$', countryCode: 'TO', continent: 'Oceania' },
  
  // Africa
  { code: 'ZAR', name: 'South African Rand', symbol: 'R', countryCode: 'ZA', continent: 'Africa' },
  { code: 'EGP', name: 'Egyptian Pound', symbol: 'E£', countryCode: 'EG', continent: 'Africa' },
  { code: 'NGN', name: 'Nigerian Naira', symbol: '₦', countryCode: 'NG', continent: 'Africa' },
  { code: 'KES', name: 'Kenyan Shilling', symbol: 'Ksh', countryCode: 'KE', continent: 'Africa' },
  { code: 'MAD', name: 'Moroccan Dirham', symbol: 'د.م.', countryCode: 'MA', continent: 'Africa' },
  { code: 'GHS', name: 'Ghanaian Cedi', symbol: 'GH₵', countryCode: 'GH', continent: 'Africa' },
  { code: 'DZD', name: 'Algerian Dinar', symbol: 'د.ج', countryCode: 'DZ', continent: 'Africa' },
  { code: 'ETB', name: 'Ethiopian Birr', symbol: 'Br', countryCode: 'ET', continent: 'Africa' },
  { code: 'GNF', name: 'Guinean Franc', symbol: 'FG', countryCode: 'GN', continent: 'Africa' },
  { code: 'MGA', name: 'Malagasy Ariary', symbol: 'Ar', countryCode: 'MG', continent: 'Africa' },
  { code: 'MUR', name: 'Mauritian Rupee', symbol: '₨', countryCode: 'MU', continent: 'Africa' },
  { code: 'MZN', name: 'Mozambican Metical', symbol: 'MT', countryCode: 'MZ', continent: 'Africa' },
  { code: 'NAD', name: 'Namibian Dollar', symbol: 'N$', countryCode: 'NA', continent: 'Africa' },
  { code: 'RWF', name: 'Rwandan Franc', symbol: 'RF', countryCode: 'RW', continent: 'Africa' },
  { code: 'SDG', name: 'Sudanese Pound', symbol: 'ج.س.', countryCode: 'SD', continent: 'Africa' },
  { code: 'SOS', name: 'Somali Shilling', symbol: 'Ssh', countryCode: 'SO', continent: 'Africa' },
  { code: 'TND', name: 'Tunisian Dinar', symbol: 'د.ت', countryCode: 'TN', continent: 'Africa' },
  { code: 'TZS', name: 'Tanzanian Shilling', symbol: 'TSh', countryCode: 'TZ', continent: 'Africa' },
  { code: 'UGX', name: 'Ugandan Shilling', symbol: 'USh', countryCode: 'UG', continent: 'Africa' },
  { code: 'XAF', name: 'CFA Franc BEAC', symbol: 'FCFA', countryCode: 'CM', continent: 'Africa' },
  { code: 'XOF', name: 'CFA Franc BCEAO', symbol: 'CFA', countryCode: 'BF', continent: 'Africa' },
  { code: 'ZMK', name: 'Zambian Kwacha', symbol: 'ZK', countryCode: 'ZM', continent: 'Africa' },
  { code: 'ZWL', name: 'Zimbabwean Dollar', symbol: 'Z$', countryCode: 'ZW', continent: 'Africa' },
  { code: 'BWP', name: 'Botswanan Pula', symbol: 'P', countryCode: 'BW', continent: 'Africa' },
  { code: 'BIF', name: 'Burundian Franc', symbol: 'FBu', countryCode: 'BI', continent: 'Africa' },
  { code: 'CDF', name: 'Congolese Franc', symbol: 'FC', countryCode: 'CD', continent: 'Africa' },
  { code: 'CVE', name: 'Cape Verdean Escudo', symbol: 'CV$', countryCode: 'CV', continent: 'Africa' },
  { code: 'DJF', name: 'Djiboutian Franc', symbol: 'Fdj', countryCode: 'DJ', continent: 'Africa' },
  { code: 'ERN', name: 'Eritrean Nakfa', symbol: 'Nfk', countryCode: 'ER', continent: 'Africa' },
  { code: 'LYD', name: 'Libyan Dinar', symbol: 'ل.د', countryCode: 'LY', continent: 'Africa' },
  { code: 'KMF', name: 'Comorian Franc', symbol: 'CF', countryCode: 'KM', continent: 'Africa' },
];

// Define continent order
const CONTINENT_ORDER = ['North America', 'Europe', 'Asia', 'South America', 'Oceania', 'Africa'];

// Group currencies by continent for Select dropdown
export const CURRENCIES_BY_CONTINENT = ALL_CURRENCIES.reduce((acc, currency) => {
  const continent = currency.continent;
  if (!acc[continent]) {
    acc[continent] = [];
  }
  acc[continent].push({
    value: currency.code,
    label: `${currency.code} - ${currency.name}`,
    countryCode: currency.countryCode,
  });
  return acc;
}, {});

// Create grouped data structure for Mantine Select with specific order
export const GROUPED_CURRENCY_OPTIONS = CONTINENT_ORDER
  .filter(continent => CURRENCIES_BY_CONTINENT[continent])
  .map(continent => ({
    group: continent,
    items: CURRENCIES_BY_CONTINENT[continent]
  }));

// Helper function to get currency by code
export const getCurrencyByCode = (code) => {
  return ALL_CURRENCIES.find(c => c.code === code);
};

// Helper function to get currency symbol (with country prefix if needed)
export const getCurrencySymbol = (currencyCode) => {
  try {
    // Use Intl to get the properly formatted currency symbol
    const formatted = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode,
    }).format(0);
    
    // Extract just the currency symbol/code (remove the number and whitespace)
    return formatted.replace(/[\d.,\s]/g, '');
  } catch {
    // Fallback to simple symbol from our data
    const currency = getCurrencyByCode(currencyCode);
    return currency?.symbol || currencyCode;
  }
};

// Helper function to format currency amount
export const formatCurrency = (amount, currencyCode) => {
  const currency = getCurrencyByCode(currencyCode);
  if (!currency) return `${amount}`;
  
  try {
    // Get the currency symbol (with country prefix if needed)
    const symbol = getCurrencySymbol(currencyCode);
    
    // Format the number with thousand separators and decimals
    const formattedNumber = new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
    
    // Return symbol + space + formatted number
    return `${symbol} ${formattedNumber}`;
  } catch {
    // Fallback if currency code is invalid
    return `${currency.symbol} ${Number(amount).toFixed(2)}`;
  }
};
