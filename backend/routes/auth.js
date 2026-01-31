/**
=========================================================
* Authentication Routes
=========================================================

PUBLIC ROUTES:
POST /api/auth/register              // Register new user (sends verification email)
POST /api/auth/login                 // Login user (requires verified email)
GET  /api/auth/verify-email          // Verify email with token
POST /api/auth/resend-verification   // Resend verification email
POST /api/auth/forgot-password       // Request password reset
POST /api/auth/reset-password        // Reset password with token

PROTECTED ROUTES (require Bearer token):
POST /api/auth/logout                // Logout user (invalidates token)
GET  /api/auth/me                    // Get current user info

*/


import express from "express";
import bcrypt from "bcrypt";
import sql from "../config/database.js";
import { isValidEmail, isValidPassword, isValidName, validationMessages } from "../utils/validation.js";
import { generateToken, verifyToken } from "../utils/jwt.js";
import { generateVerificationToken, generateResetToken, getTokenExpiry, isTokenExpired } from "../utils/tokens.js";
import { sendVerificationEmail, sendPasswordResetEmail } from "../utils/email.js";
import { authenticateToken } from "../middleware/auth.js";
import { 
  authLimiter,
  loginLimiter, 
  registerLimiter, 
  passwordResetLimiter,
  resendVerificationLimiter 
} from "../middleware/rateLimiter.js";

const router = express.Router();

// Register route
router.post("/register", registerLimiter, async (req, res) => {
  try {
    const { email, password, name } = req.body;
    
    // Validation
    if (!email) {
      return res.status(400).json({ error: validationMessages.email.required });
    }
    if (!isValidEmail(email)) {
      return res.status(400).json({ error: validationMessages.email.invalid });
    }
    
    if (!password) {
      return res.status(400).json({ error: validationMessages.password.required });
    }
    if (!isValidPassword(password)) {
      return res.status(400).json({ error: validationMessages.password.invalid });
    }
    
    if (!name) {
      return res.status(400).json({ error: validationMessages.name.required });
    }
    if (!isValidName(name)) {
      return res.status(400).json({ error: validationMessages.name.invalid });
    }
    
    // Check if user already exists
    const existingUser = await sql`
      SELECT id FROM users WHERE email = ${email.toLowerCase()}
    `;
    
    if (existingUser.length > 0) {
      return res.status(409).json({ error: "User with this email already exists" });
    }
    
    // Hash password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    
    // Generate verification token
    const verificationToken = generateVerificationToken();
    const tokenExpiry = getTokenExpiry(24); // 24 hours
    
    // Save user to database with verification token
    const [newUser] = await sql`
      INSERT INTO users (email, password, name, email_verified, verification_token, verification_token_expires)
      VALUES (${email.toLowerCase()}, ${hashedPassword}, ${name.trim()}, false, ${verificationToken}, ${tokenExpiry})
      RETURNING id, email, name, email_verified, created_at
    `;
    
    // Send verification email
    await sendVerificationEmail(newUser.email, verificationToken, newUser.name);
    
    res.status(201).json({ 
      message: "User registered successfully. Please check your email to verify your account.",
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        emailVerified: newUser.email_verified,
        createdAt: newUser.created_at
      }
    });
  } catch (error) {
    res.status(500).json({ error: "An error occurred during registration" });
  }
});

// Login route
router.post("/login", loginLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Validate input
    if (!email) {
      return res.status(400).json({ error: validationMessages.email.required });
    }
    if (!isValidEmail(email)) {
      return res.status(400).json({ error: validationMessages.email.invalid });
    }
    
    if (!password) {  
      return res.status(400).json({ error: validationMessages.password.required });
    }
    
    // Find user by email
    const users = await sql`
      SELECT id, email, password, name, email_verified, created_at 
      FROM users 
      WHERE email = ${email.toLowerCase()}
    `;
    
    const user = users[0];
    
    if (!user) {
      return res.status(401).json({ error: "Invalid email or password" });
    }
    
    // Check if email is verified
    if (!user.email_verified) {
      return res.status(403).json({ 
        error: "Please verify your email before logging in. Check your inbox for the verification link." 
      });
    }
    
    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    
    if (!isPasswordValid) {
      return res.status(401).json({ error: "Invalid email or password" });
    }
    
    // Generate JWT token
    const token = generateToken(user.id, user.email);
    
    // Return success with token and user info (without password)
    res.status(200).json({ 
      message: "Login successful",
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        createdAt: user.created_at
      }
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "An error occurred during login" });
  }
});

// Verify email route
router.get("/verify-email", authLimiter, async (req, res) => {
  try {
    const { token } = req.query;
    
    if (!token) {
      return res.status(400).json({ error: "Verification token is required" });
    }
    
    // Find user with this verification token
    const [user] = await sql`
      SELECT id, email, name, verification_token_expires
      FROM users 
      WHERE verification_token = ${token}
    `;
    
    if (!user) {
      return res.status(400).json({ error: "Invalid verification token" });
    }
    
    // Check if token is expired
    if (isTokenExpired(user.verification_token_expires)) {
      return res.status(400).json({ error: "Verification token has expired. Please request a new one." });
    }
    
    // Update user as verified and clear token
    await sql`
      UPDATE users 
      SET email_verified = true,
          verification_token = NULL,
          verification_token_expires = NULL
      WHERE id = ${user.id}
    `;
    
    res.status(200).json({ 
      message: "Email verified successfully! You can now log in.",
      user: {
        email: user.email,
        name: user.name
      }
    });
  } catch (error) {
    console.error("Email verification error:", error);
    res.status(500).json({ error: "An error occurred during email verification" });
  }
});

