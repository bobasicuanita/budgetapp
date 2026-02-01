// Email validation
export const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Validation error messages
export const validationMessages = {
  email: {
    required: "Email is required",
    invalid: "Please provide a valid email address"
  }
};
