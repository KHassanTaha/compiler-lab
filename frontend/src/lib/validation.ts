/**
 * Client-side validation mirroring the backend rules (PRD §12, AGENTS §15.7).
 * The backend remains the authority; these only give immediate feedback.
 */

export const USERNAME_PATTERN = /^[a-zA-Z0-9_]{3,32}$/;

export function validateUsername(value: string): string | null {
  if (!value) return "Username is required.";
  if (!USERNAME_PATTERN.test(value)) {
    return "3–32 characters; letters, numbers, and underscores only.";
  }
  return null;
}

export function validateEmail(value: string): string | null {
  if (!value) return "Email is required.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
    return "Enter a valid email address.";
  }
  return null;
}

export function validatePassword(value: string): string | null {
  if (!value) return "Password is required.";
  if (value.length < 8) return "At least 8 characters.";
  if (!/[a-zA-Z]/.test(value)) return "Include at least one letter.";
  if (!/[0-9]/.test(value)) return "Include at least one digit.";
  return null;
}

export interface PasswordStrength {
  score: 0 | 1 | 2 | 3 | 4;
  label: string;
}

/** Coarse strength meter — length plus character-class variety. */
export function passwordStrength(value: string): PasswordStrength {
  if (!value) return { score: 0, label: "Empty" };
  let score = 0;
  if (value.length >= 8) score++;
  if (value.length >= 12) score++;
  if (/[a-z]/.test(value) && /[A-Z]/.test(value)) score++;
  if (/[0-9]/.test(value) && /[^a-zA-Z0-9]/.test(value)) score++;
  const clamped = Math.min(score, 4) as PasswordStrength["score"];
  const labels = ["Very weak", "Weak", "Fair", "Good", "Strong"];
  return { score: clamped, label: labels[clamped] };
}
