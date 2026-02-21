# Multi-Currency Support

## Overview
The app supports multiple currencies with automatic conversion to the user's base currency using real exchange rates.

## How It Works

### Exchange Rates Storage
- All exchange rates are stored with **USD as the base currency**
- Format: `USDXXX` where XXX is the target currency
- Example: `USDEUR = 0.84` means 1 USD = 0.84 EUR
- Updated daily via cron job from exchangerate.host API

### Currency Conversion Logic

#### Same Currency (No Conversion)
```
User Base: USD
Wallet: 1,000 USD
Converted: 1,000 USD (no conversion needed)
```

#### Converting to USD
```
User Base: USD
Wallet: 5,000 EUR
Exchange Rate: USDEUR = 0.84 (1 USD = 0.84 EUR)

Formula: amount / rate
Calculation: 5,000 / 0.84 = 5,952.38 USD
```

#### Converting from USD
```
User Base: EUR
Wallet: 1,000 USD
Exchange Rate: USDEUR = 0.84 (1 USD = 0.84 EUR)

Formula: amount * rate
Calculation: 1,000 * 0.84 = 840 EUR
```

#### Converting Between Non-USD Currencies
```
User Base: GBP
Wallet: 5,000 EUR
Exchange Rates: 
  - USDEUR = 0.84 (1 USD = 0.84 EUR)
  - USDGBP = 0.73 (1 USD = 0.73 GBP)

Step 1: EUR to USD
  5,000 / 0.84 = 5,952.38 USD

Step 2: USD to GBP
  5,952.38 * 0.73 = 4,345.24 GBP
```

## Net Worth Calculation

### Example Scenario
```
User Base Currency: USD

Wallets:
  1. Cash Wallet: 3,000 USD
  2. Checking Account: 25,000 USD  
  3. Euro Bank Account: 5,000 EUR

Exchange Rate: USDEUR = 0.84
```

### Calculation
```javascript
// Wallet 1: Cash (USD)
3,000 USD (same as base) = 3,000 USD

// Wallet 2: Checking (USD)
25,000 USD (same as base) = 25,000 USD

// Wallet 3: Euro Bank (EUR)
5,000 EUR / 0.84 = 5,952.38 USD

// Total Net Worth
3,000 + 25,000 + 5,952.38 = 33,952.38 USD
```

## API Response

### GET /api/wallets

**Response includes:**
```json
{
  "wallets": [
    {
      "id": "...",
      "name": "Euro Bank Account",
      "currency": "EUR",
      "current_balance": 5000,
      "include_in_balance": true,
      ...
    }
  ],
  "totalNetWorth": 33952.38,
  "baseCurrency": "USD",
  "exchangeRatesDate": "2026-02-18"
}
```

**Key Fields:**
- `totalNetWorth`: Total of all wallets converted to base currency
- `baseCurrency`: User's base currency for reporting
- `exchangeRatesDate`: Date of exchange rates used for conversion
- `include_in_balance`: Wallets with this set to `false` are excluded from net worth

## Important Notes

### Include in Balance Flag
Wallets can be excluded from net worth calculation:
```javascript
if (!wallet.include_in_balance) {
  return sum; // Skip this wallet
}
```

This is useful for:
- Savings goals that shouldn't count toward spending money
- Credit card accounts (future feature)
- Investment accounts (future feature)

### Fallback Behavior
If no exchange rates are found in the database:
- A warning is logged to console
- All currencies are converted at 1:1 ratio
- System continues to function (degraded mode)

### Exchange Rate Updates
- Rates update daily at midnight via cron job
- If API fails, uses previous day's rates automatically
- `exchangeRatesDate` field shows which date's rates were used

## Code Location

### Backend
- **Currency Conversion Function**: `backend/routes/wallets.js` - `convertCurrency()`
- **Net Worth Calculation**: `backend/routes/wallets.js` - `GET /api/wallets`
- **Exchange Rates Service**: `backend/services/exchangeRateService.js`

### Frontend
- Currency display logic in wallet pages
- Currency formatting utilities

## Testing Currency Conversion

### Test Scenarios

1. **All Wallets Same Currency as Base**
   - Expected: Direct sum of balances

2. **Mixed Currencies**
   - Expected: Each wallet converted to base currency before summing

3. **Excluded Wallets**
   - Expected: Wallets with `include_in_balance = false` are ignored

4. **No Exchange Rates Available**
   - Expected: Warning logged, 1:1 conversion used

### Manual Testing
```javascript
// Create test wallets with different currencies
// Check that net worth calculation matches manual conversion
```

## Future Enhancements

1. **Historical Conversion**: Use exchange rate from transaction date
2. **Currency Graphs**: Show balance trends across currencies
3. **Multi-Currency Reports**: Break down income/expenses by currency
4. **Currency Alerts**: Notify when exchange rates change significantly
