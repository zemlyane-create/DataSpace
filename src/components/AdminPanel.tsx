import React, { useState, useEffect } from "react";
import { 
  Users, 
  Shield, 
  ShieldCheck, 
  Trash2, 
  UserPlus, 
  RefreshCw, 
  Search, 
  Filter, 
  AlertTriangle, 
  CheckCircle2, 
  X, 
  Sparkles,
  KeyRound,
  Mail,
  UserCheck,
  Calendar,
  Eraser,
  Clock,
  Check,
  XCircle,
  AtSign
} from "lucide-react";
import { 
  UserProfileClient, 
  normalizeRole, 
  isAdminRole, 
  isPendingRole,
  isRejectedRole,
  getUserStatusFromRole,
  extractNicknameFromEmail, 
  nicknameToTechnicalEmail, 
  validateNickname 
} from "../types/database.types";
import { UserProfile, UserRole } from "../types";
import { 
  getProfiles, 
  updateProfile, 
  deleteProfile, 
  registerUser, 
  cleanTestProfiles, 
  ADMIN_CREDENTIALS 
} from "../services/clubService";
import { validatePassword } from "../utils/passwordValidator";
import { PasswordStrengthIndicator } from "./PasswordStrengthIndicator";

interface AdminPanelProps {
  currentUser: UserProfile | null;
  onRefreshAppState?: () => void;
  onNavigateToTab?: (tab: string) => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({
  currentUser,
  onRefreshAppState,
  onNavigateToTab,
}) => {
  const [profiles, setProfiles] = useState<UserProfileClient[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "PENDING" | "ACTIVE" | "REJECTED">("ALL");
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>("ALL");

  // Create User Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [newFullName, setNewFullName] = useState<string>("");
  const [newEmail, setNewEmail] = useState<string>("");
  const [newRole, setNewRole] = useState<string>("Исследователь");
  const [newStatus, setNewStatus] = useState<string>("active");
  const [newPassword, setNewPassword] = useState<string>("");

  // Temporary role assignments during pending review (profileId -> selectedRole)
  const [pendingRoleSelections, setPendingRoleSelections] = useState<Record<string, string>>({});

  // Delete Confirmation Modal State
  const [profileToDelete, setProfileToDelete] = useState<UserProfileClient | null>(null);
  const [isCleaningTests, setIsCleaningTests] = useState<boolean>(false);
  const [cleanConfirmOpen, setCleanConfirmOpen] = useState<boolean>(false);

  const fetchUsers = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const data = await getProfiles();
      setProfiles(data);
      // Initialize pending role selections
      const initialRoles: Record<string, string> = {};
      data.forEach(p => {
        initialRoles[p.id] = p.role || "Участник";
      });
      setPendingRoleSelections(initialRoles);
    } catch (err: any) {
      console.error("[AdminPanel] Failed to load profiles:", err);
      setErrorMsg(err.message || "Не удалось загрузить список пользователей из базы данных.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleApproveUser = async (profileId: string, roleToAssign?: string) => {
    setErrorMsg(null);
    const target = profiles.find(p => p.id === profileId);
    if (!target) return;

    const assignedRole = roleToAssign || pendingRoleSelections[profileId] || (target.role && !isPendingRole(target.role) ? target.role : "Исследователь");

    try {
      await updateProfile(profileId, { 
        role: assignedRole 
      });

      setProfiles((prev) =>
        prev.map((p) => (p.id === profileId ? { ...p, role: assignedRole, status: "active" } : p))
      );

      setSuccessMsg(`Регистрация пользователя ${target.fullName} подтверждена! Назначена роль «${assignedRole}».`);
      if (onRefreshAppState) onRefreshAppState();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      console.error("[AdminPanel] Approve user error:", err);
      setErrorMsg(`Ошибка подтверждения регистрации: ${err.message}`);
    }
  };

  const handleRejectUser = async (profileId: string) => {
    setErrorMsg(null);
    const target = profiles.find(p => p.id === profileId);
    if (!target) return;

    try {
      await updateProfile(profileId, { role: "Отклонен" });

      setProfiles((prev) =>
        prev.map((p) => (p.id === profileId ? { ...p, role: "Отклонен", status: "rejected" } : p))
      );

      setSuccessMsg(`Заявка пользователя ${target.fullName} отклонена.`);
      if (onRefreshAppState) onRefreshAppState();
      setTimeout(() => setSuccessMsg(null), 3500);
    } catch (err: any) {
      console.error("[AdminPanel] Reject user error:", err);
      setErrorMsg(`Ошибка отклонения заявки: ${err.message}`);
    }
  };

  const handleStatusChange = async (profileId: string, updatedStatus: string) => {
    setErrorMsg(null);
    const target = profiles.find(p => p.id === profileId);
    let targetRole = target?.role || "Исследователь";

    if (updatedStatus === "pending") {
      targetRole = "Ожидает";
    } else if (updatedStatus === "rejected") {
      targetRole = "Отклонен";
    } else if (isPendingRole(targetRole) || isRejectedRole(targetRole)) {
      targetRole = "Исследователь";
    }

    try {
      await updateProfile(profileId, { role: targetRole });
      setProfiles((prev) =>
        prev.map((p) => (p.id === profileId ? { ...p, role: targetRole, status: updatedStatus } : p))
      );
      setSuccessMsg(`Статус аккаунта успешно обновлен на «${updatedStatus === "active" ? "Активен" : updatedStatus === "pending" ? "В ожидании" : "Отклонен"}» (роль: «${targetRole}»)`);
      if (onRefreshAppState) onRefreshAppState();
      setTimeout(() => setSuccessMsg(null), 3500);
    } catch (err: any) {
      console.error("[AdminPanel] Status update error:", err);
      setErrorMsg(`Ошибка смены статуса: ${err.message}`);
    }
  };

  const handleRoleChange = async (profileId: string, updatedRole: string) => {
    setErrorMsg(null);
    setPendingRoleSelections(prev => ({ ...prev, [profileId]: updatedRole }));

    try {
      await updateProfile(profileId, { role: updatedRole });
      setProfiles((prev) =>
        prev.map((p) => (p.id === profileId ? { ...p, role: updatedRole, status: getUserStatusFromRole(updatedRole, p.email) } : p))
      );
      setSuccessMsg(`Роль пользователя успешно обновлена на «${updatedRole}»`);
      if (onRefreshAppState) onRefreshAppState();
      setTimeout(() => setSuccessMsg(null), 3500);
    } catch (err: any) {
      console.error("[AdminPanel] Role update error:", err);
      setErrorMsg(`Ошибка смены роли: ${err.message}`);
    }
  };

  const handleDeleteUser = async () => {
    if (!profileToDelete) return;
    setErrorMsg(null);
    try {
      const success = await deleteProfile(profileToDelete.id);
      if (success) {
        setProfiles((prev) => prev.filter((p) => p.id !== profileToDelete.id));
        setSuccessMsg(`Пользователь ${profileToDelete.email} успешно удален из базы данных.`);
        if (onRefreshAppState) onRefreshAppState();
      } else {
        setErrorMsg("Не удалось удалить пользователя из базы данных.");
      }
    } catch (err: any) {
      setErrorMsg(`Ошибка при удалении: ${err.message}`);
    } finally {
      setProfileToDelete(null);
      setTimeout(() => setSuccessMsg(null), 3500);
    }
  };

  const handleCleanTestAccounts = async () => {
    setIsCleaningTests(true);
    setErrorMsg(null);
    setCleanConfirmOpen(false);
    try {
      const result = await cleanTestProfiles();
      await fetchUsers();
      if (onRefreshAppState) onRefreshAppState();
      setSuccessMsg(
        `Очистка завершена: удалено ${result.deletedCount} тестовых аккаунтов.`
      );
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setErrorMsg(`Ошибка при очистке: ${err.message}`);
    } finally {
      setIsCleaningTests(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail.trim() || !newFullName.trim()) return;

    if (newPassword.trim()) {
      const pwdCheck = validatePassword(newPassword);
      if (!pwdCheck.isValid) {
        setErrorMsg("Пароль должен содержать не менее 8 символов, заглавные и строчные буквы, цифры и спецсимвол.");
        return;
      }
    }

    setErrorMsg(null);
    try {
      const technicalEmail = nicknameToTechnicalEmail(newEmail.trim());
      const roleToRegister = newStatus === "pending" ? "Ожидает" : (newRole || "Исследователь");
      const created = await registerUser({
        email: technicalEmail,
        fullName: newFullName.trim(),
        role: roleToRegister,
        password: newPassword.trim() || undefined,
      });

      setProfiles((prev) => [created, ...prev.filter((p) => p.id !== created.id)]);
      setPendingRoleSelections(prev => ({ ...prev, [created.id]: created.role }));
      const userNick = created.nickname || extractNicknameFromEmail(created.email);
      setSuccessMsg(`Пользователь ${created.fullName} (@${userNick}) успешно зарегистрирован со статусом «${newStatus === "active" ? "Активен" : "В ожидании"}» и ролью «${roleToRegister}»!`);
      setIsAddModalOpen(false);
      setNewFullName("");
      setNewEmail("");
      setNewPassword("");
      setNewRole("Исследователь");
      setNewStatus("active");
      if (onRefreshAppState) onRefreshAppState();
      setTimeout(() => setSuccessMsg(null), 3500);
    } catch (err: any) {
      setErrorMsg(`Ошибка добавления пользователя: ${err.message}`);
    }
  };

  // Filtered Profiles
  const filteredProfiles = profiles.filter((p) => {
    const matchesSearch =
      p.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.email.toLowerCase().includes(searchQuery.toLowerCase());
    
    const userStatus = getUserStatusFromRole(p.role, p.email);
    const matchesStatus =
      statusFilter === "ALL" ||
      (statusFilter === "PENDING" && userStatus === "pending") ||
      (statusFilter === "ACTIVE" && userStatus === "active") ||
      (statusFilter === "REJECTED" && userStatus === "rejected");

    const matchesRole =
      selectedRoleFilter === "ALL" || p.role.toLowerCase() === selectedRoleFilter.toLowerCase();
    return matchesSearch && matchesStatus && matchesRole;
  });

  // Calculate quick stats
  const totalCount = profiles.length;
  const pendingCount = profiles.filter((p) => isPendingRole(p.role)).length;
  const activeCount = profiles.filter((p) => getUserStatusFromRole(p.role, p.email) === "active").length;
  const adminCount = profiles.filter((p) => isAdminRole(p.role)).length;
  const researcherCount = profiles.filter((p) => normalizeRole(p.role) === "Исследователь").length;

  const isAdminUser = isAdminRole(currentUser?.role);

  if (!isAdminUser) {
    return (
      <div className="max-w-4xl mx-auto my-12 p-8 bg-[#0f1d18] border border-amber-500/40 rounded-3xl text-center text-slate-100 shadow-xl">
        <div className="w-16 h-16 mx-auto mb-4 bg-amber-950/80 rounded-2xl flex items-center justify-center text-amber-400 border border-amber-700">
          <AlertTriangle className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold font-serif text-amber-300 mb-2">
          Доступ ограничен
        </h2>
        <p className="text-sm text-slate-300 max-w-md mx-auto mb-6">
          Панель администратора доступна исключительно пользователям с подтвержденной ролью «Администратор» или «Руководитель».
        </p>
        {onNavigateToTab && (
          <button
            onClick={() => onNavigateToTab("overview")}
            className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-sm transition shadow"
          >
            Вернуться на главную
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto text-slate-100 font-sans pb-12">
      {/* Top Header Banner */}
      <div className="bg-gradient-to-r from-[#0d221a] via-[#102a20] to-[#0a1813] border-2 border-emerald-500/60 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center space-x-4">
            <div className="p-3.5 bg-emerald-950/90 border border-emerald-600 rounded-2xl text-emerald-400 shadow-inner">
              <ShieldCheck className="w-8 h-8" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-2xl sm:text-3xl font-bold font-serif text-white tracking-tight">
                  Панель Администратора
                </h1>
                <span className="px-2.5 py-0.5 bg-emerald-900/80 border border-emerald-500 text-[11px] font-bold rounded-full text-emerald-300">
                  Supabase `profiles`
                </span>
              </div>
              <p className="text-xs sm:text-sm text-emerald-200/90 mt-1">
                Подтверждение заявок на регистрацию, назначение ролей и управление доступом исследователей
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs sm:text-sm transition flex items-center space-x-2 shadow-lg hover:shadow-emerald-900/40"
            >
              <UserPlus className="w-4 h-4" />
              <span>Добавить участника</span>
            </button>

            <button
              onClick={() => setCleanConfirmOpen(true)}
              disabled={isCleaningTests}
              className="px-4 py-2.5 bg-amber-950 hover:bg-amber-900 text-amber-200 border border-amber-700/80 rounded-xl font-bold text-xs sm:text-sm transition flex items-center space-x-2"
              title="Удаляет аккаунты с почтовыми доменами test, demo, example"
            >
              <Eraser className="w-4 h-4 text-amber-400" />
              <span>{isCleaningTests ? "Очистка..." : "Очистить тестовые"}</span>
            </button>

            <button
              onClick={fetchUsers}
              disabled={isLoading}
              className="p-2.5 bg-slate-800/90 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700 transition"
              title="Обновить список пользователей"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin text-emerald-400" : ""}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Prominent Pending Registrations Alert Banner */}
      {pendingCount > 0 && (
        <div className="p-4 bg-gradient-to-r from-amber-950/90 via-amber-900/70 to-amber-950/90 border-2 border-amber-500 rounded-3xl flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xl animate-fade-in">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-amber-900/80 rounded-xl border border-amber-500 text-amber-300 animate-pulse">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-amber-200 text-sm sm:text-base">
                Новые заявки на регистрацию ({pendingCount})
              </h3>
              <p className="text-xs text-amber-100/80 mt-0.5">
                Пользователи зарегистрировались и ожидают вашего подтверждения и назначения роли в эко-клубе.
              </p>
            </div>
          </div>
          <button
            onClick={() => setStatusFilter("PENDING")}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs sm:text-sm transition shadow shrink-0 flex items-center space-x-1.5"
          >
            <span>Показать только ожидающие ({pendingCount})</span>
          </button>
        </div>
      )}

      {/* Real-time Notifications */}
      {successMsg && (
        <div className="p-4 bg-emerald-950/90 border border-emerald-500 rounded-2xl flex items-center space-x-3 text-emerald-200 text-sm animate-fade-in shadow-lg">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="font-medium">{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 bg-rose-950/90 border border-rose-600 rounded-2xl flex items-center space-x-3 text-rose-200 text-sm animate-fade-in shadow-lg">
          <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
          <span className="font-medium">{errorMsg}</span>
        </div>
      )}

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {/* Total Users */}
        <button
          onClick={() => setStatusFilter("ALL")}
          className={`text-left bg-[#11231c] border rounded-2xl p-4 shadow transition hover:border-emerald-500 ${
            statusFilter === "ALL" ? "border-emerald-500 ring-2 ring-emerald-500/40" : "border-emerald-800/80"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-bold uppercase">Всего участников</span>
            <Users className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-bold font-serif text-white mt-2">{totalCount}</p>
          <p className="text-[10px] text-emerald-400 mt-0.5">В таблице `profiles`</p>
        </button>

        {/* Pending Approval (Active Action KPI) */}
        <button
          onClick={() => setStatusFilter("PENDING")}
          className={`text-left bg-[#1a1c12] border rounded-2xl p-4 shadow transition hover:border-amber-400 ${
            pendingCount > 0 ? "border-amber-500/90 bg-amber-950/40" : "border-amber-800/60"
          } ${statusFilter === "PENDING" ? "ring-2 ring-amber-400" : ""}`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs text-amber-300 font-bold uppercase">Ожидают роли</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-2xl font-bold font-serif text-amber-300 mt-2 flex items-center space-x-2">
            <span>{pendingCount}</span>
            {pendingCount > 0 && (
              <span className="px-2 py-0.5 bg-amber-500 text-slate-950 text-[10px] font-black rounded-full uppercase tracking-wider">
                Требуют решения
              </span>
            )}
          </p>
          <p className="text-[10px] text-amber-300/80 mt-0.5">Нажмите для фильтрации</p>
        </button>

        {/* Researchers */}
        <button
          onClick={() => { setStatusFilter("ALL"); setSelectedRoleFilter("Исследователь"); }}
          className="text-left bg-[#11231c] border border-emerald-800/80 rounded-2xl p-4 shadow hover:border-sky-500 transition"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-bold uppercase">Исследователи</span>
            <UserCheck className="w-4 h-4 text-sky-400" />
          </div>
          <p className="text-2xl font-bold font-serif text-sky-300 mt-2">{researcherCount}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">Полевой мониторинг</p>
        </button>

        {/* Admins */}
        <div className="bg-[#11231c] border border-emerald-800/80 rounded-2xl p-4 shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-bold uppercase">Администраторы</span>
            <Shield className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-2xl font-bold font-serif text-amber-300 mt-2">{adminCount}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">Полный доступ к системе</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-[#0f1d18] border border-emerald-800/70 rounded-2xl p-4 flex flex-col lg:flex-row items-center justify-between gap-3">
        {/* Status Filter Tabs */}
        <div className="flex items-center space-x-1.5 w-full lg:w-auto overflow-x-auto no-scrollbar">
          <button
            onClick={() => setStatusFilter("ALL")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
              statusFilter === "ALL"
                ? "bg-emerald-600 text-white shadow"
                : "bg-[#162c23] text-slate-300 hover:text-white"
            }`}
          >
            Все ({profiles.length})
          </button>

          <button
            onClick={() => setStatusFilter("PENDING")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center space-x-1 whitespace-nowrap ${
              statusFilter === "PENDING"
                ? "bg-amber-500 text-slate-950 shadow"
                : "bg-amber-950/60 text-amber-300 border border-amber-700/60 hover:bg-amber-900"
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Ожидают подтверждения ({pendingCount})</span>
          </button>

          <button
            onClick={() => setStatusFilter("ACTIVE")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
              statusFilter === "ACTIVE"
                ? "bg-emerald-600 text-white shadow"
                : "bg-[#162c23] text-slate-300 hover:text-white"
            }`}
          >
            ✓ Активные ({activeCount})
          </button>
        </div>

        {/* Search & Role Filter */}
        <div className="flex items-center space-x-2 w-full lg:w-auto justify-end">
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Поиск по ФИО или Email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#162c23] border border-emerald-700/60 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="flex items-center space-x-1.5 shrink-0">
            <Filter className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <select
              value={selectedRoleFilter}
              onChange={(e) => setSelectedRoleFilter(e.target.value)}
              className="bg-[#162c23] border border-emerald-700/60 rounded-xl px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="ALL">Все роли</option>
              <option value="Администратор">Администраторы</option>
              <option value="Исследователь">Исследователи</option>
              <option value="Корреспондент">Корреспонденты</option>
              <option value="Участник">Участники</option>
              <option value="Руководитель">Руководители</option>
            </select>
          </div>
        </div>
      </div>

      {/* Profiles Data Table */}
      <div className="bg-[#0f1d18] border border-emerald-800/80 rounded-3xl overflow-hidden shadow-xl">
        {isLoading ? (
          <div className="p-16 text-center text-slate-400 space-y-3">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto text-emerald-400" />
            <p className="text-sm">Загрузка базы пользователей из Supabase...</p>
          </div>
        ) : filteredProfiles.length === 0 ? (
          <div className="p-16 text-center text-slate-400 space-y-3">
            <Users className="w-12 h-12 mx-auto text-emerald-700" />
            <p className="text-base font-bold text-slate-200">Пользователи не найдены</p>
            <p className="text-xs text-slate-400">Попробуйте сбросить фильтры или изменить параметры поиска.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm border-collapse">
              <thead>
                <tr className="bg-[#142c22] text-emerald-300 text-[11px] sm:text-xs font-bold uppercase tracking-wider border-b border-emerald-800">
                  <th className="py-3.5 px-4">Исследователь / ФИО</th>
                  <th className="py-3.5 px-4">Никнейм / Идентификатор</th>
                  <th className="py-3.5 px-4">Статус аккаунта</th>
                  <th className="py-3.5 px-4">Назначенная роль</th>
                  <th className="py-3.5 px-4">Действие подтверждения</th>
                  <th className="py-3.5 px-4">Дата подачи</th>
                  <th className="py-3.5 px-4 text-right">Удалить</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-emerald-900/60">
                {filteredProfiles.map((p) => {
                  const isPredefinedAdmin = p.email.toLowerCase() === ADMIN_CREDENTIALS.email.toLowerCase();
                  const userStatus = getUserStatusFromRole(p.role, p.email);
                  const isPending = isPendingRole(p.role);
                  const currentSelectedRole = pendingRoleSelections[p.id] || (isPending ? "Исследователь" : p.role);

                  return (
                    <tr
                      key={p.id}
                      className={`transition-colors ${
                        isPending 
                          ? "bg-amber-950/20 hover:bg-amber-950/40 border-l-4 border-l-amber-400" 
                          : "hover:bg-[#132a20]/70"
                      }`}
                    >
                      {/* Name */}
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                            p.role === "Администратор" || p.role === "admin"
                              ? "bg-amber-950 text-amber-300 border border-amber-600"
                              : isPending
                              ? "bg-amber-950 text-amber-300 border border-amber-500"
                              : "bg-emerald-950 text-emerald-300 border border-emerald-700"
                          }`}>
                            {p.fullName.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center space-x-2">
                              <p className="font-bold text-slate-100">{p.fullName}</p>
                              {isPending && (
                                <span className="px-1.5 py-0.2 bg-amber-500/20 text-amber-300 border border-amber-500/60 rounded text-[10px] font-bold">
                                  Новый
                                </span>
                              )}
                            </div>
                            {isPredefinedAdmin && (
                              <span className="text-[10px] text-amber-400 font-semibold">
                                ★ Системный Администратор
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Email & Nickname */}
                      <td className="py-3 px-4 text-xs text-slate-300">
                        <div className="flex flex-col space-y-0.5">
                          <div className="flex items-center space-x-1.5 font-bold text-emerald-300 font-mono">
                            <AtSign className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                            <span>{p.nickname || extractNicknameFromEmail(p.email)}</span>
                          </div>
                          <div className="flex items-center space-x-1 font-mono text-[10px] text-slate-500">
                            <Mail className="w-3 h-3 shrink-0" />
                            <span className="truncate max-w-[170px]">{p.email}</span>
                          </div>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4">
                        {isPredefinedAdmin ? (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-xl bg-emerald-950 text-emerald-300 border border-emerald-500 text-xs font-bold">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Активен</span>
                          </span>
                        ) : (
                          <select
                            value={userStatus}
                            onChange={(e) => handleStatusChange(p.id, e.target.value)}
                            className={`text-xs font-bold rounded-xl px-2.5 py-1 border transition focus:outline-none focus:ring-1 focus:ring-emerald-400 ${
                              userStatus === "pending"
                                ? "bg-amber-950 text-amber-300 border-amber-500"
                                : userStatus === "rejected"
                                ? "bg-rose-950 text-rose-300 border-rose-600"
                                : "bg-emerald-950 text-emerald-300 border-emerald-600"
                            }`}
                          >
                            <option value="pending">⏳ В ожидании</option>
                            <option value="active">✓ Подтвержден</option>
                            <option value="rejected">✕ Отклонен</option>
                          </select>
                        )}
                      </td>

                      {/* Role Selector */}
                      <td className="py-3 px-4">
                        <select
                          value={currentSelectedRole}
                          onChange={(e) => handleRoleChange(p.id, e.target.value)}
                          className={`bg-[#0d1c16] text-xs font-bold rounded-xl px-2.5 py-1.5 border transition focus:outline-none focus:ring-1 focus:ring-emerald-400 ${
                            currentSelectedRole === "Администратор" || currentSelectedRole === "admin"
                              ? "border-amber-600 text-amber-300 bg-amber-950/30"
                              : currentSelectedRole === "Исследователь"
                              ? "border-sky-600 text-sky-300 bg-sky-950/30"
                              : currentSelectedRole === "Корреспондент"
                              ? "border-purple-600 text-purple-300 bg-purple-950/30"
                              : currentSelectedRole === "Руководитель"
                              ? "border-amber-500 text-amber-200 bg-amber-950/30"
                              : "border-emerald-700 text-emerald-300 bg-emerald-950/30"
                          }`}
                        >
                          <option value="Исследователь">Исследователь</option>
                          <option value="Корреспондент">Корреспондент</option>
                          <option value="Участник">Участник</option>
                          <option value="Руководитель">Руководитель</option>
                          <option value="Администратор">Администратор</option>
                        </select>
                      </td>

                      {/* Action: Approve / Assign Role */}
                      <td className="py-3 px-4">
                        {isPending ? (
                          <div className="flex items-center space-x-1.5">
                            <button
                              onClick={() => handleApproveUser(p.id, currentSelectedRole)}
                              title={`Подтвердить регистрацию и назначить роль «${currentSelectedRole}»`}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs transition shadow flex items-center space-x-1 border border-emerald-400"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>Подтвердить</span>
                            </button>

                            <button
                              onClick={() => handleRejectUser(p.id)}
                              title="Отклонить заявку на регистрацию"
                              className="p-1.5 bg-rose-950 hover:bg-rose-900 text-rose-300 rounded-xl border border-rose-800 transition"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : userStatus === "active" ? (
                          <span className="inline-flex items-center space-x-1 text-emerald-400 text-xs font-semibold">
                            <Check className="w-3.5 h-3.5" />
                            <span>Роль назначена</span>
                          </span>
                        ) : (
                          <button
                            onClick={() => handleApproveUser(p.id, currentSelectedRole)}
                            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-lg border border-slate-700 transition"
                          >
                            Восстановить
                          </button>
                        )}
                      </td>

                      {/* Created At */}
                      <td className="py-3 px-4 text-xs text-slate-400">
                        <div className="flex items-center space-x-1">
                          <Calendar className="w-3 h-3 text-slate-500" />
                          <span>
                            {p.createdAt
                              ? new Date(p.createdAt).toLocaleDateString("ru-RU", {
                                  day: "2-digit",
                                  month: "2-digit",
                                  year: "numeric",
                                })
                              : "—"}
                          </span>
                        </div>
                      </td>

                      {/* Delete */}
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => setProfileToDelete(p)}
                          disabled={isPredefinedAdmin}
                          title={isPredefinedAdmin ? "Системного администратора нельзя удалить" : "Удалить профиль"}
                          className={`p-2 rounded-xl border transition ${
                            isPredefinedAdmin
                              ? "opacity-30 cursor-not-allowed border-slate-700 text-slate-500"
                              : "bg-rose-950/60 hover:bg-rose-900 border-rose-800 text-rose-300 hover:text-white"
                          }`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ADD USER MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#0f1d18] border-2 border-emerald-500 rounded-3xl max-w-md w-full p-6 shadow-2xl relative text-slate-100">
            <button
              onClick={() => setIsAddModalOpen(false)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white bg-slate-800 rounded-full transition border border-slate-700"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center space-x-3 mb-5 border-b border-emerald-800/80 pb-3">
              <div className="p-2.5 bg-emerald-950 border border-emerald-700 rounded-2xl text-emerald-400">
                <UserPlus className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold font-serif text-white">
                  Новый исследователь
                </h3>
                <p className="text-xs text-emerald-300">Добавление исследователя с назначением роли</p>
              </div>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-3.5 text-xs sm:text-sm">
              <div>
                <label className="block text-emerald-300 font-bold mb-1">
                  ФИО исследователя:
                </label>
                <input
                  type="text"
                  required
                  placeholder="Айдар Касымов (9 «А»)"
                  value={newFullName}
                  onChange={(e) => setNewFullName(e.target.value)}
                  className="w-full bg-[#162c23] border border-emerald-700 rounded-xl p-2.5 text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-emerald-300 font-bold mb-1">
                  Никнейм или Email исследователя:
                </label>
                <input
                  type="text"
                  required
                  placeholder="aidar_kasymov или aidar@zemlyane.space"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full bg-[#162c23] border border-emerald-700 rounded-xl p-2.5 text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-emerald-300 font-bold mb-1">
                    Назначаемая роль:
                  </label>
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value)}
                    className="w-full bg-[#162c23] border border-emerald-700 rounded-xl p-2.5 text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="Исследователь">Исследователь</option>
                    <option value="Корреспондент">Корреспондент</option>
                    <option value="Участник">Участник</option>
                    <option value="Руководитель">Руководитель</option>
                    <option value="Администратор">Администратор</option>
                  </select>
                </div>

                <div>
                  <label className="block text-emerald-300 font-bold mb-1">
                    Статус допуска:
                  </label>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value)}
                    className="w-full bg-[#162c23] border border-emerald-700 rounded-xl p-2.5 text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="active">✓ Подтвержден (Активен)</option>
                    <option value="pending">⏳ В ожидании (Pending)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-emerald-300 font-bold mb-1">
                  Пароль доступа (не менее 8 симв., цифры, заглавные/строчные, символ):
                </label>
                <input
                  type="password"
                  maxLength={32}
                  placeholder="Например: Eco#Pass2026"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full bg-[#162c23] border border-emerald-700 rounded-xl p-2.5 text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                />
              </div>

              {newPassword.length > 0 && (
                <PasswordStrengthIndicator password={newPassword} showAlways={true} />
              )}

              <div className="pt-3">
                <button
                  type="submit"
                  disabled={Boolean(newPassword && !validatePassword(newPassword).isValid)}
                  className={`w-full py-2.5 rounded-xl font-bold text-sm shadow-lg transition ${
                    newPassword && !validatePassword(newPassword).isValid
                      ? "bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700"
                      : "bg-emerald-600 hover:bg-emerald-500 text-white"
                  }`}
                >
                  Зарегистрировать в базе
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {profileToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#141e1a] border-2 border-rose-600 rounded-3xl max-w-md w-full p-6 shadow-2xl text-slate-100">
            <div className="w-12 h-12 bg-rose-950 rounded-2xl flex items-center justify-center text-rose-400 border border-rose-700 mb-4 mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <h3 className="text-lg font-bold font-serif text-white text-center mb-2">
              Удалить пользователя?
            </h3>
            <p className="text-xs sm:text-sm text-slate-300 text-center mb-6 leading-relaxed">
              Вы собираетесь безвозвратно удалить профиль{" "}
              <strong className="text-white font-semibold">{profileToDelete.fullName}</strong> (
              <span className="font-mono text-rose-300">{profileToDelete.email}</span>) из базы данных.
            </p>

            <div className="flex items-center space-x-3">
              <button
                onClick={() => setProfileToDelete(null)}
                className="w-1/2 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold text-xs sm:text-sm border border-slate-700 transition"
              >
                Отмена
              </button>
              <button
                onClick={handleDeleteUser}
                className="w-1/2 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl font-bold text-xs sm:text-sm shadow-lg transition"
              >
                Да, удалить
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CLEAN TEST ACCOUNTS CONFIRMATION MODAL */}
      {cleanConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#181d19] border-2 border-amber-500 rounded-3xl max-w-md w-full p-6 shadow-2xl text-slate-100">
            <div className="w-12 h-12 bg-amber-950 rounded-2xl flex items-center justify-center text-amber-400 border border-amber-700 mb-4 mx-auto">
              <Eraser className="w-6 h-6" />
            </div>

            <h3 className="text-lg font-bold font-serif text-amber-300 text-center mb-2">
              Очистка тестовых записей
            </h3>
            <p className="text-xs sm:text-sm text-slate-300 text-center mb-6 leading-relaxed">
              Будут найдены и удалены все аккаунты, содержащие в адресе почты или имени ключевые слова:{" "}
              <code className="text-amber-300 bg-black/30 px-1 py-0.5 rounded font-mono">test</code>,{" "}
              <code className="text-amber-300 bg-black/30 px-1 py-0.5 rounded font-mono">demo</code>,{" "}
              <code className="text-amber-300 bg-black/30 px-1 py-0.5 rounded font-mono">novice</code>,{" "}
              <code className="text-amber-300 bg-black/30 px-1 py-0.5 rounded font-mono">example.com</code>.
            </p>

            <div className="flex items-center space-x-3">
              <button
                onClick={() => setCleanConfirmOpen(false)}
                className="w-1/2 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold text-xs sm:text-sm border border-slate-700 transition"
              >
                Отмена
              </button>
              <button
                onClick={handleCleanTestAccounts}
                className="w-1/2 py-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl font-bold text-xs sm:text-sm shadow-lg transition"
              >
                Очистить базу
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
