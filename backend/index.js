import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import authRoutes from "./routes/auth.js";
import { authenticateToken } from "./middleware/auth.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middlewares
app.use(cors());
app.use(express.json());

// ===== PUBLIC ROUTES (No authentication required) =====
app.use("/api/auth", authRoutes);

// Public test route
app.get("/api/hello", (req, res) => {
  res.json({ message: "Hello from backend!" });
});

// ===== PROTECTED ROUTES (Authentication required) =====
// All routes defined after this middleware require authentication
app.use(authenticateToken);

// Example protected route
app.get("/api/protected", (req, res) => {
  res.json({ 
    message: "This is a protected route!",
    user: req.user  // Available because of authenticateToken middleware
  });
});

// Future protected routes go here:
// app.use("/api/budgets", budgetRoutes);       // Will require auth
// app.use("/api/transactions", transactionRoutes);  // Will require auth
// app.use("/api/categories", categoryRoutes);  // Will require auth

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});