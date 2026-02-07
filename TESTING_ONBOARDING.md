# Testing Onboarding Implementation

## 🧪 Complete Testing Flow

### Step 1: Complete Onboarding in Browser

1. **Start the servers:**
   ```bash
   # Terminal 1 - Backend
   cd backend
   npm run dev

   # Terminal 2 - Frontend
   cd frontend
   npm run dev
   ```

2. **Go through the flow:**
   - Navigate to `http://localhost:5173`
   - Enter your email (e.g., `test@example.com`)
   - Check "Remember me for 30 days" ✓
   - Enter the OTP from your email
   - **Step 1 - Name:**
     - Try leaving both fields empty (optional)
     - Or enter first/last name
     - Click "Continue"
   - **Step 2 - Currency:**
     - Select a currency (e.g., USD)
     - Click "Continue"
   - **Step 3 - Wallet:**
     - Select wallet type (e.g., Cash)
     - Leave name empty to test auto-generation
     - Enter starting balance or leave empty (defaults to 0)
     - Click "Start"

3. **Check if it redirects to Dashboard**

---

### Step 2: Verify Data in Database

Run this script with your email:

```bash
cd backend
node scripts/checkUserData.js test@example.com
```

**Expected Output:**

```
🔍 Checking data for: test@example.com

👤 User Information:
   Email: test@example.com
   Name: John Doe (or "(not set)" if skipped)
   Base Currency: USD
   Onboarding: ✅ Completed
   Completed At: 1/28/2026, 11:30:45 PM
   Created: 1/28/2026, 11:25:12 PM
   Last Login: 1/28/2026, 11:30:30 PM

💰 Wallets:
   1. ✅ Cash Wallet 1
      Type: cash
      Currency: USD
      Starting Balance: 1000 (or 0 if empty)
      Current Balance: 1000
      Icon: 💵 | Color: green
      Created: 1/28/2026, 11:30:45 PM

   💵 Total Balance: 1000.00 USD

🔑 Refresh Tokens:
   1. ✅ Active
      Created: 1/28/2026, 11:30:30 PM
      Expires: 2/27/2026, 11:30:30 PM (30 days)
      Device: Mozilla/5.0...

✅ Check completed!
```

---

### Step 3: Test Different Scenarios

#### Test 1: Empty Names (Optional Fields)

1. Complete onboarding **without** entering first/last name
2. Run check script:
   ```bash
   node scripts/checkUserData.js your@email.com
   ```
3. **Expected:** `Name: (not set)` ✅

#### Test 2: Custom Wallet Name

1. Create wallet with custom name (e.g., "My Savings")
2. Check database
3. **Expected:** Wallet name = "My Savings" (not generated) ✅

#### Test 3: Empty Wallet Name (Auto-Generation)

1. Create wallet **without** name
2. Check database
3. **Expected:** `Cash Wallet 1`, `Bank Account 1`, etc. ✅

#### Test 4: Multiple Wallets of Same Type

1. **Onboarding:** Create first cash wallet (no name) → Should be "Cash Wallet 1"
2. **Later:** Create second cash wallet (no name) → Should be "Cash Wallet 2"
3. **Later:** Create third cash wallet (custom "Emergency Fund")
4. **Later:** Create fourth cash wallet (no name) → Should be "Cash Wallet 4"

Run after each wallet creation:
```bash
node scripts/checkUserData.js your@email.com
```

#### Test 5: Multiple Wallet Types

1. Create cash wallet (no name) → "Cash Wallet 1"
2. Create bank wallet (no name) → "Bank Account 1" (starts at 1, independent)
3. Create another cash (no name) → "Cash Wallet 2"
4. Create another bank (no name) → "Bank Account 2"

**Expected:** Each type has its own counter ✅

#### Test 6: Starting Balance Default to 0

1. Create wallet without entering starting balance
2. Check database
3. **Expected:** `starting_balance: 0` and `current_balance: 0` ✅

---

### Step 4: Test Browser State

After completing onboarding, check browser (F12):

**Application → Local Storage:**
- ✅ `accessToken` - JWT string
- ✅ `user` - JSON with id, email, name

**Application → Cookies:**
- ✅ `refreshToken` - HttpOnly cookie
- ✅ Expires in ~30 days (if "Remember me" was checked)

---

### Step 5: Test Protected Routes

1. After onboarding completes → Should redirect to `/dashboard`
2. If you navigate to `/onboarding` again → Should stay on dashboard (redirect)
3. Logout → Should clear tokens and redirect to `/login`

---

## 🐛 Common Issues & Solutions

### ❌ Data not saved

**Check:**
```bash
node scripts/checkUserData.js your@email.com
```

**If empty:** Check backend console for errors

### ❌ Name shows as null

**Cause:** Both first_name and last_name empty → name = null
**Expected:** This is correct! Name is optional

### ❌ Wallet name doesn't increment

**Check:** Are you using the same wallet type?
```bash
node scripts/testWalletNaming.js
```

### ❌ Starting balance is NULL instead of 0

**Cause:** Backend not using `??` operator
**Fix:** Already implemented with `wallet.starting_balance ?? 0`

---

## 📊 Quick Database Queries

### Check all users:
```bash
node scripts/checkUserData.js
```

### Check specific user:
```bash
node scripts/checkUserData.js test@example.com
```

### Test wallet naming for current user:
```bash
node scripts/testWalletNaming.js
```

### Check refresh tokens:
```bash
node scripts/checkRefreshTokens.js
```

---

## ✅ Complete Test Checklist

After completing onboarding:

**User Table:**
- [ ] Email saved correctly
- [ ] Name saved (or NULL if skipped)
- [ ] base_currency saved (3-letter code)
- [ ] onboarding_completed = TRUE
- [ ] onboarding_completed_at has timestamp

**Wallets Table:**
- [ ] Wallet created with correct type
- [ ] Name generated correctly (or custom name used)
- [ ] starting_balance = entered value (or 0)
- [ ] current_balance = starting_balance
- [ ] Currency matches base_currency
- [ ] Icon and color assigned

**Refresh Tokens Table:**
- [ ] Token created for user
- [ ] Expires in 30 days (if remember me)
- [ ] Device info stored
- [ ] Not revoked

**Browser:**
- [ ] Redirected to /dashboard
- [ ] accessToken in localStorage
- [ ] user object in localStorage
- [ ] refreshToken cookie present
