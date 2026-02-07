import validator from 'validator';
import tlds from 'tlds';

/**
 * Validates email with practical rules that match common email providers
 * Includes validation against comprehensive TLD list
 * @param {string} email - Email address to validate
 * @returns {boolean} - True if email is valid
 */
export const validateEmail = (email) => {
  // First check with validator for basic format
  if (!validator.isEmail(email, {
    allow_display_name: false,
    require_tld: true,
    allow_utf8_local_part: false,
  })) {
    return false;
  }
  
  // Additional practical validation rules
  const [localPart, domain] = email.split('@');
  
  // Local part should only contain: letters, numbers, dots, hyphens, underscores
  const localPartRegex = /^[a-zA-Z0-9._-]+$/;
  if (!localPartRegex.test(localPart)) {
    return false;
  }
  
  // Local part must start and end with alphanumeric (not dot, dash, etc.)
  if (!/^[a-zA-Z0-9]/.test(localPart) || !/[a-zA-Z0-9]$/.test(localPart)) {
    return false;
  }
  
  // No consecutive dots
  if (localPart.includes('..')) {
    return false;
  }
  
  // Domain should only contain: letters, numbers, dots, hyphens
  const domainRegex = /^[a-zA-Z0-9.-]+$/;
  if (!domainRegex.test(domain)) {
    return false;
  }
  
  // Extract and validate TLD against comprehensive list
  const tld = domain.split('.').pop().toLowerCase();
  if (!tlds.includes(tld)) {
    return false;
  }
  
  return true;
};
