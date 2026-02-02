# Onboarding System Guide

## Overview

The onboarding system collects **essential information** from new users:
1. **Base Currency** - Primary currency for reports
2. **First Wallet** - Initial wallet with type and starting balance

## Database Schema

### Users Table Updates

```sql
ALTER TABLE users 
ADD COLUMN base_currency VARCHAR(3) DEFAULT NULL,
ADD COLUMN onboarding_completed BOOLEAN DEFAULT FALSE,
ADD COLUMN onboarding_completed_at TIMESTAMP DEFAULT NULL;
```

**Fields:**
- `base_currency` - ISO 4217 currency code (EUR, USD, etc.)
- `onboarding_completed` - Whether user finished setup
- `onboarding_completed_at` - Timestamp of completion

### Wallets Table

```sql
CREATE TABLE wallets (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Basic Info
  name VARCHAR(100) NOT NULL,
  type VARCHAR(20) NOT NULL CHECK (type IN ('cash', 'bank', 'credit_card', 'savings', 'investment')),
  
  -- Financial Info
  currency VARCHAR(3) NOT NULL,
  starting_balance DECIMAL(15, 2) NOT NULL DEFAULT 0,
  current_balance DECIMAL(15, 2) NOT NULL DEFAULT 0,
  
  -- Display
  icon VARCHAR(10) DEFAULT NULL,
  color VARCHAR(20) DEFAULT 'blue',
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**Wallet Types:**
- `cash` - Physical money 💵
- `bank` - Bank account 🏦
- `credit_card` - Credit card (can have negative balance) 💳
- `savings` - Savings account 💰
- `investment` - Investment account 📈

**Balance Fields:**
- `starting_balance` - Initial amount when wallet created (snapshot)
- `current_balance` - Current amount (updated by transactions)

## Backend API

### Endpoints

#### POST /api/onboarding/complete
Complete user onboarding.

**Request:**
```json
{
  "base_currency": "EUR",
  "wallet": {
    "type": "cash",
    "name": "My Cash Wallet",  // Optional
    "starting_balance": 1000.00
  }
}
```

**Response:**
```json
{
  "message": "Onboarding completed successfully!",
  "redirect": "/dashboard"
}
```

**Validation:**
- `base_currency` must be 3-letter ISO code
- `wallet.type` must be one of: cash, bank, credit_card, savings, investment
- `wallet.starting_balance` is required (can be negative for credit cards)

#### GET /api/onboarding/status
Check if user completed onboarding.

**Response:**
```json
{
  "completed": true,
  "baseCurrency": "EUR",
  "completedAt": "2026-01-28T10:30:00Z"
}
```

#### GET /api/onboarding/wallets
Get all user wallets.

**Response:**
```json
{
  "wallets": [
    {
      "id": 1,
      "name": "Cash",
      "type": "cash",
      "currency": "EUR",
      "starting_balance": "1000.00",
      "current_balance": "1000.00",
      "icon": "💵",
      "color": "green",
      "is_active": true,
      "created_at": "2026-01-28T10:30:00Z"
    }
  ],
  "totalNetWorth": 1000.00
}
```

#### POST /api/onboarding/wallets
Add a new wallet after onboarding.

**Request:**
```json
{
  "type": "bank",
  "name": "Chase Bank",
  "currency": "EUR",
  "starting_balance": 20000.00
}
```

## Frontend Flow

### 1. User Login
- User logs in via OTP
- Redirected to dashboard

### 2. Onboarding Check
- `RequireOnboarding` component checks `/api/onboarding/status`
- If not completed → Redirect to `/onboarding`
- If completed → Show dashboard

### 3. Onboarding Steps

#### Step 1: Currency Selection
- Shows popular currencies (USD, EUR, GBP, etc.)
- Option to show all currencies with search
- User selects one

#### Step 2: First Wallet
- User selects wallet type (Cash, Bank, Credit Card, Savings)
- Optional: Custom wallet name
- Required: Starting balance
- Submit to complete

### 4. After Completion
- User redirected to dashboard
- All future protected routes check onboarding status

## Components

### RequireOnboarding.jsx
Wrapper component that checks onboarding status before rendering protected pages.

**Usage:**
```jsx
<Route 
  path="/dashboard" 
  element={
    <ProtectedRoute>
      <RequireOnboarding>
        <Dashboard />
      </RequireOnboarding>
    </ProtectedRoute>
  } 
