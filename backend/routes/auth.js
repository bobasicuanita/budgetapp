/**
=========================================================
* Passwordless Authentication Routes
=========================================================

PUBLIC ROUTES:
POST /api/auth/request-login      // Request OTP and magic link via email
POST /api/auth/verify-otp         // Verify OTP code and login
GET  /api/auth/verify-magic-link  // Verify magic link token and login

PROTECTED ROUTES (require Bearer token):
POST /api/auth/logout             // Logout user (invalidates token)
GET  /api/auth/me                 // Get current user info

*/

import express from "express";
import sql from "../config/database.js";
import { isValidEmail, validationMessages } from "../utils/validation.js";
import { generateToken, verifyToken } from "../utils/jwt.js";
import { generateOTP, generateMagicLinkToken, getOTPExpiry, getMagicLinkExpiry, isExpired } from "../utils/otp.js";
import { sendOTPEmail, sendMagicLinkEmail, sendLoginNotification } from "../utils/emailPasswordless.js";
import { authenticateToken } from "../middleware/auth.js";
import { authLimiter, loginLimiter } from "../middleware/rateLimiter.js";

const router = express.Router();

// Request login - sends OTP and magic link
router.post("/request-login", loginLimiter, async (req, res) => {
  try {
    const { email } = req.body;
    
    // Validate email
    if (!email) {
      return res.status(400).json({ error: validationMessages.email.required });
    }
    
    if (!isValidEmail(email)) {
      return res.status(400).json({ error: validationMessages.email.invalid });
    }
    
    // Check if user exists, if not create a new user
    let [user] = await sql`
      SELECT id, email, name FROM users WHERE email = ${email.toLowerCase()}
    `;
    
    if (!user) {
      // Auto-create user on first login attempt
      [user] = await sql`
        INSERT INTO users (email)
        VALUES (${email.toLowerCase()})
        RETURNING id, email, name
      `;
    }
    
    // Generate OTP code
    const otpCode = generateOTP();
    const otpExpiry = getOTPExpiry(10); // 10 minutes
    
    // Save OTP to database
    await sql`
      INSERT INTO otp_codes (email, otp_code, expires_at)
      VALUES (${email.toLowerCase()}, ${otpCode}, ${otpExpiry})
    `;
    
    // Generate magic link token
    const magicLinkToken = generateMagicLinkToken();
    const magicLinkExpiry = getMagicLinkExpiry(15); // 15 minutes
    
    // Save magic link to database
    await sql`
      INSERT INTO magic_links (email, token, expires_at)
      VALUES (${email.toLowerCase()}, ${magicLinkToken}, ${magicLinkExpiry})
    `;
    
    // Send email with both OTP and magic link
    await sendOTPEmail(user.email, otpCode, user.name);
    await sendMagicLinkEmail(user.email, magicLinkToken, user.name);

    res.status(200).json({ 
      message: "Login code sent! Check your email for the OTP code and magic link.",
      email: user.email
    });
  } catch (error) {
    console.error("Request login error:", error);
    res.status(500).json({ error: "An error occurred while processing your request" });
  }
});

// Verify OTP and login
router.post("/verify-otp", loginLimiter, async (req, res) => {
  try {
    const { email, otp } = req.body;
    
    // Validate input
    if (!email) {
      return res.status(400).json({ error: validationMessages.email.required });
    }
    
    if (!otp) {
      return res.status(400).json({ error: "OTP code is required" });
    }
    
    if (!/^\d{6}$/.test(otp)) {
      return res.status(400).json({ error: "OTP must be a 6-digit code" });
    }
    
    // Find valid OTP
    const [otpRecord] = await sql`
      SELECT id, email, otp_code, expires_at, used
      FROM otp_codes 
      WHERE email = ${email.toLowerCase()} 
        AND otp_code = ${otp}
        AND used = false
      ORDER BY created_at DESC
      LIMIT 1
    `;
    
    if (!otpRecord) {
      return res.status(401).json({ error: "Invalid or expired OTP code" });
    }
    
    // Check if OTP is expired
    if (isExpired(otpRecord.expires_at)) {
      return res.status(401).json({ error: "OTP code has expired. Please request a new one." });
    }
    
    // Mark OTP as used
    await sql`
      UPDATE otp_codes 
      SET used = true 
      WHERE id = ${otpRecord.id}
    `;
    
    // Get or create user
    let [user] = await sql`
      SELECT id, email, name FROM users WHERE email = ${email.toLowerCase()}
    `;
    
    if (!user) {
      [user] = await sql`
        INSERT INTO users (email)
        VALUES (${email.toLowerCase()})
        RETURNING id, email, name
      `;
    }
    
    // Update last login
    await sql`
      UPDATE users 
      SET last_login_at = NOW()
      WHERE id = ${user.id}
    `;
    
    // Generate JWT token
    const token = generateToken(user.id, user.email);
    
    // Send login notification
    await sendLoginNotification(user.email, user.name);
    
    res.status(200).json({ 
      message: "Login successful",
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name
      }
    });
  } catch (error) {
    res.status(500).json({ error: "An error occurred during verification" });
  }
});

// Verify magic link and login
router.get("/verify-magic-link", authLimiter, async (req, res) => {
  try {
    const { token } = req.query;
    
    if (!token) {
      return res.status(400).json({ error: "Magic link token is required" });
    }
    
    // Find valid magic link
    const [linkRecord] = await sql`
      SELECT id, email, expires_at, used
      FROM magic_links 
      WHERE token = ${token}
        AND used = false
    `;
    
    if (!linkRecord) {
      return res.status(401).json({ error: "Invalid or expired magic link" });
    }
    
    // Check if magic link is expired
    if (isExpired(linkRecord.expires_at)) {
      return res.status(401).json({ error: "Magic link has expired. Please request a new one." });
    }
    
    // Mark magic link as used
    await sql`
      UPDATE magic_links 
      SET used = true 
      WHERE id = ${linkRecord.id}
    `;
    
    // Get or create user
    let [user] = await sql`
      SELECT id, email, name FROM users WHERE email = ${linkRecord.email}
    `;
    
    if (!user) {
      [user] = await sql`
        INSERT INTO users (email)
        VALUES (${linkRecord.email})
        RETURNING id, email, name
      `;
    }
    
    // Update last login
    await sql`
      UPDATE users 
      SET last_login_at = NOW()
      WHERE id = ${user.id}
    `;
    
    // Generate JWT token
    const jwtToken = generateToken(user.id, user.email);
    
    // Send login notification
    await sendLoginNotification(user.email, user.name);
    
    res.status(200).json({ 
      message: "Login successful",
      token: jwtToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name
      }
    });
  } catch (error) {
    console.error("Verify magic link error:", error);
    res.status(500).json({ error: "An error occurred during verification" });
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
    console.error("Logout error:", error);
    res.status(500).json({ error: "An error occurred during logout" });
  }
});

// Get current user route (requires authentication)
router.get("/me", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    
    // Fetch user from database
    const [user] = await sql`
      SELECT id, email, name, created_at, updated_at, last_login_at
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
        createdAt: user.created_at,
        updatedAt: user.updated_at,
        lastLoginAt: user.last_login_at
      }
    });
  } catch (error) {
    console.error("Get user error:", error);
    res.status(500).json({ error: "An error occurred while fetching user data" });
  }
});

export default router;