// Resend verification email route
router.post("/resend-verification", resendVerificationLimiter, async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: validationMessages.email.required });
    }
    
    if (!isValidEmail(email)) {
      return res.status(400).json({ error: validationMessages.email.invalid });
    }
    
    // Find user
    const [user] = await sql`
      SELECT id, email, name, email_verified
      FROM users 
      WHERE email = ${email.toLowerCase()}
    `;
    
    if (!user) {
      // Don't reveal if user exists or not for security
      return res.status(200).json({ 
        message: "If an account with that email exists and is unverified, a verification email has been sent." 
      });
    }
    
    // Check if already verified
    if (user.email_verified) {
      return res.status(400).json({ error: "Email is already verified" });
    }
    
    // Generate new verification token
    const verificationToken = generateVerificationToken();
    const tokenExpiry = getTokenExpiry(24);
    
    // Update user with new token
    await sql`
      UPDATE users 
      SET verification_token = ${verificationToken},
          verification_token_expires = ${tokenExpiry}
      WHERE id = ${user.id}
    `;
    
    // Send verification email
    await sendVerificationEmail(user.email, verificationToken, user.name);
    
    res.status(200).json({ 
      message: "Verification email sent. Please check your inbox." 
    });
  } catch (error) {
    console.error("Resend verification error:", error);
    res.status(500).json({ error: "An error occurred while sending verification email" });
  }
});

// Logout route (requires authentication)
router.post("/logout", authenticateToken, async (req, res) => {
  try {
    const token = req.token;
    const userId = req.user.userId;
    
    // Decode token to get expiration
    const decoded = verifyToken(token);
    
    if (!decoded) {
      return res.status(400).json({ error: "Invalid token" });
    }
    
    // Convert JWT exp (seconds since epoch) to timestamp
    const expiresAt = new Date(decoded.exp * 1000);
    
    // Add token to blacklist
    await sql`
      INSERT INTO blacklisted_tokens (token, user_id, expires_at)
      VALUES (${token}, ${userId}, ${expiresAt})
      ON CONFLICT (token) DO NOTHING
    `;
    
    res.status(200).json({ 
      message: "Logout successful. Token has been invalidated." 
    });
  } catch (error) {
    res.status(500).json({ error: "An error occurred during logout" });
  }
});

// Forgot password route
router.post("/forgot-password", passwordResetLimiter, async (req, res) => {
  try {
    const { email } = req.body;
    
    // Validate email
    if (!email) {
      return res.status(400).json({ error: validationMessages.email.required });
    }
    
    if (!isValidEmail(email)) {
      return res.status(400).json({ error: validationMessages.email.invalid });
    }
    
    // Check if user exists in database
    const [user] = await sql`
      SELECT id, email, name
      FROM users 
      WHERE email = ${email.toLowerCase()}
    `;
    
    // Don't reveal if user exists or not for security reasons
    if (!user) {
      return res.status(200).json({ 
        message: "If an account with that email exists, a password reset link has been sent." 
      });
    }
    
    // Generate password reset token
    const resetToken = generateResetToken();
    const tokenExpiry = getTokenExpiry(1); // 1 hour expiry for password reset
    
    // Save token with expiry to database
    await sql`
      UPDATE users 
      SET reset_password_token = ${resetToken},
          reset_password_expires = ${tokenExpiry}
      WHERE id = ${user.id}
    `;
    
    // Send password reset email with token link
    await sendPasswordResetEmail(user.email, resetToken, user.name);
    
    res.status(200).json({ 
      message: "If an account with that email exists, a password reset link has been sent." 
    });
  } catch (error) {
    res.status(500).json({ error: "An error occurred while processing your request" });
  }
});

// Reset password route
router.post("/reset-password", passwordResetLimiter, async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    
    // Validate token
    if (!token) {
      return res.status(400).json({ error: "Reset token is required" });
    }
    
    // Validate new password
    if (!newPassword) {
      return res.status(400).json({ error: validationMessages.password.required });
    }
    
    if (!isValidPassword(newPassword)) {
      return res.status(400).json({ error: validationMessages.password.invalid });
    }
    
    // Find user with this reset token
    const [user] = await sql`
      SELECT id, email, name, reset_password_expires
      FROM users 
      WHERE reset_password_token = ${token}
    `;
    
    if (!user) {
      return res.status(400).json({ error: "Invalid or expired reset token" });
    }
    
    // Check if token is expired
    if (isTokenExpired(user.reset_password_expires)) {
      return res.status(400).json({ error: "Reset token has expired. Please request a new one." });
    }
    
    // Hash new password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);
    
    // Update user password in database and delete/invalidate the reset token
    await sql`
      UPDATE users 
      SET password = ${hashedPassword},
          reset_password_token = NULL,
          reset_password_expires = NULL
      WHERE id = ${user.id}
    `;
    
    res.status(200).json({ 
      message: "Password reset successful. You can now log in with your new password." 
    });
  } catch (error) {
    res.status(500).json({ error: "An error occurred while resetting your password" });
  }
});

// Get current user route (requires authentication)
router.get("/me", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    
    // Fetch user from database
    const [user] = await sql`
      SELECT id, email, name, email_verified, created_at, updated_at
      FROM users 
      WHERE id = ${userId}
    `;
    
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    
    res.status(200).json({ 
      user: { 
        id: user.id,
        email: user.email,
        name: user.name,
        emailVerified: user.email_verified,
        createdAt: user.created_at,
        updatedAt: user.updated_at
      }
    });
  } catch (error) {
    console.error("Get user error:", error);
    res.status(500).json({ error: "An error occurred while fetching user data" });
  }
});

export default router;
