import { verifyToken } from "../utils/jwt.js";
import sql from "../config/database.js";

// Middleware to authenticate requests with JWT
export const authenticateToken = async (req, res, next) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
    
    if (!token) {
      return res.status(401).json({ error: "Access token required" });
    }
    
    // Check if token is blacklisted
    const [blacklisted] = await sql`
      SELECT id FROM blacklisted_tokens 
      WHERE token = ${token}
    `;
    
    if (blacklisted) {
      return res.status(401).json({ error: "Token has been revoked" });
    }
    
    // Verify token
    const decoded = verifyToken(token);
    
    if (!decoded) {
      return res.status(401).json({ error: "Invalid or expired token" });
    }
    
    // Attach user info and token to request
    req.user = {
      userId: decoded.userId,
      email: decoded.email
    };
    req.token = token;
    
    next();
  } catch (error) {
    console.error("Authentication error:", error);
    return res.status(401).json({ error: "Authentication failed" });
  }
};

// Optional middleware - doesn't fail if no token
export const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];
    
    if (token) {
      const decoded = verifyToken(token);
      if (decoded) {
        req.user = {
          userId: decoded.userId,
          email: decoded.email
        };
      }
    }
    
    next();
  } catch (error) {
    // Continue without authentication
    next();
  }
};
