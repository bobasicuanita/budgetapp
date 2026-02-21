# Exchange Rates Cron Job

## Overview
Automated daily fetching and storage of USD-based exchange rates from exchangerate.host API.

**IMPORTANT: ALL dates are stored and processed in UTC to ensure consistency across timezones.**

## Components

### 1. Database Table: `exchange_rates`
- **Location**: `database/migrations/022_create_exchange_rates.sql`
- **Columns**:
  - `id` (UUID): Primary key
  - `date` (DATE): Date of exchange rate in UTC (YYYY-MM-DD format)
  - `currency_code` (VARCHAR(3)): Target currency ISO code
  - `rate` (DECIMAL(20,10)): Exchange rate from USD to target currency
  - `created_at` (TIMESTAMP): Record creation timestamp
- **Indexes**: Optimized for date and currency lookups
- **Date Format**: ALL dates are stored in UTC (no timezone offsets, no local conversions)

### 2. Exchange Rate Service
- **Location**: `services/exchangeRateService.js`
- **Functions**:
  - `fetchExchangeRates(date)`: Fetches rates from API for specific date (UTC)
  - `storeExchangeRates(date, quotes)`: Stores rates in database with UTC date
  - `fetchAndStoreTodayRates()`: Main function to fetch and store today's rates (UTC)
  - `getExchangeRate(currencyCode, date)`: Retrieves stored rate from database
- **Date Handling**: All date operations use UTC methods (getUTCFullYear, getUTCMonth, getUTCDate)

### 3. Cron Job Scheduler
- **Location**: `jobs/exchangeRateCron.js`
- **Schedule**: Runs daily at 02:00 UTC (not local time)
- **Features**:
  - Automatic retry logic on failure
  - UTC-based scheduling ensures consistency worldwide
  - Does not overwrite existing rates for past dates

### 4. Retry Logic & Fallback
- **Retry Schedule**:
  1. First retry: 30 minutes after initial failure
  2. Second retry: 1 hour after first retry
  3. Subsequent retries: Every 1 hour
  4. Maximum attempts: 6 total attempts
- **Fallback Mechanism**: 
  - After all retries are exhausted, the system automatically falls back to the most recent available exchange rates
  - Copies rates from the previous day (or latest available) to today's UTC date
  - Logs warning that outdated rates are being used
  - If no historical data exists, logs critical error requiring manual intervention
  - **Does not overwrite existing rates** - if rates already exist for a date, they are preserved

## Configuration

### Environment Variables
Add to `.env`:
```env
EXCHANGE_RATE_API_KEY=2dca349fdab4b7a6e902f1575af85993
```

### API Details
- **Provider**: exchangerate.host (currencylayer)
- **Endpoint**: `https://api.exchangerate.host/timeframe`
- **Base Currency**: USD
- **API Limit**: **100 requests per month** (Free plan)
- **Parameters**:
  - `start_date`: YYYY-MM-DD format
  - `end_date`: YYYY-MM-DD format (same as start_date for daily fetch)
  - `access_key`: API authentication key

⚠️ **Important**: With only 100 requests/month, avoid unnecessary testing. Each test uses 1 API call.

## Setup

### 1. Run Migration
```bash
cd backend
node database/runMigration.js migrations/022_create_exchange_rates.sql
```

### 2. Add API Key to .env
```env
EXCHANGE_RATE_API_KEY=your_api_key_here
```

### 3. Start Server
```bash
npm run dev
```

The cron job will start automatically when the server starts.

## Logging

The cron job logs all activities to console:
- ✓ Successful fetches and storage
- Schedule information (next run time)
- Retry attempts and delays
- ✗ Errors with details
- Final failure after max retries

## Example Log Output

### Successful Fetch
```
[Exchange Rates Cron] Scheduler started (UTC-based)
[Exchange Rates Cron] Next run scheduled in 8.45 hours (at 02:00 UTC)
[Exchange Rates Cron] Next run time: 2026-02-19 02:00:00 UTC
[Exchange Rates Cron] Running immediate fetch for testing...

[Exchange Rates] Fetching rates for 2026-02-19 (UTC)...
✓ Stored 171 exchange rates for 2026-02-19 (UTC)
[Exchange Rates] ✓ Successfully stored 171 rates for 2026-02-19
```

### Failed Fetch with Fallback
```
[Exchange Rates Cron] ✗ Attempt 1 failed: API returned error: {...}
[Exchange Rates Cron] Scheduling retry 1/6 in 30 minutes...
[Exchange Rates Cron] ✗ Attempt 2 failed: API returned error: {...}
[Exchange Rates Cron] Scheduling retry 2/6 in 60 minutes...
...
[Exchange Rates Cron] ✗ Max retries (6) reached.
[Exchange Rates Cron] Attempting fallback: using previous day's rates...
[Exchange Rates Cron] Using rates from 2026-02-18 (171 currencies)
[Exchange Rates] Copying rates from 2026-02-18 to 2026-02-19...
✓ Copied 171 exchange rates from 2026-02-18 to 2026-02-19
[Exchange Rates Cron] ✓ Fallback successful: 171 rates copied from 2026-02-18
[Exchange Rates Cron] ⚠ WARNING: Using outdated exchange rates. API fetch failed.
```

## Testing

⚠️ **IMPORTANT**: Free API plan allows only **100 requests/month**. Avoid unnecessary testing!

### Test Immediate Fetch (Development Mode)
When `NODE_ENV=development`, the cron job runs immediately on server start for testing purposes.

**Recommendation**: Comment out the immediate fetch in production and even in development after initial testing.

