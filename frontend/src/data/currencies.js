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
  { code: 'ANG', name: 'Netherlands Antillean Guilder', symbol: 'ƒ', countryCode: 'CW', continent: 'North America' },
  { code: 'AWG', name: 'Aruban Florin', symbol: 'ƒ', countryCode: 'AW', continent: 'North America' },
  { code: 'BBD', name: 'Barbadian Dollar', symbol: '$', countryCode: 'BB', continent: 'North America' },
  { code: 'BMD', name: 'Bermudan Dollar', symbol: '$', countryCode: 'BM', continent: 'North America' },
  { code: 'BSD', name: 'Bahamian Dollar', symbol: '$', countryCode: 'BS', continent: 'North America' },
  { code: 'CUC', name: 'Cuban Convertible Peso', symbol: '$', countryCode: 'CU', continent: 'North America' },
  { code: 'CUP', name: 'Cuban Peso', symbol: '$', countryCode: 'CU', continent: 'North America' },
  { code: 'HTG', name: 'Haitian Gourde', symbol: 'G', countryCode: 'HT', continent: 'North America' },
  { code: 'KYD', name: 'Cayman Islands Dollar', symbol: '$', countryCode: 'KY', continent: 'North America' },
  { code: 'SVC', name: 'Salvadoran Colón', symbol: '$', countryCode: 'SV', continent: 'North America' },
  { code: 'XCD', name: 'East Caribbean Dollar', symbol: '$', countryCode: 'AG', continent: 'North America' },
  
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
  { code: 'FKP', name: 'Falkland Islands Pound', symbol: '£', countryCode: 'FK', continent: 'Europe' },
  { code: 'GGP', name: 'Guernsey Pound', symbol: '£', countryCode: 'GG', continent: 'Europe' },
  { code: 'GIP', name: 'Gibraltar Pound', symbol: '£', countryCode: 'GI', continent: 'Europe' },
  { code: 'IMP', name: 'Manx pound', symbol: '£', countryCode: 'IM', continent: 'Europe' },
  { code: 'JEP', name: 'Jersey Pound', symbol: '£', countryCode: 'JE', continent: 'Europe' },
  
  // Asia
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥', countryCode: 'JP', continent: 'Asia' },
  { code: 'CNY', name: 'Chinese Yuan', symbol: '¥', countryCode: 'CN', continent: 'Asia' },
  { code: 'CNH', name: 'Chinese Yuan Offshore', symbol: '¥', countryCode: 'HK', continent: 'Asia' },
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
  { code: 'BTN', name: 'Bhutanese Ngultrum', symbol: 'Nu.', countryCode: 'BT', continent: 'Asia' },
  { code: 'KGS', name: 'Kyrgystani Som', symbol: 'с', countryCode: 'KG', continent: 'Asia' },
  { code: 'KPW', name: 'North Korean Won', symbol: '₩', countryCode: 'KP', continent: 'Asia' },
  { code: 'LAK', name: 'Laotian Kip', symbol: '₭', countryCode: 'LA', continent: 'Asia' },
  { code: 'MNT', name: 'Mongolian Tugrik', symbol: '₮', countryCode: 'MN', continent: 'Asia' },
  { code: 'MVR', name: 'Maldivian Rufiyaa', symbol: 'Rf', countryCode: 'MV', continent: 'Asia' },
  { code: 'TJS', name: 'Tajikistani Somoni', symbol: 'ЅМ', countryCode: 'TJ', continent: 'Asia' },
  { code: 'TMT', name: 'Turkmenistani Manat', symbol: 'm', countryCode: 'TM', continent: 'Asia' },

  // South America
  { code: 'BRL', name: 'Brazilian Real', symbol: 'R$', countryCode: 'BR', continent: 'South America' },
  { code: 'ARS', name: 'Argentine Peso', symbol: '$', countryCode: 'AR', continent: 'South America' },
  { code: 'CLP', name: 'Chilean Peso', symbol: '$', countryCode: 'CL', continent: 'South America' },
  { code: 'COP', name: 'Colombian Peso', symbol: '$', countryCode: 'CO', continent: 'South America' },
  { code: 'PEN', name: 'Peruvian Nuevo Sol', symbol: 'S/.', countryCode: 'PE', continent: 'South America' },
  { code: 'BOB', name: 'Bolivian Boliviano', symbol: 'Bs', countryCode: 'BO', continent: 'South America' },
  { code: 'PYG', name: 'Paraguayan Guarani', symbol: '₲', countryCode: 'PY', continent: 'South America' },
  { code: 'UYU', name: 'Uruguayan Peso', symbol: '$U', countryCode: 'UY', continent: 'South America' },
  { code: 'VES', name: 'Sovereign Bolivar', symbol: 'Bs.S', countryCode: 'VE', continent: 'South America' },
  { code: 'SRD', name: 'Surinamese Dollar', symbol: '$', countryCode: 'SR', continent: 'South America' },
  { code: 'GYD', name: 'Guyanaese Dollar', symbol: '$', countryCode: 'GY', continent: 'South America' },
  
  // Oceania
  { code: 'AUD', name: 'Australian Dollar', symbol: 'A$', countryCode: 'AU', continent: 'Oceania' },
  { code: 'NZD', name: 'New Zealand Dollar', symbol: 'NZ$', countryCode: 'NZ', continent: 'Oceania' },
  { code: 'TOP', name: 'Tongan Paʻanga', symbol: 'T$', countryCode: 'TO', continent: 'Oceania' },
  { code: 'FJD', name: 'Fijian Dollar', symbol: '$', countryCode: 'FJ', continent: 'Oceania' },
  { code: 'PGK', name: 'Papua New Guinean Kina', symbol: 'K', countryCode: 'PG', continent: 'Oceania' },
  { code: 'SBD', name: 'Solomon Islands Dollar', symbol: '$', countryCode: 'SB', continent: 'Oceania' },
  { code: 'VUV', name: 'Vanuatu Vatu', symbol: 'Vt', countryCode: 'VU', continent: 'Oceania' },
  { code: 'WST', name: 'Samoan Tala', symbol: 'T', countryCode: 'WS', continent: 'Oceania' },
  { code: 'XPF', name: 'CFP Franc', symbol: '₣', countryCode: 'PF', continent: 'Oceania' },
  
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
  { code: 'AOA', name: 'Angolan Kwanza', symbol: 'Kz', countryCode: 'AO', continent: 'Africa' },
  { code: 'GMD', name: 'Gambian Dalasi', symbol: 'D', countryCode: 'GM', continent: 'Africa' },
  { code: 'LRD', name: 'Liberian Dollar', symbol: '$', countryCode: 'LR', continent: 'Africa' },
  { code: 'LSL', name: 'Lesotho Loti', symbol: 'L', countryCode: 'LS', continent: 'Africa' },
  { code: 'MRU', name: 'Mauritanian Ouguiya', symbol: 'UM', countryCode: 'MR', continent: 'Africa' },
  { code: 'MWK', name: 'Malawian Kwacha', symbol: 'MK', countryCode: 'MW', continent: 'Africa' },
  { code: 'SCR', name: 'Seychellois Rupee', symbol: '₨', countryCode: 'SC', continent: 'Africa' },
  { code: 'SHP', name: 'Saint Helena Pound', symbol: '£', countryCode: 'SH', continent: 'Africa' },
  { code: 'SLE', name: 'Sierra Leonean Leone', symbol: 'Le', countryCode: 'SL', continent: 'Africa' },
  { code: 'STN', name: 'São Tomé and Príncipe Dobra', symbol: 'Db', countryCode: 'ST', continent: 'Africa' },
  { code: 'SZL', name: 'Swazi Lilangeni', symbol: 'L', countryCode: 'SZ', continent: 'Africa' },
  { code: 'ZMW', name: 'Zambian Kwacha', symbol: 'ZK', countryCode: 'ZM', continent: 'Africa' },
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

// Helper function to get currency info (alias for getCurrencyByCode for clarity)
export const getCurrencyInfo = (code) => {
  return getCurrencyByCode(code);
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
    // Use Intl.NumberFormat with the currency code to get proper formatting
    // This handles:
    // - Thousands separators (comma or space depending on locale)
    // - Decimal separators (period or comma)
    // - Currency symbol
    // - Correct decimal places (0 for JPY, 2 for USD, 3 for BHD, etc.)
    const formatted = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: undefined, // Let Intl determine based on currency
      maximumFractionDigits: undefined, // Let Intl determine based on currency
    }).format(amount);
    
    return formatted;
  } catch {
    // Fallback if currency code is invalid
    return `${currency.symbol} ${Number(amount).toFixed(2)}`;
  }
};
