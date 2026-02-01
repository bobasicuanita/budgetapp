# Passwordless Authentication System

## 🔐 Overview

Your app now uses **passwordless authentication** with two methods:
1. **OTP (One-Time Password)** - 6-digit code sent via email
2. **Magic Link** - Direct login link sent via email

No passwords needed! 🎉

---

## 🚀 Migration Steps

### 1. Run the Migration

```bash
npm run db:migrate-passwordless
```

This will:
- ✅ Remove password column from users table
- ✅ Remove all email verification columns
- ✅ Remove password reset columns
- ✅ Create otp_codes table
- ✅ Create magic_links table
- ✅ Keep blacklisted_tokens table for logout

### 2. Restart Your Server

```bash
npm run dev
```

---

## 📋 API Endpoints

### PUBLIC ROUTES

#### 1. Request Login (Email Entry)
```bash
POST /api/auth/request-login

Body:
{
  "email": "user@example.com"
}

Response:
{
  "message": "Login code sent! Check your email for the OTP code and magic link.",
  "email": "user@example.com"
}
```

**What it does:**
- Creates user if doesn't exist (auto-registration)
- Generates 6-digit OTP code (expires in 10 minutes)
- Generates magic link token (expires in 15 minutes)
- Sends both via email

#### 2. Verify OTP
```bash
POST /api/auth/verify-otp

Body:
{
  "email": "user@example.com",
  "otp": "123456"
}

Response:
{
  "message": "Login successful",
  "token": "eyJhbGc...",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "name": null
  }
}
```

#### 3. Verify Magic Link
```bash
GET /api/auth/verify-magic-link?token=abc123...

Response:
{
  "message": "Login successful",
  "token": "eyJhbGc...",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "name": null
  }
}
```

### PROTECTED ROUTES (Require Bearer Token)

#### 4. Logout
```bash
POST /api/auth/logout
Authorization: Bearer YOUR_TOKEN

Response:
{
  "message": "Logout successful. Token has been invalidated."
}
```

#### 5. Get Current User
```bash
GET /api/auth/me
Authorization: Bearer YOUR_TOKEN

Response:
{
  "user": {
    "id": 1,
    "email": "user@example.com",
    "name": null,
    "createdAt": "2026-01-28T...",
    "updatedAt": "2026-01-28T...",
    "lastLoginAt": "2026-01-28T..."
  }
}
```

---

## 🔄 Login Flow

### Frontend Flow:

```
1. User enters email
   ↓
2. POST /api/auth/request-login
   ↓
3. User receives email with:
   - 6-digit OTP code
   - Magic link
   ↓
4a. User enters OTP → POST /api/auth/verify-otp → JWT token
4b. User clicks link → GET /api/auth/verify-magic-link → JWT token
   ↓
5. Save token to localStorage
   ↓
6. Redirect to dashboard
```

---

## 📊 Database Schema

### Users Table
```sql
id               SERIAL PRIMARY KEY
email            VARCHAR(255) UNIQUE NOT NULL
name             VARCHAR(100)  -- Optional
created_at       TIMESTAMP
updated_at       TIMESTAMP
last_login_at    TIMESTAMP
```

### OTP Codes Table
```sql
id          SERIAL PRIMARY KEY
email       VARCHAR(255) NOT NULL
otp_code    VARCHAR(6) NOT NULL
expires_at  TIMESTAMP NOT NULL
created_at  TIMESTAMP
used        BOOLEAN DEFAULT FALSE
```

### Magic Links Table
```sql
id          SERIAL PRIMARY KEY
email       VARCHAR(255) NOT NULL
token       VARCHAR(255) UNIQUE NOT NULL
expires_at  TIMESTAMP NOT NULL
created_at  TIMESTAMP
used        BOOLEAN DEFAULT FALSE
```

---

## 🔒 Security Features

✅ **Auto-Registration** - Users created on first login attempt  
✅ **One-Time Use** - OTP codes and magic links can only be used once  
✅ **Expiration** - OTP (10 min), Magic links (15 min)  
✅ **Rate Limiting** - Prevents brute force attacks  
✅ **JWT Tokens** - Still using JWT for authenticated sessions  
✅ **Token Blacklisting** - Logout still invalidates tokens  
✅ **Login Notifications** - Email sent when user logs in  

---

## 📧 Email Console Output

After requesting login, check your terminal:

```
=== OTP CODE EMAIL ===
To: user@example.com
Subject: Your login code

Hi there,

Your login code is: 123456

This code will expire in 10 minutes.
======================

=== MAGIC LINK EMAIL ===
To: user@example.com
Subject: Sign in to Budget App

Hi there,

Click the link below to sign in to your account:

http://localhost:5173/auth/verify?token=abc123...

This link will expire in 15 minutes.
========================
```

---

## 🧪 Testing the Flow

### Test OTP Login:

```bash
# 1. Request login
curl -X POST http://localhost:5000/api/auth/request-login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'

# 2. Check console for OTP code (e.g., 123456)

# 3. Verify OTP
curl -X POST http://localhost:5000/api/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","otp":"123456"}'

# Response includes JWT token
```

### Test Magic Link:

```bash
# 1. Request login (same as above)

# 2. Check console for magic link token

# 3. Visit the magic link
curl "http://localhost:5000/api/auth/verify-magic-link?token=YOUR_TOKEN"

# Response includes JWT token
```

---

## 🎯 What Was Removed

❌ Password hashing (bcrypt)  
❌ Registration endpoint  
❌ Email verification  
❌ Password reset  
❌ Forgot password  
❌ Password validation  

## 🎉 What You Have Now

✅ Simple email-only login  
✅ OTP codes (6 digits)  
✅ Magic links (instant login)  
✅ Auto-registration (no signup form needed)  
✅ Cleaner, simpler authentication  
✅ Better user experience  

---

## 📝 Next Steps for Frontend

1. Update login page to only ask for email
2. Create OTP verification page
3. Create magic link verification page
4. Handle token storage and redirects

The backend is ready for passwordless authentication! 🚀
