import crypto from "crypto";

// Generate 6-digit OTP code
export const generateOTP = () => {
  return crypto.randomInt(100000, 999999).toString();
};

// Create OTP expiry time (default 10 minutes from now)
export const getOTPExpiry = (minutes = 10) => {
  const expiry = new Date();
  expiry.setMinutes(expiry.getMinutes() + minutes);
  return expiry;
};

// Check if OTP is expired
export const isExpired = (expiryDate) => {
  return new Date() > new Date(expiryDate);
};
