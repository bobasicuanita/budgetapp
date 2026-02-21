# Exchange Rate API Usage Tracking

## API Quota
- **Provider**: exchangerate.host (Free Plan)
- **Monthly Limit**: 100 requests
- **Current Month**: February 2026
- **Used So Far**: 4 requests (testing)
- **Remaining**: 96 requests

## Usage Breakdown

### Automatic Daily Usage
- **Daily cron job**: 1 request per day at midnight
- **Expected monthly**: ~30 requests (28-31 days)

### Error/Retry Usage
- **Per failed day**: Up to 6 additional requests (if all retries fail)
- **Expected**: Minimal (should be rare)

### Testing Usage
- **2026-02-18**: 4 requests (initial testing)
  - Test 1: Manual API test
  - Test 2: Service test
  - Test 3: Cron job test
  - Test 4: Server startup test

## Budget Planning

### Safe Monthly Budget
- Daily fetches: 30 requests
- Error retries budget: 20 requests (safety margin)
- Testing/development: 10 requests
- **Buffer**: 40 requests remaining

### Risk Mitigation
1. **Fallback mechanism** reduces need for retries
2. **Development mode commented out** by default
3. **Manual testing discouraged** unless necessary
4. **Historical data** ensures service continuity

## Monitoring Recommendations

1. Track API calls manually or via logs
2. Set up monthly usage alerts
3. Consider upgrade to paid plan if:
   - Frequent API failures occur
   - Need for real-time updates increases
   - Production usage requires higher reliability

## Notes

- Fallback system uses previous day's rates when API fails
- Exchange rates change minimally day-to-day (acceptable for most use cases)
- Consider monthly rate refresh as minimum viable strategy
- Upgrade to paid plan if sub-day accuracy is critical