### Manual Test
You can also manually trigger a fetch using the service:
```javascript
import { fetchAndStoreTodayRates } from './services/exchangeRateService.js';
await fetchAndStoreTodayRates();
```

**⚠️ Each manual test consumes 1 API request from your monthly quota!**

### Query Stored Rates
```sql
-- Get all rates for today (UTC)
SELECT * FROM exchange_rates WHERE date = '2026-02-19';

-- Get specific currency rate
SELECT * FROM exchange_rates 
WHERE currency_code = 'EUR' AND date = '2026-02-19';

-- Count stored currencies
SELECT COUNT(*) FROM exchange_rates WHERE date = '2026-02-19';

-- View recent dates with rates
SELECT DISTINCT date, COUNT(*) as currencies
FROM exchange_rates
GROUP BY date
ORDER BY date DESC
LIMIT 10;
```

## Error Handling

### API Errors
- Logged to console with full error details
- Automatic retry with exponential backoff
- Max 6 attempts before triggering fallback
- **Fallback**: Automatically copies most recent available rates if all retries fail
- Logs clearly indicate:
  - Each failed attempt with error message
  - Retry schedule
  - Fallback activation
  - Warning when using outdated rates

### Database Errors
- Logged to console
- Will retry on next attempt
- Uses UPSERT to avoid duplicates

### Critical Failures
If both API fetch and fallback fail (no historical data):
- Logs `CRITICAL` error
- Indicates manual intervention required
- System continues running but without exchange rate data for that day

## UTC Consistency

**CRITICAL**: All exchange rates are stored and processed in UTC to ensure consistency:

- **Cron Job**: Runs at 02:00 UTC every day
- **Date Storage**: All `date` columns use UTC dates (YYYY-MM-DD)
- **Date Retrieval**: All queries use UTC dates
- **No Timezone Conversions**: Exchange rates are never converted to local timezones
- **No Overwriting**: Existing rates for past dates are preserved

This means:
- A user in New York (UTC-5) and a user in Tokyo (UTC+9) both see rates for the same UTC date
- Exchange rates remain stable and consistent regardless of server location
- No date confusion or mismatch issues across timezones

## Rate Lookup Logic

When converting a transaction, the system:

1. **Exact Match**: Looks for rate where `rate_date == transaction_date`
2. **Backward Search**: If no exact match, finds the most recent rate BEFORE transaction date
3. **Never Uses Future Rates**: No forecasting - only historical rates are used

Example:
- Transaction date: Feb 21, 2026
- No rate for Feb 21 → Uses rate from Feb 19 (most recent available before Feb 21)
- Never uses rate from Feb 22 or later

## UX States for Rate Age

The UI displays different banners based on how old the exchange rate is:

### 1. Exact Match or 0-3 Days Old (Blue, Severity: `none` or `info`)
- **Banner Color**: Blue
- **Message**: Simple display of amount conversion and rate
- **Manual Input**: Hidden
- **Example**: Transaction on Feb 21, rate from Feb 19

### 2. 4-14 Days Old (Blue, Severity: `recent`)
- **Banner Color**: Blue
- **Message**: "Using the most recent available exchange rate from Feb 17. You can edit the rate if needed."
- **Manual Input**: Shown (optional)
- **Example**: Transaction on Feb 21, rate from Feb 7

### 3. 15-30 Days Old (Orange, Severity: `outdated`)
- **Banner Color**: Orange
- **Message**: "Exchange rate from Feb 2 may be outdated. You can edit the rate if you know the correct value."
- **Manual Input**: Shown (optional)
- **Example**: Transaction on Feb 21, rate from Jan 22

### 4. 31+ Days Old (Red, Severity: `old`)
- **Banner Color**: Red
- **Message**: "The most recent available exchange rate is from Feb 2. This rate may be outdated. Enter exchange rate manually:"
- **Manual Input**: Shown (optional but strongly encouraged)
- **Example**: Transaction on Feb 21, rate from Dec 15

### 5. No Rate Available (Blue, Severity: `critical`)
- **Banner Color**: Blue
- **Message**: "No exchange rate is available for this date. Please enter the exchange rate manually to continue."
- **Manual Input**: Required - transaction cannot be saved without it
- **Blocking**: Submit button is disabled until manual rate is entered
- **Example**: Transaction on Jan 1, 2025, but earliest rate is from Feb 1, 2025

## Production Considerations

1. **Comment out development mode** in `jobs/exchangeRateCron.js`:
   ```javascript
   // Comment out this block in production:
   if (process.env.NODE_ENV === 'development') {
     console.log('[Exchange Rates Cron] Running immediate fetch for testing...');
     fetchWithRetry();
   }
   ```

2. **API Quota Management**:
   - Free plan: 100 requests/month
   - Daily cron: ~30 requests/month (1 per day)
   - Retries can consume additional quota (up to 6 per failed day)
   - Budget: ~70 requests remaining for errors/retries per month
   - Monitor usage carefully to avoid hitting limits mid-month

3. **Monitor logs** for:
   - Failed fetch attempts
   - Fallback activations
   - Critical errors (no historical data)

4. **Set up alerts** for:
   - Max retries reached
   - Fallback usage (indicates API issues)
   - Critical failures

5. **Database maintenance**:
   - Historical rates grow by ~171 records/day
   - Consider archiving old rates after 1-2 years if needed

6. **Consider backup API** if primary fails consistently

7. **Fallback benefits**:
   - System remains functional even during API outages
   - Exchange rates rarely change drastically day-to-day
   - Users can still perform currency operations
