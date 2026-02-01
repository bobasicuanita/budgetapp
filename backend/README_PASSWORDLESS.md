# Budget App Backend - Passwordless Authentication

## 🎉 What Changed

Your authentication system has been upgraded to **passwordless authentication**!

### ❌ Removed Features:
- Password-based registration
- Password hashing with bcrypt
- Email verification tokens
- Password reset functionality
- Forgot password flow

### ✅ New Features:
- **OTP Codes** - 6-digit codes sent via email (10 min expiry)
- **Magic Links** - One-click login links (15 min expiry)
- **Auto-Registration** - Users created automatically on first login
- **Login Notifications** - Email sent after successful login
- **Simpler Flow** - No signup forms, just email!

---

## 🚀 Quick Start

### 1. Run Migration

**⚠️ IMPORTANT:** This will modify your database structure!

```bash
npm run db:migrate-passwordless
```

### 2. Start Server

```bash
npm run dev
```

### 3. Test Login Flow

```bash
# Request login
curl -X POST http://localhost:5000/api/auth/request-login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'

# Check console for OTP code

# Verify OTP
curl -X POST http://localhost:5000/api/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","otp":"123456"}'
```

---

## 📋 API Endpoints

### Request Login
**POST** `/api/auth/request-login`

```json
{
  "email": "user@example.com"
}
```

### Verify OTP
**POST** `/api/auth/verify-otp`

```json
{
  "email": "user@example.com",
  "otp": "123456"
}
```

### Verify Magic Link
**GET** `/api/auth/verify-magic-link?token=abc123...`

### Logout (Protected)
**POST** `/api/auth/logout`
- Requires: `Authorization: Bearer TOKEN`

### Get User (Protected)
**GET** `/api/auth/me`
- Requires: `Authorization: Bearer TOKEN`

---

## 🔄 User Flow

### First-Time User:
```
1. Enter email → System creates account automatically
2. Receive OTP + magic link
3. Verify with either method
4. Logged in! 🎉
```

### Returning User:
```
1. Enter email
2. Receive OTP + magic link
3. Verify with either method
4. Logged in! 🎉
```

**No separate registration needed!**

---

## 📧 Email Templates

### OTP Email
```
Subject: Your login code

Hi there,

Your login code is: 123456

This code will expire in 10 minutes.
```

### Magic Link Email
```
Subject: Sign in to Budget App

Hi there,

Click the link below to sign in:
http://localhost:5173/auth/verify?token=abc123...

This link will expire in 15 minutes.
```

### Login Notification
```
Subject: New login to your account

Hi User,

A new login to your Budget App account was detected.
Time: 1/28/2026, 10:30:00 AM

If this wasn't you, please contact support.
```

---

## 🔒 Security Features

✅ **Rate Limiting** - 5 login attempts per 15 minutes  
✅ **OTP Expiry** - Codes expire after 10 minutes  
✅ **Magic Link Expiry** - Links expire after 15 minutes  
✅ **One-Time Use** - Each OTP/link can only be used once  
✅ **Token Blacklisting** - Logout invalidates JWT tokens  
✅ **Login Notifications** - Users notified of new logins  

---

## 🗄️ Database Tables

### Users
- `id`, `email`, `name`, `created_at`, `updated_at`, `last_login_at`
- **No password field!**

### OTP Codes
- `id`, `email`, `otp_code`, `expires_at`, `created_at`, `used`

### Magic Links
- `id`, `email`, `token`, `expires_at`, `created_at`, `used`

### Blacklisted Tokens
- `id`, `token`, `user_id`, `blacklisted_at`, `expires_at`

---

## 🛠️ Maintenance

### Cleanup Expired Codes

```bash
npm run db:cleanup
```

Removes:
- Expired OTP codes
- Expired magic links
- Expired blacklisted tokens

---

## 📦 Dependencies Still Needed

- ✅ `express` - Web framework
- ✅ `postgres` - Database
- ✅ `jsonwebtoken` - JWT tokens
- ✅ `express-rate-limit` - Rate limiting
- ✅ `dotenv` - Environment variables
- ✅ `cors` - CORS handling

### Can Remove (Optional):
- ❌ `bcrypt` - No longer needed (no passwords)

---

## 🎯 Benefits of Passwordless

### For Users:
- ✅ No passwords to remember
- ✅ No password reset hassles
- ✅ Faster login process
- ✅ More secure (no password reuse)
- ✅ Works on any device

### For Developers:
- ✅ Simpler codebase
- ✅ Less security vulnerabilities
- ✅ No password hashing overhead
- ✅ Better user experience
- ✅ Modern authentication

---

## 🔧 Configuration

### Environment Variables (.env)

```env
PORT=5000
FRONTEND_URL=http://localhost:5173

DB_HOST=localhost
DB_PORT=5432
DB_NAME=budgetapp
DB_USER=postgres
DB_PASSWORD=admin123

JWT_SECRET=budget_app_super_secret_key_change_in_production_2026
JWT_EXPIRES_IN=7d
```

---

## 📚 File Structure

```
backend/
├── routes/
│   ├── authPasswordless.js      ← NEW: Passwordless auth routes
│   └── auth.js                  ← OLD: Keep as backup
├── utils/
│   ├── otp.js                   ← NEW: OTP and magic link generation
│   ├── emailPasswordless.js     ← NEW: Email templates
│   ├── jwt.js                   ← KEEP: JWT utilities
│   └── validation.js            ← KEEP: Email validation
├── middleware/
│   ├── auth.js                  ← KEEP: JWT middleware
│   └── rateLimiter.js           ← KEEP: Rate limiting
├── database/
│   ├── setup_passwordless.sql   ← NEW: Database schema
│   └── migrate_to_passwordless.js ← NEW: Migration script
└── scripts/
    └── cleanupOTP.js            ← NEW: Cleanup script
```

---

## 🎉 You're Ready!

Run the migration and your backend will be running passwordless authentication! 🚀

See `PASSWORDLESS_AUTH.md` for complete documentation.
