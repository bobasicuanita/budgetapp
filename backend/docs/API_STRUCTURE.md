# API Structure & Authentication Flow

## Route Organization

The API is organized into **public** and **protected** sections:

### 📖 Public Routes (No Authentication Required)

Located **before** the `authenticateToken` middleware in `index.js`:

```
POST   /api/auth/register
POST   /api/auth/login
GET    /api/auth/verify-email
POST   /api/auth/resend-verification
POST   /api/auth/forgot-password
POST   /api/auth/reset-password
GET    /api/hello (test endpoint)
```

### 🔒 Protected Routes (Authentication Required)

Located **after** the `authenticateToken` middleware in `index.js`:

```
POST   /api/auth/logout
GET    /api/auth/me
GET    /api/protected (example)

Future routes (will be automatically protected):
GET    /api/budgets
POST   /api/budgets
GET    /api/transactions
POST   /api/transactions
... etc
```

## How It Works

### In `index.js`:

```javascript
// PUBLIC SECTION - No auth needed
app.use("/api/auth", authRoutes);

// THIS IS THE DIVIDING LINE
app.use(authenticateToken);  // ← Everything below requires auth

// PROTECTED SECTION - Auth required
app.use("/api/budgets", budgetRoutes);
app.use("/api/transactions", transactionRoutes);
```

### Authentication Flow:

```
1. User makes request to /api/budgets
   ↓
2. authenticateToken middleware intercepts
   ↓
3. Checks for Bearer token in Authorization header
   ↓
4. If NO token or INVALID token → 401 Error, STOP
   ↓
5. If VALID token → Adds req.user, continues to route handler
   ↓
6. Route handler accesses req.user.userId
```

## Making Authenticated Requests

### Frontend Example:

```javascript
// Store token after login
localStorage.setItem('token', loginResponse.token);

// Make authenticated request
const response = await fetch('/api/budgets', {
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('token')}`
  }
});
```

### cURL Example:

```bash
# 1. Login to get token
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Password123"}'

# Response: {"token": "eyJhbGc..."}

# 2. Use token for protected routes
curl http://localhost:5000/api/protected \
  -H "Authorization: Bearer eyJhbGc..."
```

## Testing Authentication

### Test Public Route (No Token Needed):
```bash
curl http://localhost:5000/api/hello
# ✅ Works without token
```

### Test Protected Route (Token Required):
```bash
# Without token - FAILS
curl http://localhost:5000/api/protected
# ❌ Response: {"error": "Access token required"}

# With token - WORKS
curl http://localhost:5000/api/protected \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
# ✅ Response: {"message": "This is a protected route!", "user": {...}}
```

## Adding New Routes

### For Public Routes:
Place **before** `app.use(authenticateToken)`:

```javascript
// Public routes
app.use("/api/auth", authRoutes);
app.use("/api/public", publicRoutes);  // ← Add here

// Authentication barrier
app.use(authenticateToken);
```

### For Protected Routes (Most Common):
Place **after** `app.use(authenticateToken)`:

```javascript
// Authentication barrier
app.use(authenticateToken);

// Protected routes (automatically require auth)
app.use("/api/budgets", budgetRoutes);
app.use("/api/transactions", transactionRoutes);  // ← Add here
app.use("/api/categories", categoryRoutes);       // ← Add here
```

## Security Benefits

✅ **Default Secure:** All new routes are protected by default  
✅ **Explicit Public:** Must consciously place routes before auth  
✅ **No Mistakes:** Can't forget to add auth middleware  
✅ **Clean Code:** Don't repeat `authenticateToken` on every route  
✅ **User Context:** `req.user` automatically available in all protected routes

## Example Protected Route Implementation

```javascript
// routes/budgets.js
import express from "express";
const router = express.Router();

// No need to add authenticateToken here - it's already applied!
router.get("/", async (req, res) => {
  const userId = req.user.userId;  // Available from middleware!
  
  const budgets = await sql`
    SELECT * FROM budgets WHERE user_id = ${userId}
  `;
  
  res.json({ budgets });
});

export default router;
```

## Common Patterns

### Access User Info in Protected Routes:
```javascript
const userId = req.user.userId;
const userEmail = req.user.email;
```

### Optional Authentication (Advanced):
Use `optionalAuth` middleware for routes that work with or without auth:

```javascript
import { optionalAuth } from "./middleware/auth.js";

router.get("/public-content", optionalAuth, async (req, res) => {
  if (req.user) {
    // User is logged in - show personalized content
  } else {
    // User is not logged in - show generic content
  }
});
```
