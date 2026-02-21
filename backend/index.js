import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import authRoutes from "./routes/auth.js";
import onboardingRoutes from "./routes/onboarding.js";
import walletRoutes from "./routes/wallets.js";
import referenceDataRoutes from "./routes/referenceData.js";
import transactionRoutes from "./routes/transactions.js";
import exchangeRateRoutes from "./routes/exchangeRates.js";
import { authenticateToken } from "./middleware/auth.js";
import { scheduleExchangeRateFetch } from "./jobs/exchangeRateCron.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middlewares
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true // Allow cookies to be sent
}));
app.use(express.json());
app.use(cookieParser());

// ===== PUBLIC ROUTES (No authentication required) =====
app.use("/api/auth", authRoutes);

// Public test route
app.get("/api/hello", (req, res) => {
  res.json({ message: "Hello from backend!" });
});

// ===== PROTECTED ROUTES (Authentication required) =====
// All routes defined after this middleware require authentication
app.use(authenticateToken);

// Onboarding routes (protected)
app.use("/api/onboarding", onboardingRoutes);

// Wallet routes (protected)
app.use("/api/wallets", walletRoutes);

// User reference data (categories and tags)
app.use("/api/user", referenceDataRoutes);

// Transaction routes (protected)
app.use("/api/transactions", transactionRoutes);

// Exchange rate routes (protected)
app.use("/api/exchange-rates", exchangeRateRoutes);

// Example protected route
app.get("/api/protected", (req, res) => {
  res.json({ 
    message: "This is a protected route!",
    user: req.user  // Available because of authenticateToken middleware
  });
});

// Future protected routes go here:
// app.use("/api/budgets", budgetRoutes);       // Will require auth

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  
  // Start exchange rate cron job
  scheduleExchangeRateFetch();
});