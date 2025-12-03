
export const PATTERNS = {
  // Standard email format
  EMAIL: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
  
  // Min 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special char (any non-word char or underscore)
  PASSWORD: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/,
  
  // 2-50 characters, letters and spaces only
  NAME: /^[a-zA-Z\s]{2,50}$/
};

export const MESSAGES = {
  EMAIL: "Please enter a valid email address.",
  PASSWORD: "Password must be at least 8 characters and include uppercase, lowercase, number, and a special character.",
  NAME: "Name must be 2-50 characters and contain only letters."
};

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

export const validate = (value: string, type: keyof typeof PATTERNS): ValidationResult => {
  if (!value) return { isValid: false, error: "This field is required." };
  const isValid = PATTERNS[type].test(value);
  return {
    isValid,
    error: isValid ? undefined : MESSAGES[type]
  };
};