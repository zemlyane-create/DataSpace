/**
 * Утилита валидации надежности паролей для проекта zemlyane.dataspace
 * 
 * Требования:
 * - Минимальная длина: не менее 8 символов
 * - Как минимум одна заглавная буква (A-Z, А-Я)
 * - Как минимум одна строчная буква (a-z, а-я)
 * - Как минимум одна цифра (0-9)
 * - Как минимум один специальный символ / знак (!, @, #, $, %, ^, &, *, _, -, +, =, etc.)
 */

export interface PasswordCriteria {
  hasMinLength: boolean;
  hasUppercase: boolean;
  hasLowercase: boolean;
  hasNumber: boolean;
  hasSymbol: boolean;
}

export interface PasswordValidationResult {
  isValid: boolean;
  criteria: PasswordCriteria;
  score: number; // 0 to 5
  feedback: string;
}

export function validatePassword(password: string): PasswordValidationResult {
  const p = password || "";
  
  const hasMinLength = p.length >= 8;
  const hasUppercase = /[A-ZА-ЯЁ]/.test(p);
  const hasLowercase = /[a-zа-яё]/.test(p);
  const hasNumber = /[0-9]/.test(p);
  const hasSymbol = /[^a-zA-Z0-9а-яА-ЯёЁ\s]/.test(p) || /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~№§]/.test(p);

  const criteria: PasswordCriteria = {
    hasMinLength,
    hasUppercase,
    hasLowercase,
    hasNumber,
    hasSymbol
  };

  let score = 0;
  if (hasMinLength) score++;
  if (hasUppercase) score++;
  if (hasLowercase) score++;
  if (hasNumber) score++;
  if (hasSymbol) score++;

  const isValid = score === 5;

  let feedback = "";
  if (!p) {
    feedback = "Введите надежный пароль (не менее 8 символов: цифры, заглавные и строчные буквы, спецсимвол)";
  } else if (!hasMinLength) {
    feedback = "Пароль слишком короткий: требуется не менее 8 символов";
  } else if (!hasUppercase) {
    feedback = "Добавьте хотя бы одну заглавную букву (A-Z или А-Я)";
  } else if (!hasLowercase) {
    feedback = "Добавьте хотя бы одну строчную букву (a-z или а-я)";
  } else if (!hasNumber) {
    feedback = "Добавьте хотя бы одну цифру (0-9)";
  } else if (!hasSymbol) {
    feedback = "Добавьте хотя бы один спецсимвол (!, @, #, $, %, &, *, _ и др.)";
  } else {
    feedback = "Пароль надежный и соответствует всем требованиям безопасности";
  }

  return {
    isValid,
    criteria,
    score,
    feedback
  };
}

