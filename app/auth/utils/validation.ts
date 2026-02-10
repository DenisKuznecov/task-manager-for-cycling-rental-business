const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateRequired(value: string, fieldLabel: string): string | null {
  if (!value.trim()) {
    return `${fieldLabel} is required.`;
  }
  return null;
}

export function validateEmail(value: string): string | null {
  if (!value.trim()) {
    return "Email is required.";
  }
  if (!EMAIL_REGEX.test(value)) {
    return "Enter a valid email address.";
  }
  return null;
}

export function validatePasswordStrength(value: string): string | null {
  if (!value) {
    return "Password is required.";
  }
  if (value.length < 8) {
    return "Password must be at least 8 characters.";
  }
  return null;
}

