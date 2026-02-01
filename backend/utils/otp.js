import crypto from "crypto";

// Generate 6-digit OTP code
export const generateOTP = () => {
  return crypto.randomInt(100000, 999999).toString();
};

// Generate magic link token
export const generateMagicLinkToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

// Create OTP expiry time (default 10 minutes from now)
export const getOTPExpiry = (minutes = 10) => {
  const expiry = new Date();
  expiry.setMinutes(expiry.getMinutes() + minutes);
  return expiry;
};

// Create magic link expiry time (default 15 minutes from now)
export const getMagicLinkExpiry = (minutes = 15) => {
  const expiry = new Date();
  expiry.setMinutes(expiry.getMinutes() + minutes);
  return expiry;
};

// Check if OTP/token is expired
export const isExpired = (expiryDate) => {
  return new Date() > new Date(expiryDate);
};
