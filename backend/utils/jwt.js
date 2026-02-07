import jwt from "jsonwebtoken";
import crypto from "crypto";

// Generate access token (short-lived)
export const generateAccessToken = (userId, email) => {
  const payload = {
    userId,
    email,
    type: 'access'
  };
  
  const token = jwt.sign(
    payload,
    process.env.JWT_SECRET || 'your-secret-key-change-this',
    { expiresIn: process.env.ACCESS_TOKEN_EXPIRES_IN || '15m' } // 15 minutes
  );
  
  return token;
};

// Generate refresh token (long-lived, random string)
export const generateRefreshToken = () => {
  return crypto.randomBytes(64).toString('hex');
};

// Generate legacy token (for backward compatibility)
export const generateToken = (userId, email) => {
  return generateAccessToken(userId, email);
};

// Verify JWT token
export const verifyToken = (token) => {
  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'your-secret-key-change-this'
    );
    return decoded;
  } catch (error) {
    return null;
  }
};

// Get expiration date for refresh token
export const getRefreshTokenExpiry = (rememberMe) => {
  const now = new Date();
  // 30 days if remember me, otherwise 1 day
  const days = rememberMe ? 30 : 1;
  return new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
};
