import rateLimit from "express-rate-limit";

// General rate limiter for auth endpoints
// NOTE: Set to high limit for development, reduce in production!
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // High limit for development (change to 100 in production)
  message: {
    error: "Too many requests from this IP, please try again later."
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

// Strict rate limiter for login attempts
// NOTE: Set to high limit for development, reduce in production!
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // High limit for development (change to 5 in production)
  message: {
    error: "Too many login attempts, please try again after 15 minutes."
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false, // Count successful requests
});

// Rate limiter for registration
// NOTE: Set to high limit for development, reduce in production!
export const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 1000, // High limit for development (change to 3 in production)
  message: {
    error: "Too many accounts created from this IP, please try again after an hour."
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiter for password reset requests
export const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // Limit each IP to 3 password reset requests per hour
  message: {
    error: "Too many password reset attempts, please try again after an hour."
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiter for email verification resend
export const resendVerificationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 3, // Limit each IP to 3 resend requests per 15 minutes
  message: {
    error: "Too many verification email requests, please try again later."
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiter for OTP code resend (request-login)
export const otpResendLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute (60 seconds)
  max: 1, // Limit each IP to 1 OTP request per minute
  message: {
    error: "Please wait before requesting another code."
  },
  standardHeaders: 'draft-7', // Includes Retry-After header
  legacyHeaders: false,
  skipSuccessfulRequests: false, // Count all requests
  handler: (req, res) => {
    const retryAfter = Math.ceil((req.rateLimit.resetTime - Date.now()) / 1000);
    res.status(429).json({
      error: "Please wait before requesting another code.",
      retryAfter: retryAfter
    });
  }
});

/**
 * Rate limiter for transaction creation and updates
 * Dual limits:
 * - 5 requests per 10 seconds
 * - 20 requests per hour
 * 
 * Per authenticated user (using req.user.userId as key)
 */

// Short-term limit: 5 requests per 10 seconds
export const transactionShortTermLimiter = rateLimit({
  windowMs: 10 * 1000, // 10 seconds
  max: 5, // 5 requests per window
  message: "You are creating transactions too quickly. Please wait a moment and try again.",
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
  keyGenerator: (req) => {
    // Use userId as key (requires authenticateToken middleware to run first)
    // No fallback to IP - skip rate limiting if no user
    return req.user?.userId?.toString();
  },
  handler: (req, res) => {
    res.status(429).json({
      error: "You are creating transactions too quickly. Please wait a moment and try again.",
      retryAfter: Math.ceil(req.rateLimit.resetTime / 1000) // seconds until reset
    });
  },
  skip: (req) => {
    // Skip rate limiting if user is not authenticated (shouldn't happen, but safety check)
    return !req.user?.userId;
  }
});

// Long-term limit: 20 requests per hour
export const transactionLongTermLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // 20 requests per window
  message: "You are creating transactions too quickly. Please wait a moment and try again.",
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Use userId as key (requires authenticateToken middleware to run first)
    // No fallback to IP - skip rate limiting if no user
    return req.user?.userId?.toString();
  },
  handler: (req, res) => {
    const resetTime = new Date(req.rateLimit.resetTime);
    const minutesUntilReset = Math.ceil((resetTime - Date.now()) / (1000 * 60));
    
    res.status(429).json({
      error: "You are creating transactions too quickly. Please wait a moment and try again.",
      retryAfter: Math.ceil((resetTime - Date.now()) / 1000), // seconds until reset
      message: `You've reached the hourly limit. Try again in ${minutesUntilReset} minute${minutesUntilReset !== 1 ? 's' : ''}.`
    });
  },
  skip: (req) => {
    // Skip rate limiting if user is not authenticated
    return !req.user?.userId;
  }
});

/**
 * Rate limiter for CSV export
 * Dual limits:
 * - 3 exports per minute
 * - 10 exports per hour
 * 
 * Per authenticated user (using req.user.userId as key)
 */

// Short-term limit: 3 exports per minute
export const csvExportShortTermLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 3, // 3 exports per minute
  message: "You're exporting too frequently. Please try again in a moment.",
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return req.user?.userId?.toString();
  },
  handler: (req, res) => {
    res.status(429).json({
      error: "You're exporting too frequently. Please try again in a moment."
    });
  },
  skip: (req) => {
    return !req.user?.userId;
  }
});

// Long-term limit: 10 exports per hour
export const csvExportLongTermLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 exports per hour
  message: "You're exporting too frequently. Please try again in a moment.",
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return req.user?.userId?.toString();
  },
  handler: (req, res) => {
    res.status(429).json({
      error: "You're exporting too frequently. Please try again in a moment."
    });
  },
  skip: (req) => {
    return !req.user?.userId;
  }
});
