// Email validation
export const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Name validation (first name, last name)
// Allows letters (including international), hyphens, apostrophes, and spaces
export const isValidName = (name) => {
  // Allow empty string
  if (!name || name === '') return true;
  
  // Unicode regex that matches:
  // - Letters from any language (\p{L})
  // - Hyphens (-)
  // - Apostrophes (')
  // - Spaces
  const nameRegex = /^[\p{L}\s'-]+$/u;
  return nameRegex.test(name);
};

// Validation error messages
export const validationMessages = {
  email: {
    required: "Email is required",
    invalid: "Please provide a valid email address"
  },
  name: {
    invalid: "Name can only contain letters, hyphens, apostrophes, and spaces"
  }
};
