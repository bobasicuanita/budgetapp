# Budget App Backend

## Setup Instructions

### 1. Install Dependencies

First, install bcrypt (required for password hashing):

```bash
npm install bcrypt
```

### 2. Configure Database

1. Create a `.env` file in the backend directory (copy from `.env.example`):

```bash
cp .env.example .env
```

2. Update the `.env` file with your PostgreSQL credentials:

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=budgetapp
DB_USER=postgres
DB_PASSWORD=your_password
```

### 3. Create Database

Create the PostgreSQL database:

```bash
psql -U postgres
CREATE DATABASE budgetapp;
\q
```

### 4. Initialize Database Tables

Run the initialization script to create the users table:

```bash
npm run db:init
```

### 5. Start the Server

```bash
npm run dev
```

## API Endpoints

### Public Routes (No Authentication Required)

- **POST** `/api/auth/register` - Register a new user
- **POST** `/api/auth/login` - Login user
- **GET** `/api/auth/verify-email` - Verify email with token
- **POST** `/api/auth/resend-verification` - Resend verification email
- **POST** `/api/auth/forgot-password` - Request password reset
- **POST** `/api/auth/reset-password` - Reset password with token

### Protected Routes (Require Bearer Token)

- **POST** `/api/auth/logout` - Logout user
- **GET** `/api/auth/me` - Get current user info
- **GET** `/api/protected` - Example protected route

**Note:** All future routes (budgets, transactions, etc.) are automatically protected. See `docs/API_STRUCTURE.md` for details.

### Register Example

```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "Password123",
    "name": "John Doe"
  }'
```

## Password Requirements

- Minimum 8 characters
- At least 1 uppercase letter
- At least 1 lowercase letter
- At least 1 number

## Security Features

- **Password Hashing:** bcrypt with 10 salt rounds
- **JWT Tokens:** 7-day expiration
- **Token Blacklisting:** Tokens invalidated on logout
- **Email Verification:** Required before login
- **Rate Limiting:** Protects against brute force attacks
  - Login: 5 attempts per 15 minutes
  - Registration: 3 per hour
  - Password reset: 3 per hour
  - See `docs/RATE_LIMITING.md` for details

## Project Structure

```
backend/
├── config/
│   └── database.js         # Database connection
├── database/
│   ├── setup.sql          # SQL table definitions
│   └── init.js            # Database initialization script
├── routes/
│   └── auth.js            # Authentication routes
├── utils/
│   └── validation.js      # Input validation helpers
├── .env                   # Environment variables (create this)
├── .env.example           # Example environment variables
├── index.js               # Main server file
└── package.json
```
