import React from "react";
import { Check, X, Shield, ShieldAlert, ShieldCheck } from "lucide-react";
import { validatePassword } from "../utils/passwordValidator";

interface PasswordStrengthIndicatorProps {
  password: string;
  showAlways?: boolean;
  className?: string;
}

export const PasswordStrengthIndicator: React.FC<PasswordStrengthIndicatorProps> = ({
  password,
  showAlways = false,
  className = "",
}) => {
  const result = validatePassword(password);
  const { criteria, score, isValid } = result;

  // Don't display empty clutter if user hasn't typed yet, unless showAlways is true
  if (!password && !showAlways) {
    return null;
  }

  // Calculate strength percentage (0% to 100%)
  const percentage = (score / 5) * 100;

  // Color mapping based on score
  const getStrengthBarColor = () => {
    if (score <= 2) return "bg-rose-500";
    if (score === 3) return "bg-amber-500";
    if (score === 4) return "bg-sky-500";
    return "bg-emerald-500";
  };

  const getStrengthLabel = () => {
    if (!password) return "Введите пароль";
    if (score <= 2) return "Слабый пароль";
    if (score === 3) return "Средний пароль";
    if (score === 4) return "Почти надежный";
    return "Надежный пароль";
  };

  return (
    <div className={`mt-2 space-y-2 text-xs animate-fade-in ${className}`}>
      {/* Progress Bar & Label */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-slate-400">Сложность пароля:</span>
          <span
            className={`font-semibold flex items-center space-x-1 ${
              isValid
                ? "text-emerald-400"
                : score >= 3
                ? "text-amber-400"
                : "text-rose-400"
            }`}
          >
            {isValid ? (
              <ShieldCheck className="w-3.5 h-3.5 inline mr-1 text-emerald-400" />
            ) : (
              <ShieldAlert className="w-3.5 h-3.5 inline mr-1" />
            )}
            {getStrengthLabel()}
          </span>
        </div>

        <div className="w-full h-1.5 bg-[#0b1612] rounded-full overflow-hidden border border-emerald-950">
          <div
            className={`h-full transition-all duration-300 ${getStrengthBarColor()}`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>

      {/* Main Hint text */}
      <div
        className={`p-2 rounded-xl border text-[11px] leading-tight ${
          isValid
            ? "bg-emerald-950/40 border-emerald-700/60 text-emerald-300"
            : "bg-[#14261f] border-emerald-800/80 text-slate-300"
        }`}
      >
        <p className="font-medium">
          {isValid ? (
            <span className="text-emerald-300">
              ✓ Пароль удовлетворяет всем требованиям безопасности!
            </span>
          ) : (
            <span className="text-slate-300">
              Пароль должен содержать не менее 8 символов, заглавные и строчные буквы, цифры и спецсимвол (!@#$...).
            </span>
          )}
        </p>
      </div>

      {/* Live Requirement Checklist Chips */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 pt-0.5">
        <div
          className={`flex items-center space-x-1.5 px-2 py-1 rounded-lg border text-[11px] transition-colors ${
            criteria.hasMinLength
              ? "bg-emerald-950/70 border-emerald-700 text-emerald-300"
              : "bg-[#0b1813] border-slate-800 text-slate-400"
          }`}
        >
          {criteria.hasMinLength ? (
            <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          ) : (
            <X className="w-3.5 h-3.5 text-slate-500 shrink-0" />
          )}
          <span>≥ 8 символов</span>
        </div>

        <div
          className={`flex items-center space-x-1.5 px-2 py-1 rounded-lg border text-[11px] transition-colors ${
            criteria.hasUppercase
              ? "bg-emerald-950/70 border-emerald-700 text-emerald-300"
              : "bg-[#0b1813] border-slate-800 text-slate-400"
          }`}
        >
          {criteria.hasUppercase ? (
            <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          ) : (
            <X className="w-3.5 h-3.5 text-slate-500 shrink-0" />
          )}
          <span>Заглавная (A-Z, А-Я)</span>
        </div>

        <div
          className={`flex items-center space-x-1.5 px-2 py-1 rounded-lg border text-[11px] transition-colors ${
            criteria.hasLowercase
              ? "bg-emerald-950/70 border-emerald-700 text-emerald-300"
              : "bg-[#0b1813] border-slate-800 text-slate-400"
          }`}
        >
          {criteria.hasLowercase ? (
            <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          ) : (
            <X className="w-3.5 h-3.5 text-slate-500 shrink-0" />
          )}
          <span>Строчная (a-z, а-я)</span>
        </div>

        <div
          className={`flex items-center space-x-1.5 px-2 py-1 rounded-lg border text-[11px] transition-colors ${
            criteria.hasNumber
              ? "bg-emerald-950/70 border-emerald-700 text-emerald-300"
              : "bg-[#0b1813] border-slate-800 text-slate-400"
          }`}
        >
          {criteria.hasNumber ? (
            <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          ) : (
            <X className="w-3.5 h-3.5 text-slate-500 shrink-0" />
          )}
          <span>Цифра (0-9)</span>
        </div>

        <div
          className={`flex items-center space-x-1.5 px-2 py-1 rounded-lg border text-[11px] transition-colors col-span-2 sm:col-span-1 ${
            criteria.hasSymbol
              ? "bg-emerald-950/70 border-emerald-700 text-emerald-300"
              : "bg-[#0b1813] border-slate-800 text-slate-400"
          }`}
        >
          {criteria.hasSymbol ? (
            <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          ) : (
            <X className="w-3.5 h-3.5 text-slate-500 shrink-0" />
          )}
          <span>Спецсимвол (!@#$...)</span>
        </div>
      </div>
    </div>
  );
};
