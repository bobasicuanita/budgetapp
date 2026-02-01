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
