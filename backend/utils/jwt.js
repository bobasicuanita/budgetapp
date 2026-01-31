import jwt from "jsonwebtoken";

// Generate JWT token
export const generateToken = (userId, email) => {
  const payload = {
    userId,
    email
  };
  
  const token = jwt.sign(
    payload,
    process.env.JWT_SECRET || 'your-secret-key-change-this',
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
  
  return token;
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
