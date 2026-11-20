export interface PasswordValidationCriteria {
  minLength: boolean;
  hasUppercase: boolean;
  hasNumber: boolean;
  hasSymbol: boolean;
}

export type PasswordStrength = "weak" | "medium" | "strong";

export interface PasswordValidationResult {
  criteria: PasswordValidationCriteria;
  isValid: boolean;
  strength: PasswordStrength;
  score: number; // 0 to 4
  feedback: string;
}

export function validatePassword(password: string): PasswordValidationResult {
  const minLength = password.length >= 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSymbol = /[^A-Za-z0-9]/.test(password);

  const criteria: PasswordValidationCriteria = {
    minLength,
    hasUppercase,
    hasNumber,
    hasSymbol,
  };

  const score = [minLength, hasUppercase, hasNumber, hasSymbol].filter(Boolean).length;
  const isValid = score === 4;

  let strength: PasswordStrength = "weak";
  let feedback = "Contraseña débil";

  if (score === 4) {
    strength = "strong";
    feedback = "Contraseña segura";
  } else if (score >= 2) {
    strength = "medium";
    feedback = "Contraseña intermedia";
  }

  return {
    criteria,
    isValid,
    strength,
    score,
    feedback,
  };
}
