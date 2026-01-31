// Email validation
export const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Password validation
export const isValidPassword = (password) => {
  // At least 8 characters, 1 uppercase, 1 lowercase, 1 number
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
  return passwordRegex.test(password);
};

// Name validation
export const isValidName = (name) => {
  return name && name.trim().length >= 2 && name.trim().length <= 50;
};

// Validation error messages
export const validationMessages = {
  email: {
    required: "Email is required",
    invalid: "Please provide a valid email address"
  },
  password: {
    required: "Password is required",
    invalid: "Password must be at least 8 characters with 1 uppercase, 1 lowercase, and 1 number"
  },
  name: {
    required: "Name is required",
    invalid: "Name must be between 2 and 50 characters"
  }
};
