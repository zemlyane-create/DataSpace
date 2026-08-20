import React, { useState, useEffect } from "react";
import { UserProfile } from "../types";
import { 
  isAdminRole, 
  isPendingRole, 
  isRejectedRole, 
  getUserStatusFromRole, 
  extractNicknameFromEmail, 
  validateNickname 
} from "../types/database.types";
import { 
  User, 
  Shield, 
  CheckCircle2, 
  AlertTriangle, 
  UserPlus, 
  LogOut, 
  ShieldCheck, 
  X,
  KeyRound,
  LogIn,
  Key,
  AtSign,
  RefreshCw
} from "lucide-react";
import { updateProfile, checkNicknameAvailability, refreshCurrentUserProfile } from "../services/clubService";
import { validatePassword } from "../utils/passwordValidator";
import { PasswordStrengthIndicator } from "./PasswordStrengthIndicator";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile | null;
  onRegister: (fullName: string, nickname: string, password?: string, role?: string) => Promise<boolean | void> | void;
  onLogin: (nickname: string, password?: string) => Promise<boolean | void> | void;
  onLogout: () => void;
  onOpenAdminPanel?: () => void;
  onStatusUpdated?: (updatedProfile: UserProfile) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onRegister,
  onLogin,
  onLogout,
  onOpenAdminPanel,
  onStatusUpdated
}) => {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [nickname, setNickname] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);

  // Nickname Real-time Validation for Registration
  const [nicknameError, setNicknameError] = useState<string | null>(null);
  const [isCheckingNickname, setIsCheckingNickname] = useState(false);
  const [isNicknameAvailable, setIsNicknameAvailable] = useState<boolean | null>(null);

  // Change Password State for Logged In User
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  // Reset states on open / switch mode
  useEffect(() => {
    if (isOpen) {
      setErrorMsg(null);
      setSuccessMsg(null);
      setIsCheckingStatus(false);
    }
  }, [isOpen, mode]);

  // Handle Nickname input in register mode
  const handleNicknameChange = (raw: string) => {
    // Automatically convert to lowercase and remove spaces
    const clean = raw.trim().toLowerCase();
    setNickname(clean);
    setIsNicknameAvailable(null);

    if (!clean) {
      setNicknameError(null);
      return;
    }

    const val = validateNickname(clean);
    if (!val.isValid) {
      setNicknameError(val.error || "Недопустимый формат никнейма");
    } else {
      setNicknameError(null);
    }
  };

  // Debounced Nickname Availability Check
  useEffect(() => {
    if (mode !== "register" || !nickname) {
      setIsNicknameAvailable(null);
      return;
    }

    const val = validateNickname(nickname);
    if (!val.isValid) {
      setIsNicknameAvailable(false);
      return;
    }

    let isMounted = true;
    setIsCheckingNickname(true);

    const timer = setTimeout(async () => {
      try {
        const res = await checkNicknameAvailability(nickname);
        if (isMounted) {
          setIsNicknameAvailable(res.available);
          if (!res.available && res.error) {
            setNicknameError(res.error);
          } else {
            setNicknameError(null);
          }
        }
      } catch {
        if (isMounted) setIsNicknameAvailable(null);
      } finally {
        if (isMounted) setIsCheckingNickname(false);
      }
    }, 450);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [nickname, mode]);

  if (!isOpen) return null;

  const regPasswordValidation = validatePassword(password);
  const changePasswordValidation = validatePassword(newPassword);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanNick = nickname.trim().toLowerCase();
    if (!cleanNick) {
      setErrorMsg("Пожалуйста, введите ваш никнейм (логин).");
      return;
    }
    setErrorMsg(null);
    setIsSubmitting(true);
    try {
      const res = await onLogin(cleanNick, password.trim());
      if (res !== false) {
        onClose();
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Ошибка входа. Проверьте никнейм и пароль.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanNick = nickname.trim().toLowerCase();

    if (!cleanNick || !fullName.trim()) {
      setErrorMsg("Заполните ФИО и укажите никнейм.");
      return;
    }

    const nickValidation = validateNickname(cleanNick);
    if (!nickValidation.isValid) {
      setErrorMsg(nickValidation.error || "Недопустимый никнейм.");
      return;
    }

    if (!regPasswordValidation.isValid) {
      setErrorMsg("Пароль должен содержать не менее 8 символов, заглавные и строчные буквы, цифры и спецсимвол.");
      return;
    }

    setErrorMsg(null);
    setIsSubmitting(true);
    try {
      // Check nickname uniqueness one last time
      const avail = await checkNicknameAvailability(cleanNick);
      if (!avail.available) {
        setErrorMsg(avail.error || "Этот никнейм уже занят. Выберите другой.");
        setIsSubmitting(false);
        return;
      }

      await onRegister(fullName.trim(), cleanNick, password.trim(), "Участник");
      setSuccessMsg("Заявка на регистрацию успешно подана! Аккаунт переведен в режим ожидания назначения роли администратором.");
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (err: any) {
      setErrorMsg(err.message || "Ошибка регистрации.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCheckStatus = async () => {
    if (!currentUser) return;
    setIsCheckingStatus(true);
    setErrorMsg(null);
    try {
      const updated = await refreshCurrentUserProfile(currentUser.email);
      if (updated) {
        const derivedStatus = getUserStatusFromRole(updated.role, updated.email);
        if (onStatusUpdated) {
          onStatusUpdated({
            ...currentUser,
            role: updated.role,
            status: derivedStatus as any,
            fullName: updated.fullName,
          });
        }
        if (derivedStatus === "active") {
          setSuccessMsg(`✓ Аккаунт подтвержден! Назначена роль «${updated.role}».`);
        } else if (derivedStatus === "rejected") {
          setErrorMsg("Статус заявки: Отклонено администратором.");
        } else {
          setSuccessMsg("Статус проверен: заявка все еще находится на рассмотрении.");
        }
      } else {
        setErrorMsg("Не удалось получить данные с сервера.");
      }
    } catch (err: any) {
      setErrorMsg("Ошибка проверки статуса: " + (err.message || "Сбой связи"));
    } finally {
      setIsCheckingStatus(false);
      setTimeout(() => setSuccessMsg(null), 4000);
    }
  };

  const handleChangePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    if (!changePasswordValidation.isValid) {
      setErrorMsg("Новый пароль не удовлетворяет требованиям надежности.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg("Введенные пароли не совпадают.");
      return;
    }

    setErrorMsg(null);
    setIsUpdatingPassword(true);
    try {
      await updateProfile(currentUser.id, { password: newPassword.trim() });
      setSuccessMsg("Пароль успешно обновлен в базе данных!");
      setIsChangingPassword(false);
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || "Ошибка при смене пароля.");
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const isAdmin = isAdminRole(currentUser?.role);
  const currentNickname = currentUser ? extractNicknameFromEmail(currentUser.email) : "";

  const isRegisterButtonDisabled = 
    isSubmitting || 
    !fullName.trim() || 
    !nickname.trim() || 
    !!nicknameError ||
    isNicknameAvailable === false ||
    !regPasswordValidation.isValid;

  const isChangePasswordDisabled = 
    isUpdatingPassword || 
    !changePasswordValidation.isValid || 
    newPassword !== confirmPassword;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="bg-[#0f1d18] border-2 border-emerald-500 rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl relative text-slate-100 font-sans my-auto max-h-[90vh] overflow-y-auto">
        
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white bg-slate-800 rounded-full transition border border-slate-700"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center space-x-3 pb-4 border-b border-emerald-800/80 mb-6">
          <div className="p-3 bg-emerald-950 rounded-2xl border border-emerald-700/60 text-emerald-400">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-bold font-serif text-white">
              Zemlyane.DataSpace Auth
            </h2>
            <p className="text-xs text-emerald-300">
              Авторизация по Никнейму и Паролю для школьников и наставников
            </p>
          </div>
        </div>

        {/* Notifications */}
        {errorMsg && (
          <div className="mb-4 p-3 bg-rose-950/80 border border-rose-600 rounded-xl flex items-center space-x-2 text-rose-200 text-xs animate-fade-in">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-4 p-3 bg-emerald-950/80 border border-emerald-500 rounded-xl flex items-center space-x-2 text-emerald-200 text-xs animate-fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* If Logged In View */}
        {currentUser ? (
          <div className="space-y-5">
            <div className="p-5 bg-[#13261f] border border-emerald-700/80 rounded-2xl space-y-3">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-950 border border-emerald-600 flex items-center justify-center text-emerald-300 font-bold text-lg">
                  {currentUser.fullName.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-bold text-slate-100 text-base">{currentUser.fullName}</p>
                  <p className="text-xs text-emerald-400 font-mono flex items-center space-x-1">
                    <AtSign className="w-3.5 h-3.5" />
                    <span>{currentNickname}</span>
                  </p>
                </div>
              </div>

              <div className="pt-2 border-t border-emerald-900/80 flex flex-col space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400">Статус аккаунта:</span>
                  {(isPendingRole(currentUser.role) || currentUser.status === "pending") ? (
                    <span className="px-2.5 py-0.5 rounded-full bg-amber-950 border border-amber-500 text-xs font-bold text-amber-300 flex items-center space-x-1">
                      <span>⏳ Ожидает назначения роли</span>
                    </span>
                  ) : (isRejectedRole(currentUser.role) || currentUser.status === "rejected") ? (
                    <span className="px-2.5 py-0.5 rounded-full bg-rose-950 border border-rose-500 text-xs font-bold text-rose-300 flex items-center space-x-1">
                      <span>✕ Отклонен</span>
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-950 border border-emerald-500 text-xs font-bold text-emerald-300 flex items-center space-x-1">
                      <span>✓ Подтвержден</span>
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400">Роль в проекте:</span>
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-900/90 border border-emerald-600 text-xs font-bold text-emerald-300">
                    {currentUser.role}
                  </span>
                </div>

                {(isPendingRole(currentUser.role) || currentUser.status === "pending") && (
                  <div className="mt-2 p-3 bg-amber-950/70 border border-amber-600/70 rounded-2xl space-y-2 text-xs">
                    <p className="text-[11px] text-amber-200/90 leading-relaxed">
                      ℹ️ Ваша регистрация находится на рассмотрении администратором. Нажмите кнопку ниже, чтобы проверить решение:
                    </p>
                    <button
                      type="button"
                      onClick={handleCheckStatus}
                      disabled={isCheckingStatus}
                      className="w-full py-2 bg-amber-600 hover:bg-amber-500 text-slate-950 font-black rounded-xl text-xs transition shadow flex items-center justify-center space-x-1.5"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isCheckingStatus ? "animate-spin" : ""}`} />
                      <span>{isCheckingStatus ? "Проверка статуса..." : "Проверить статус заявки"}</span>
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Change Password Toggle Form */}
            {isChangingPassword ? (
              <form onSubmit={handleChangePasswordSubmit} className="p-4 bg-[#13261f] border border-emerald-700 rounded-2xl space-y-3 text-xs animate-fade-in">
                <div className="flex items-center justify-between pb-2 border-b border-emerald-800">
                  <span className="font-bold text-emerald-300 flex items-center space-x-1.5">
                    <Key className="w-4 h-4 text-emerald-400" />
                    <span>Смена пароля аккаунта</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => { setIsChangingPassword(false); setErrorMsg(null); }}
                    className="text-slate-400 hover:text-slate-200 text-xs"
                  >
                    Отмена
                  </button>
                </div>

                <div>
                  <label className="block text-emerald-300 font-bold mb-1">
                    Новый пароль:
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="Введите надежный новый пароль"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full bg-[#0e1d17] border border-emerald-800 text-slate-100 p-2.5 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none font-mono"
                  />
                  <PasswordStrengthIndicator password={newPassword} />
                </div>

                <div>
                  <label className="block text-emerald-300 font-bold mb-1">
                    Подтвердите новый пароль:
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="Повторите новый пароль"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full bg-[#0e1d17] border border-emerald-800 text-slate-100 p-2.5 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none font-mono"
                  />
                  {confirmPassword && newPassword !== confirmPassword && (
                    <p className="text-[11px] text-rose-400 mt-1 font-medium">
                      ⚠️ Пароли не совпадают
                    </p>
                  )}
                  {confirmPassword && newPassword === confirmPassword && (
                    <p className="text-[11px] text-emerald-400 mt-1 font-medium">
                      ✓ Пароли совпадают
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isChangePasswordDisabled}
                  className={`w-full py-2.5 rounded-xl font-bold text-xs sm:text-sm shadow transition flex items-center justify-center space-x-2 ${
                    isChangePasswordDisabled
                      ? "bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700"
                      : "bg-emerald-600 hover:bg-emerald-500 text-white"
                  }`}
                >
                  <KeyRound className="w-4 h-4" />
                  <span>{isUpdatingPassword ? "Сохранение..." : "Сохранить новый пароль"}</span>
                </button>
              </form>
            ) : (
              <button
                type="button"
                onClick={() => { setIsChangingPassword(true); setErrorMsg(null); }}
                className="w-full py-2 bg-[#13261f] hover:bg-[#1a332a] border border-emerald-700/80 rounded-xl text-emerald-300 font-bold text-xs transition flex items-center justify-center space-x-2"
              >
                <Key className="w-3.5 h-3.5" />
                <span>Сменить пароль учетной записи</span>
              </button>
            )}

            <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
              {isAdmin && onOpenAdminPanel && (
                <button
                  onClick={() => {
                    onOpenAdminPanel();
                    onClose();
                  }}
                  className="w-full sm:w-1/2 py-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl font-bold text-xs sm:text-sm transition flex items-center justify-center space-x-2 shadow-lg"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>Панель админа</span>
                </button>
              )}

              <button
                onClick={() => {
                  onLogout();
                  onClose();
                }}
                className={`py-2.5 bg-rose-950 hover:bg-rose-900 text-rose-200 border border-rose-800 rounded-xl font-bold text-xs sm:text-sm transition flex items-center justify-center space-x-2 ${
                  isAdmin && onOpenAdminPanel ? "w-full sm:w-1/2" : "w-full"
                }`}
              >
                <LogOut className="w-4 h-4" />
                <span>Выйти из аккаунта</span>
              </button>
            </div>
          </div>
        ) : (
          <div>
            {/* Mode Switcher */}
            <div className="flex items-center space-x-2 mb-5 bg-[#0b1612] p-1 rounded-2xl border border-emerald-900/80">
              <button
                onClick={() => { setMode("login"); setErrorMsg(null); }}
                className={`w-1/2 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1.5 ${
                  mode === "login" 
                    ? "bg-emerald-600 text-white shadow" 
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Вход в систему</span>
              </button>

              <button
                onClick={() => { setMode("register"); setErrorMsg(null); }}
                className={`w-1/2 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1.5 ${
                  mode === "register" 
                    ? "bg-emerald-600 text-white shadow" 
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Регистрация</span>
              </button>
            </div>

            {/* LOGIN FORM */}
            {mode === "login" && (
              <form onSubmit={handleLoginSubmit} className="space-y-4 text-xs sm:text-sm">
                <div>
                  <label className="block text-emerald-300 font-bold mb-1">
                    Никнейм (логин):
                  </label>
                  <div className="relative">
                    <AtSign className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      autoCapitalize="none"
                      autoCorrect="off"
                      placeholder="Например: almat_geo или admin"
                      value={nickname}
                      onChange={(e) => setNickname(e.target.value.trim().toLowerCase())}
                      className="w-full bg-[#13261f] border border-emerald-800 text-slate-100 pl-9 pr-3 py-2.5 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none font-mono"
                    />
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Для входа администратора используйте никнейм <span className="text-amber-300 font-mono">admin</span>
                  </p>
                </div>

                <div>
                  <label className="block text-emerald-300 font-bold mb-1">
                    Пароль:
                  </label>
                  <div className="relative">
                    <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="password"
                      required
                      placeholder="Введите пароль"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-[#13261f] border border-emerald-800 text-slate-100 pl-9 pr-3 py-2.5 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none font-mono"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting || !nickname.trim() || !password.trim()}
                  className={`w-full py-3 rounded-xl font-bold text-sm shadow-lg transition flex items-center justify-center space-x-2 mt-4 ${
                    isSubmitting || !nickname.trim() || !password.trim()
                      ? "bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700"
                      : "bg-emerald-600 hover:bg-emerald-500 text-white"
                  }`}
                >
                  <LogIn className="w-4 h-4" />
                  <span>{isSubmitting ? "Выполняется вход..." : "Войти по никнейму"}</span>
                </button>
              </form>
            )}

            {/* REGISTER FORM */}
            {mode === "register" && (
              <form onSubmit={handleRegisterSubmit} className="space-y-4 text-xs sm:text-sm">
                <div>
                  <label className="block text-emerald-300 font-bold mb-1">
                    ФИО исследователя / учащегося:
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      placeholder="Например: Арман Сериков (8 «А» класс)"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full bg-[#13261f] border border-emerald-800 text-slate-100 pl-9 pr-3 py-2.5 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-emerald-300 font-bold">
                      Придумайте Никнейм (логин для входа):
                    </label>
                    {isCheckingNickname && (
                      <span className="text-[10px] text-slate-400 flex items-center space-x-1">
                        <RefreshCw className="w-3 h-3 animate-spin text-emerald-400" />
                        <span>Проверка...</span>
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <AtSign className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      maxLength={20}
                      autoCapitalize="none"
                      autoCorrect="off"
                      placeholder="arman_eco26"
                      value={nickname}
                      onChange={(e) => handleNicknameChange(e.target.value)}
                      className={`w-full bg-[#13261f] border pl-9 pr-3 py-2.5 rounded-xl focus:outline-none font-mono text-slate-100 ${
                        nicknameError || isNicknameAvailable === false
                          ? "border-rose-500 focus:ring-2 focus:ring-rose-500"
                          : isNicknameAvailable === true
                          ? "border-emerald-500 focus:ring-2 focus:ring-emerald-500"
                          : "border-emerald-800 focus:ring-2 focus:ring-emerald-500"
                      }`}
                    />
                  </div>

                  {nicknameError && (
                    <p className="text-[11px] text-rose-400 mt-1 font-medium">
                      ⚠️ {nicknameError}
                    </p>
                  )}

                  {!nicknameError && isNicknameAvailable === true && (
                    <p className="text-[11px] text-emerald-400 mt-1 font-medium flex items-center space-x-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Никнейм свободен</span>
                    </p>
                  )}

                  <p className="text-[10px] text-slate-400 mt-1">
                    Разрешены: латинские буквы (a-z), цифры (0-9), «-» и «_» (от 3 до 20 символов).
                  </p>
                </div>

                <div className="bg-[#13261f]/90 border-2 border-amber-500/50 rounded-2xl p-3.5 text-xs text-slate-300 space-y-1.5 shadow-inner">
                  <div className="flex items-center justify-between">
                    <span className="text-amber-300 font-bold flex items-center space-x-1.5">
                      <span>⏳ Режим регистрации:</span>
                    </span>
                    <span className="px-2.5 py-0.5 bg-amber-950 text-amber-300 border border-amber-600 rounded-md font-bold text-[11px]">
                      Ожидание назначения роли
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    После регистрации Администратор проверяет заявку и назначает роль («Исследователь», «Корреспондент», «Руководитель» или «Участник»).
                  </p>
                </div>

                <div>
                  <label className="block text-emerald-300 font-bold mb-1">
                    Пароль (не менее 8 символов, заглавные/строчные буквы, цифры, спецсимвол):
                  </label>
                  <div className="relative">
                    <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="password"
                      required
                      maxLength={64}
                      placeholder="Придумайте пароль (например: Eco#2026Pass)"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-[#13261f] border border-emerald-800 text-slate-100 pl-9 pr-3 py-2.5 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none font-mono"
                    />
                  </div>
                  <PasswordStrengthIndicator password={password} showAlways={true} />
                </div>

                <button
                  type="submit"
                  disabled={isRegisterButtonDisabled}
                  className={`w-full py-3 rounded-xl font-bold text-sm shadow-lg transition flex items-center justify-center space-x-2 mt-4 ${
                    isRegisterButtonDisabled
                      ? "bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700"
                      : "bg-emerald-600 hover:bg-emerald-500 text-white"
                  }`}
                >
                  <UserPlus className="w-4 h-4" />
                  <span>{isSubmitting ? "Регистрация..." : "Зарегистрироваться в клубе"}</span>
                </button>
              </form>
            )}
          </div>
        )}

      </div>
    </div>
  );
};
