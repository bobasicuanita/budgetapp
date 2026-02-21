# Exchange Rate Lookup Logic & UX

## Overview
This document describes how exchange rates are looked up for transactions and how the UI responds based on rate availability and age.

## Core Principles

1. **UTC-Only Storage**: All exchange rates stored with UTC dates
2. **Backward-Only Lookup**: NEVER use future rates (no forecasting)
3. **User-Visible Dates**: Transaction dates are shown to users in their local format
4. **Conversion Uses UTC Dates**: Exchange rate lookups map transaction date to UTC date

## Rate Lookup Algorithm

### Step 1: Exact Match
```sql
SELECT rate, date
FROM exchange_rates
WHERE currency_code = 'EUR'
  AND date = '2026-02-21'::date
```

### Step 2: Most Recent Before Transaction Date
If no exact match found:
```sql
SELECT rate, date, (transaction_date - date) as days_diff
FROM exchange_rates
WHERE currency_code = 'EUR'
  AND date <= '2026-02-21'::date
ORDER BY date DESC
LIMIT 1
```

### Step 3: No Rate Found
If no rate exists on or before the transaction date, return `null`.

**IMPORTANT**: We NEVER use rates from dates AFTER the transaction date.

## Examples

### Example 1: Exact Match
- Transaction Date: Feb 21, 2026
- Rate Available: Feb 21, 2026
- **Result**: Use Feb 21 rate (0 days difference)

### Example 2: Recent Rate
- Transaction Date: Feb 21, 2026
- Rate Available: Feb 19, 2026 (no rate for Feb 20 or Feb 21)
- **Result**: Use Feb 19 rate (2 days difference)

### Example 3: Old Rate
- Transaction Date: Feb 21, 2026
- Rate Available: Jan 15, 2026
- **Result**: Use Jan 15 rate (37 days difference)

### Example 4: No Rate Available
- Transaction Date: Jan 1, 2025
- Earliest Rate: Feb 1, 2025
- **Result**: `null` - user MUST enter manual rate

### Example 5: Never Use Future Rates
- Transaction Date: Feb 21, 2026
- Rate Available: Feb 22, 2026 (future), Feb 15, 2026 (past)
- **Result**: Use Feb 15 rate (6 days difference) - Feb 22 is ignored

## UX States

### State 1: Exact Match or 0-3 Days Old
**Severity**: `none` or `info`  
**Banner Color**: Blue  
**Icon**: Info  

**Display**:
```
For totals and reports, this expense will also be shown in CAD.

Amount: 500 EUR ≈ 806 CAD

Exchange Rate:
1 EUR = 1.61 CAD
Rate Date: Feb 19
```

**Manual Input**: Hidden  
**Blocking**: No  
**Note**: Only displays when amount > 0. Transaction type (expense/income/transfer) and base currency are dynamic.

---

### State 2: 4-14 Days Old
**Severity**: `recent`  
**Banner Color**: Blue  
**Icon**: Info  

**Display**:
```
Using the most recent available exchange rate from Feb 17.
You can edit the rate if needed.

For totals and reports, this expense will also be shown in CAD.

Amount: 500 EUR ≈ 806 CAD

Exchange Rate:
1 EUR = 1.61 CAD
Rate Date: Feb 17

Or enter your own rate (optional):
[Manual rate input field]
```

**Manual Input**: Shown (optional)  
**Blocking**: No  
**Note**: Only displays when amount > 0. Transaction type and base currency are dynamic.

---

### State 3: 15-30 Days Old
**Severity**: `outdated`  
**Banner Color**: Orange  
**Icon**: Warning  

**Display**:
```
Exchange rate from Feb 2 may be outdated.
You can edit the rate if you know the correct value.

For totals and reports, this income will also be shown in CAD.

Amount: 500 EUR ≈ 806 CAD

Exchange Rate:
1 EUR = 1.61 CAD
Rate Date: Feb 2

Or enter your own rate (optional):
[Manual rate input field]
```