/>
```

**Flow:**
1. Checks if user has token (via ProtectedRoute)
2. Fetches onboarding status
3. If not completed → Redirect to /onboarding
4. If completed → Render children

### Onboarding.jsx
Main onboarding page with 2-step wizard.

**Features:**
- Step indicator (PrimeReact Steps)
- Currency selection with search
- Wallet type selection
- Form validation
- Loading states
- Success/error toasts

## Currencies

Currencies are stored as **static data** in `frontend/src/data/currencies.js`.

**Why static?**
- Fast (no API call)
- Free (no cost)
- Reliable (always available)
- ISO 4217 codes rarely change

**Popular currencies:**
- USD, EUR, GBP, JPY, CHF, CAD, AUD, CNY, INR, BRL

**Total:** 60+ currencies available

**Helper functions:**
```javascript
import { getCurrencyByCode, formatCurrency } from '../data/currencies';

const currency = getCurrencyByCode('EUR');
// { code: 'EUR', name: 'Euro', symbol: '€', flag: '🇪🇺' }

const formatted = formatCurrency(1000, 'EUR');
// "€1,000.00"
```

## Migration

### Run Migration

```bash
cd backend
npm run db:migrate-onboarding
```

This will:
1. Add onboarding fields to `users` table
2. Create `wallets` table
3. Create indexes
4. Set up triggers

### Verify Migration

```bash
npm run db:view
```

Check that users table now has `base_currency`, `onboarding_completed` fields.

## Example Data Flow

### New User Journey

1. **User registers/logs in**
   ```
   POST /api/auth/request-login
   POST /api/auth/verify-otp
   → Token saved to localStorage
   ```

2. **User navigates to /dashboard**
   ```
   ProtectedRoute checks token ✅
   RequireOnboarding calls GET /api/onboarding/status
   → completed: false
   → Redirect to /onboarding
   ```

3. **User completes onboarding**
   ```
   Step 1: Select EUR
   Step 2: Add Cash wallet with €1,000
   POST /api/onboarding/complete
   → Updates users table
   → Creates wallet in wallets table
   ```

4. **User tries dashboard again**
   ```
   GET /api/onboarding/status
   → completed: true
   → Dashboard renders ✅
   ```

## Wallet Types Explained

### Cash 💵
- Physical money in pocket/wallet
- Starting balance: How much cash you have now
- Example: €500 in pocket

### Bank 🏦
- Checking/Current account
- Starting balance: Current account balance
- Example: Chase Bank - €20,000

### Credit Card 💳
- Credit card account
- **Can have negative balance** (debt)
- Starting balance: 
  - €0 if paid off
  - €-1,200 if you owe €1,200
- Example: Visa Card - €-500 (owes €500)

### Savings 💰
- Long-term savings account
- Starting balance: Total saved
- Example: Emergency Fund - €10,000

### Investment 📈
- Stocks, bonds, crypto
- Starting balance: Current portfolio value
- Example: Robinhood - $5,000

## Future Enhancements

### Phase 2:
- Multiple wallets during onboarding
- Category customization
- Budget goals

### Phase 3:
- Bank integration setup
- Recurring transactions setup
- Financial goals

## Testing

### Test Onboarding Flow

1. Register new user
2. Login and get token
3. Go to `/dashboard` → Should redirect to `/onboarding`
4. Complete onboarding with:
   - Currency: EUR
   - Wallet: Cash, €1000
5. Should redirect to `/dashboard`
6. Check database:
   ```sql
   SELECT * FROM users WHERE email = 'test@example.com';
   -- Should have base_currency = 'EUR', onboarding_completed = true
   
   SELECT * FROM wallets WHERE user_id = 1;
   -- Should have one cash wallet with €1000
   ```

### Test Skip Flow

1. Login as new user
2. Redirected to `/onboarding`
3. Click "Skip for now"
4. Should go to dashboard (but might have limited features)

## Troubleshooting

### Migration fails
- Check PostgreSQL is running
- Verify database connection in `.env`
- Check if tables already exist

### Onboarding status always false
- Check token is being sent in Authorization header
- Verify `/api/onboarding/status` endpoint is working
- Check database has `onboarding_completed` column

### Currencies not showing
- Check `frontend/src/data/currencies.js` exists
- Verify import path in Onboarding.jsx

### Wallet not created
- Check request payload matches backend validation
- Verify wallet type is valid
- Check starting_balance is a number (not string)

## Summary

**Essential Data:**
- Base currency (3-letter code)
- First wallet (type + starting balance)

**Flow:**
1. User logs in
2. Redirected to onboarding if not completed
3. Select currency → Add wallet → Complete
4. Redirected to dashboard

**Database:**
- `users.base_currency`, `users.onboarding_completed`
- `wallets` table with financial data

**Frontend:**
- 2-step wizard with validation
- Static currency list
- RequireOnboarding wrapper for protected routes
