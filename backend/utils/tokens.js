import crypto from "crypto";

// Generate random verification token
export const generateVerificationToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

// Generate password reset token
export const generateResetToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

// Create token expiry time (default 24 hours from now)
export const getTokenExpiry = (hours = 24) => {
  const expiry = new Date();
  expiry.setHours(expiry.getHours() + hours);
  return expiry;
};

// Check if token is expired
export const isTokenExpired = (expiryDate) => {
  return new Date() > new Date(expiryDate);
};
