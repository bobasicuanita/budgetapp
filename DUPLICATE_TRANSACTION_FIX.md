# Duplicate Transaction Issue - Root Cause Analysis & Fix

## Problem Summary

The application was experiencing critical data integrity issues:
- **Wallet balances in charts were incorrect** (often double the actual balance)
- **Duplicate transactions** appeared in the database (100+ identical transactions)
- **Balance history was double-counting** the starting_balance

## Root Cause Analysis

### 1. Balance History Double-Counting (Fixed)
**Issue**: The balance history calculation was adding `starting_balance` twice:
- Once as the initial `runningBalance` value
- Again by including the `initial_balance` system transaction

**Impact**: Charts showed incorrect balances (often 2x actual balance)

**Fix**: Modified SQL queries in `backend/routes/wallets.js` to exclude `initial_balance` transactions:
```sql
AND system_type IS DISTINCT FROM 'initial_balance'
```

### 2. Idempotency Middleware Vulnerability (Fixed)
**Issue**: The idempotency middleware used **in-memory storage** for tracking request keys:
- Server restarts cleared the idempotency store
- Frontend kept old idempotency keys
- This allowed duplicate submissions after server restarts

**Impact**: Massive data corruption with hundreds of duplicate transactions

**Fix**: Implemented **database-backed idempotency** system:
- Created `idempotency_keys` table for persistent storage
- Hybrid approach: In-memory cache for speed + database for persistence
- Survives server restarts
- 24-hour TTL with automatic cleanup

### 3. Missing Submit Button Protection (Fixed)
**Issue**: Submit button didn't include `isSubmitting` in disabled conditions

**Fix**: Added `isSubmitting` check to button's disabled prop in `TransactionDrawer.jsx`

## Files Changed

### Backend
1. **`backend/middleware/idempotency.js`**
   - Converted from in-memory to database-backed storage
   - Added extensive logging for debugging
   - Hybrid cache + database approach

2. **`backend/routes/wallets.js`**
   - Fixed balance history calculation
   - Excluded `initial_balance` transactions from running totals

3. **`backend/routes/transactions.js`**
   - Added filter to hide `initial_balance` transactions from user view

4. **`backend/migrations/add_idempotency_table.sql`** (NEW)
   - Database migration for idempotency persistence

5. **`backend/scripts/applyIdempotencyMigration.js`** (NEW)
   - Script to apply the idempotency table migration

6. **`backend/scripts/cleanupDuplicateTransactions.js`** (NEW)
   - Identifies duplicate transactions by amount, date, wallet, and merchant
   - Keeps first occurrence, deletes rest
   - Supports expense, income, and transfer duplicates

7. **`backend/scripts/recalculateWalletBalances.js`** (NEW)
   - Recalculates all wallet balances from transactions
   - Handles numeric overflow for test wallets

### Frontend
1. **`frontend/src/components/transactions/TransactionDrawer.jsx`**
   - Added `isSubmitting` to button's disabled conditions
   - Prevents rapid double-clicks during submission

## Data Cleanup Results

### Duplicates Removed
- **100 duplicate** $100 expenses (Feb 14, 2026)
- **88 duplicate** $200 expenses (Feb 13, 2026)
- **5 other** duplicate transactions
- **Total: 193 duplicate transactions deleted**

### Wallet Balances Fixed
- **44 wallets** had incorrect balances and were updated
- **87 wallets** already had correct balances
- **Examples of fixes:**
  - Checking: $33,200 → $42,710 (was missing $9,510)
  - Alpha Bank: $2,897 → $4,002 (was missing $1,104)
  - Revolut: -$1,723 → $3,470 (was missing $5,193)

## Prevention Measures

### 1. Database-Backed Idempotency
- Idempotency keys now persist across server restarts
- 24-hour TTL ensures cleanup
- Automatic database cleanup every 6 hours

### 2. Enhanced Logging
- All idempotency operations now logged with `[IDEMPOTENCY]` prefix
- Duplicate detection logged with key prefix
- Cache/database store sizes tracked

### 3. Button State Management
- Submit buttons properly disabled during submission
- Loading state prevents UI interaction

### 4. Data Integrity Checks
- System transactions (`initial_balance`) properly filtered
- Balance calculations exclude system adjustments
- Numeric overflow protection for extreme values

## Testing Recommendations

### 1. Legitimate Duplicate Transactions (TODO)
✅ Test creating multiple legitimate transactions with:
- Same amount
- Same date
- Same wallet
- Different descriptions or timestamps
- Verify all are saved correctly

### 2. Server Restart Scenario
✅ Test that idempotency survives server restarts:
1. Create transaction (note idempotency key)
2. Restart backend server
3. Try to replay same request
4. Should reject as duplicate

### 3. Balance Verification
✅ Verify that:
- Wallet details page shows correct balance
- Chart shows correct balance history
- Values match between UI and database

## Scripts for Maintenance

### Apply Migration (One-time)
```bash
cd backend
node scripts/applyIdempotencyMigration.js
```

### Find & Remove Duplicates
```bash
cd backend
node scripts/cleanupDuplicateTransactions.js
```

### Recalculate All Balances
```bash
cd backend
node scripts/recalculateWalletBalances.js
```

### Monitor Idempotency Store
Check backend logs for `[IDEMPOTENCY]` messages to monitor duplicate detection.

## Conclusion

The duplicate transaction issue was caused by **in-memory idempotency storage** that didn't survive server restarts. This has been fixed with database-backed persistence, and all corrupted data has been cleaned up.

The balance calculation issue was a separate bug where `starting_balance` was being double-counted. This has also been fixed by properly filtering system transactions.

Both issues are now resolved and prevented from happening again.
