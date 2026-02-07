/**
=========================================================
* Passwordless Authentication Routes (OTP Only)
=========================================================

PUBLIC ROUTES:
POST /api/auth/request-login      // Request OTP via email (initial login)
POST /api/auth/resend-otp         // Resend OTP code
POST /api/auth/verify-otp         // Verify OTP code and login

PROTECTED ROUTES (require Bearer token):
POST /api/auth/logout             // Logout user (invalidates token)
GET  /api/auth/me                 // Get current user info

*/

import express from "express";
import sql from "../config/database.js";
import { isValidEmail, validationMessages } from "../utils/validation.js";
import { 
  generateAccessToken, 
  generateRefreshToken, 
  getRefreshTokenExpiry,
  verifyToken 
} from "../utils/jwt.js";
import { generateOTP, getOTPExpiry, isExpired } from "../utils/otp.js";
import { sendOTPEmail, sendLoginNotification } from "../utils/emailPasswordless.js";
import { authenticateToken } from "../middleware/auth.js";
import { loginLimiter, otpResendLimiter } from "../middleware/rateLimiter.js";

const router = express.Router();

// Request login - sends OTP code via email (initial login)
router.post("/request-login", loginLimiter, async (req, res) => {
  try {;
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
    
    // Send email with OTP
    await sendOTPEmail(user.email, otpCode, user.name);
    
    res.status(200).json({ 
      message: "Login code sent! Check your email for the 6-digit code.",
      email: user.email
    });
  } catch (error) {
    console.error("Request OTP error:", error);
    res.status(500).json({ error: "An error occurred while processing your request" });
  }
});

// Resend OTP code - stricter rate limit (1 per minute)
router.post("/resend-otp", otpResendLimiter, async (req, res) => {
  try {
    const { email } = req.body;
    
    // Validate email
    if (!email) {
      return res.status(400).json({ error: validationMessages.email.required });
    }
    
    if (!isValidEmail(email)) {
      return res.status(400).json({ error: validationMessages.email.invalid });
    }
    
    // Check if user exists
    const [user] = await sql`
      SELECT id, email, name FROM users WHERE email = ${email.toLowerCase()}
    `;
    
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    
    // Generate OTP code
    const otpCode = generateOTP();
    const otpExpiry = getOTPExpiry(10); // 10 minutes
    
    // Save OTP to database
    await sql`
      INSERT INTO otp_codes (email, otp_code, expires_at)
      VALUES (${email.toLowerCase()}, ${otpCode}, ${otpExpiry})
    `;
    
    // Send email with OTP
    await sendOTPEmail(user.email, otpCode, user.name);
    
    res.status(200).json({ 
      message: "Code resent! Check your email for the 6-digit code.",
      email: user.email
    });
  } catch (error) {
    console.error("Resend OTP error:", error);
    res.status(500).json({ error: "An error occurred while processing your request" });
  }
});

// Verify OTP and login
router.post("/verify-otp", loginLimiter, async (req, res) => {
  try {
    const { email, otp, rememberMe } = req.body;
    
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
    
    // Generate access token (short-lived: 15 minutes)
    const accessToken = generateAccessToken(user.id, user.email);
    
    // Generate refresh token (long-lived: 1 or 30 days based on rememberMe)
    const refreshToken = generateRefreshToken();
    const refreshTokenExpiry = getRefreshTokenExpiry(rememberMe);
    
    // Get device info and IP
    const deviceInfo = req.headers['user-agent'] || null;
    const ipAddress = req.ip || req.connection.remoteAddress || null;
    
    // Store refresh token in database
    await sql`
      INSERT INTO refresh_tokens (user_id, token, expires_at, device_info, ip_address)
      VALUES (${user.id}, ${refreshToken}, ${refreshTokenExpiry}, ${deviceInfo}, ${ipAddress})
    `;
    
    // Set refresh token as httpOnly cookie
    const cookieMaxAge = rememberMe ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000; // 30 days or 1 day
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', // HTTPS only in production
      sameSite: 'strict',
      maxAge: cookieMaxAge
    });
    
    // Send login notification
    await sendLoginNotification(user.email, user.name);

    res.status(200).json({ 
      message: "Login successful",
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name
      }
    });
  } catch (error) {
    console.error("Verify OTP error:", error);
    res.status(500).json({ error: "An error occurred during verification" });
  }
});