**Manual Input**: Shown (optional)  
**Blocking**: No  
**Note**: Only displays when amount > 0. Transaction type and base currency are dynamic.

---

### State 4: 31+ Days Old
**Severity**: `old`  
**Banner Color**: Red  
**Icon**: Warning  

**Display**:
```
The most recent available exchange rate is from Feb 2.
This rate may be outdated.

Enter exchange rate manually:

For totals and reports, this transfer will also be shown in CAD.

Amount: 500 EUR ≈ 806 CAD

Exchange Rate:
1 EUR = 1.61 CAD
Rate Date: Feb 2

Or enter your own rate (optional):
[Manual rate input field]
```

**Manual Input**: Shown (optional but encouraged)  
**Blocking**: No  
**Note**: Only displays when amount > 0. Transaction type and base currency are dynamic.

---

### State 5: No Rate Available
**Severity**: `critical`  
**Banner Color**: Blue  
**Icon**: Info  

**Display**:
```
No exchange rate is available for this date.
Please enter the exchange rate manually to continue.

[Manual rate input field - REQUIRED]
Placeholder: "1 EUR = _____ CAD"

(After rate entered):
For totals and reports, this expense will also be shown in CAD.

Amount: 500 EUR ≈ 806 CAD
```

**Manual Input**: Required  
**Blocking**: Yes - submit button disabled until valid rate entered  
**Note**: Only displays when amount > 0; amount conversion and explanation text appear after manual rate is entered. Transaction type and base currency are dynamic.

---

## Exchange Rate Storage Format

**IMPORTANT**: All exchange rates in the database are stored in the format provided by exchangerate.host API:

**Format**: `1 USD = X [currency]`

**Examples**:
- EUR rate = 0.84 means "1 USD = 0.84 EUR"
- JPY rate = 155.00 means "1 USD = 155.00 JPY"
- MXN rate = 20.00 means "1 USD = 20.00 MXN"

This is NOT an assumption about the user's base currency - it's the API's data format. All conversions must account for this.

### Conversion Math

**To USD**: `amount / rate` (e.g., 100 EUR ÷ 0.84 = 119.05 USD)  
**From USD**: `amount * rate` (e.g., 100 USD × 0.84 = 84 EUR)  
**Non-USD to Non-USD**: Convert through USD as intermediary

### Rate Display Examples

**IMPORTANT**: For income/expense, display format is always: `1 [transactionCurrency] = X [baseCurrency]`
This shows the user how much their entered amount converts to in their base currency.

**Scenario 1: USD Base, EUR Transaction**
- User enters: 500 EUR
- DB Rate: 1 USD = 0.84 EUR
- Display Rate: `1 EUR = 1.19 USD` (inverted: 1/0.84)
- Display Amount: `Amount: 500 EUR ≈ 595 USD`

**Scenario 2: EUR Base, USD Transaction**
- User enters: 500 USD
- DB Rate: 1 USD = 0.84 EUR
- Display Rate: `1 USD = 0.84 EUR` (direct)
- Display Amount: `Amount: 500 USD ≈ 420 EUR`

**Scenario 3: CAD Base, EUR Transaction**
- User enters: 500 EUR
- DB Rates: 1 USD = 1.35 CAD, 1 USD = 0.84 EUR
- Display Rate: `1 EUR = 1.61 CAD` (calculated: 1.35 / 0.84)
- Display Amount: `Amount: 500 EUR ≈ 805 CAD`

**Scenario 4: EUR Base, MXN Transaction**
- User enters: 500 MXN
- DB Rates: 1 USD = 0.84 EUR, 1 USD = 20 MXN
- Display Rate: `1 MXN = 0.042 EUR` (calculated: 0.84 / 20)
- Display Amount: `Amount: 500 MXN ≈ 21 EUR`

**Scenario 5: GBP Base, JPY Transaction**
- User enters: 10000 JPY
- DB Rates: 1 USD = 0.73 GBP, 1 USD = 155 JPY
- Display Rate: `1 JPY = 0.0047 GBP` (calculated: 0.73 / 155)
- Display Amount: `Amount: 10000 JPY ≈ 47 GBP`