// Refresh access token using refresh token
router.post("/refresh", async (req, res) => {
  try {
    // Get refresh token from cookie
    const refreshToken = req.cookies.refreshToken;
    
    if (!refreshToken) {
      return res.status(401).json({ error: "Refresh token required" });
    }
    
    // Find refresh token in database
    const [tokenRecord] = await sql`
      SELECT rt.id, rt.user_id, rt.expires_at, rt.revoked, u.email
      FROM refresh_tokens rt
      JOIN users u ON rt.user_id = u.id
      WHERE rt.token = ${refreshToken}
    `;
    
    if (!tokenRecord) {
      return res.status(401).json({ error: "Invalid refresh token" });
    }
    
    // Check if token is revoked
    if (tokenRecord.revoked) {
      return res.status(401).json({ error: "Refresh token has been revoked" });
    }
    
    // Check if token is expired
    if (isExpired(tokenRecord.expires_at)) {
      // Delete expired token
      await sql`
        DELETE FROM refresh_tokens 
        WHERE id = ${tokenRecord.id}
      `;
      
      return res.status(401).json({ error: "Refresh token has expired. Please log in again." });
    }
    
    // Generate new access token
    const accessToken = generateAccessToken(tokenRecord.user_id, tokenRecord.email);
    
    res.status(200).json({ 
      message: "Token refreshed successfully",
      accessToken
    });
  } catch (error) {
    console.error("Token refresh error:", error);
    res.status(500).json({ error: "An error occurred while refreshing token" });
  }
});

// Logout route (requires authentication)
router.post("/logout", authenticateToken, async (req, res) => {
  try {
    const token = req.token;
    const userId = req.user.userId;
    const refreshToken = req.cookies.refreshToken;
    
    // Decode token to get expiration
    const decoded = verifyToken(token);
    
    if (!decoded) {
      return res.status(400).json({ error: "Invalid token" });
    }
    
    // Convert JWT exp (seconds since epoch) to timestamp
    const expiresAt = new Date(decoded.exp * 1000);
    
    // Add access token to blacklist
    await sql`
      INSERT INTO blacklisted_tokens (token, user_id, expires_at)
      VALUES (${token}, ${userId}, ${expiresAt})
      ON CONFLICT (token) DO NOTHING
    `;
    
    // Revoke refresh token if present
    if (refreshToken) {
      await sql`
        UPDATE refresh_tokens
        SET revoked = true, revoked_at = NOW()
        WHERE token = ${refreshToken} AND user_id = ${userId}
      `;
    }
    
    // Clear refresh token cookie
    res.clearCookie('refreshToken');
    
    res.status(200).json({ 
      message: "Logout successful. All tokens have been invalidated." 
    });
  } catch (error) {
    console.error("Logout error:", error);
    res.status(500).json({ error: "An error occurred during logout" });
  }
});

// Logout from all devices (revoke all refresh tokens)
router.post("/logout-all", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const token = req.token;
    
    // Revoke all refresh tokens for this user
    await sql`
      UPDATE refresh_tokens
      SET revoked = true, revoked_at = NOW()
      WHERE user_id = ${userId} AND revoked = false
    `;
    
    // Decode token to get expiration
    const decoded = verifyToken(token);
    
    if (decoded) {
      const expiresAt = new Date(decoded.exp * 1000);
      
      // Add current access token to blacklist
      await sql`
        INSERT INTO blacklisted_tokens (token, user_id, expires_at)
        VALUES (${token}, ${userId}, ${expiresAt})
        ON CONFLICT (token) DO NOTHING
      `;
    }
    
    // Clear refresh token cookie
    res.clearCookie('refreshToken');
    
    res.status(200).json({ 
      message: "Logged out from all devices successfully. All sessions have been terminated." 
    });
  } catch (error) {
    console.error("Logout all error:", error);
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