## Technical Implementation

### Backend

**File**: `backend/services/exchangeRateService.js`
```javascript
export async function findClosestExchangeRate(currencyCode, targetDate) {
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
  
  return rateResult ? {
    rate: parseFloat(rateResult.rate),
    date: rateResult.date.toISOString().split('T')[0],
    exactMatch: days_diff === 0,
    daysDifference: parseInt(rateResult.days_diff)
  } : null;
}
```

**File**: `backend/routes/exchangeRates.js`
```javascript
router.get("/availability", authenticateToken, async (req, res) => {
  // ... validation ...
  
  const rateInfo = await findClosestExchangeRate(currency, date);
  
  // Determine severity based on days difference
  let severity = 'none';
  if (rateInfo.daysDifference === 0) {
    severity = 'none';
  } else if (rateInfo.daysDifference <= 3) {
    severity = 'info';
  } else if (rateInfo.daysDifference <= 14) {
    severity = 'recent';
  } else if (rateInfo.daysDifference <= 30) {
    severity = 'outdated';
  } else {
    severity = 'old';
  }
  
  res.json({
    available: true,
    severity,
    rate: rateInfo.rate,
    rateDate: rateInfo.date,
    daysDifference: rateInfo.daysDifference
  });
});
```

### Frontend

**File**: `frontend/src/components/transactions/TransactionDrawer.jsx`

The component checks `exchangeRateInfo.severity` and displays appropriate banners:
- `'none'` or `'info'`: Blue banner, no manual input
- `'recent'`: Blue banner, optional manual input
- `'outdated'`: Orange banner, optional manual input
- `'old'`: Red banner, strongly encouraged manual input
- `'critical'`: Blue banner, required manual input (blocks submission)

## Benefits

1. **No Forecasting**: System never assumes future rates
2. **Clear User Guidance**: Users know exactly how reliable the rate is
3. **Progressive Disclosure**: Manual input only shown when needed
4. **Safety**: Blocks submission when no rate available
5. **Flexibility**: Users can always override with manual rates
6. **Consistency**: UTC dates ensure worldwide consistency

## Testing Scenarios

### Scenario 1: Current Transaction with Recent Rates
- **Setup**: Today is Feb 21, rates stored up to Feb 21
- **Action**: Create transaction for Feb 21
- **Expected**: Blue banner, "Feb 21" rate, no manual input

### Scenario 2: Transaction 1 Week Ago
- **Setup**: Today is Feb 21, rates stored up to Feb 21
- **Action**: Create transaction for Feb 14
- **Expected**: Blue banner, "Feb 14" rate, no manual input

### Scenario 3: Transaction with 10-Day-Old Rate
- **Setup**: Today is Feb 21, last rate is Feb 11
- **Action**: Create transaction for Feb 21
- **Expected**: Blue banner, "Using... Feb 11", optional manual input

### Scenario 4: Transaction with 20-Day-Old Rate
- **Setup**: Today is Feb 21, last rate is Feb 1
- **Action**: Create transaction for Feb 21
- **Expected**: Orange banner, "may be outdated", optional manual input

### Scenario 5: Transaction with 60-Day-Old Rate
- **Setup**: Today is Feb 21, last rate is Dec 23
- **Action**: Create transaction for Feb 21
- **Expected**: Red banner, "Enter manually", optional manual input

### Scenario 6: Historical Transaction Before Any Rates
- **Setup**: Earliest rate is Feb 1, 2025
- **Action**: Create transaction for Jan 1, 2025
- **Expected**: Blue banner, "No rate available", REQUIRED manual input, submit blocked

### Scenario 7: Never Uses Future Rates
- **Setup**: Today is Feb 21, rates exist for Feb 22, Feb 23, but last past rate is Feb 15
- **Action**: Create transaction for Feb 21
- **Expected**: Uses Feb 15 rate (6 days old), NOT Feb 22 or Feb 23
