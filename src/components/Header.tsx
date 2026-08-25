import React, { useState, useEffect, useRef } from "react";
import { UserProfile, WeatherData } from "../types";
import { isAdminRole } from "../types/database.types";
import { evaluatePermissions } from "../hooks/usePermissions";
import { fetchRealTimeWeather } from "../utils/weatherService";
import logoSrc from "../assets/images/logotip.gif";
import { 
  CloudSun, 
  ExternalLink, 
  Compass, 
  BarChart3, 
  Table, 
  Newspaper, 
  PlusCircle, 
  Thermometer, 
  Droplet, 
  Sparkles, 
  RefreshCw,
  Sun,
  Moon,
  Type,
  X,
  User,
  ShieldCheck,
  Clock,
  Settings2,
  ChevronDown,
  Wifi,
  WifiOff,
  CloudUpload
} from "lucide-react";

interface HeaderProps {
  weather: WeatherData;
  activeTab: "overview" | "analytics" | "journal" | "newspaper" | "pisa" | "symbolism" | "admin";
  setActiveTab: (tab: "overview" | "analytics" | "journal" | "newspaper" | "pisa" | "symbolism" | "admin") => void;
  onOpenDataEntry: () => void;
  onQuickAddWeather: () => void;
  onWeatherUpdate?: (newWeather: WeatherData) => void;
  theme: "dark" | "light";
  onToggleTheme: () => void;
  fontSize: "compact" | "normal" | "large";
  setFontSize: (size: "compact" | "normal" | "large") => void;
  currentUser: UserProfile | null;
  onOpenAuthModal: () => void;
  pendingUsersCount?: number;
  onOpenPisaModal?: () => void;
  onOpenPassportModal?: () => void;
  onOpenSymbolism?: () => void;
  isOnline?: boolean;
  pendingSyncCount?: number;
  onSyncPendingRecords?: () => void;
  isSyncing?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  weather: initialWeather,
  activeTab,
  setActiveTab,
  onOpenDataEntry,
  onQuickAddWeather,
  onWeatherUpdate,
  theme,
  onToggleTheme,
  fontSize,
  setFontSize,
  currentUser,
  onOpenAuthModal,
  pendingUsersCount = 0,
  onOpenPisaModal,
  onOpenPassportModal,
  onOpenSymbolism,
  isOnline = true,
  pendingSyncCount = 0,
  onSyncPendingRecords,
  isSyncing = false
}) => {
  const [currentWeather, setCurrentWeather] = useState<WeatherData>(initialWeather);
  const [isRefreshingWeather, setIsRefreshingWeather] = useState(false);
  const [isLogoModalOpen, setIsLogoModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const settingsMenuRef = useRef<HTMLDivElement>(null);

  const handleLogoClick = () => {
    if (onOpenSymbolism) {
      onOpenSymbolism();
    } else {
      setActiveTab("symbolism");
    }
  };

  // Real-time Weather Auto-update loop
  const updateWeather = async () => {
    setIsRefreshingWeather(true);
    const updated = await fetchRealTimeWeather();
    setCurrentWeather(updated);
    if (onWeatherUpdate) onWeatherUpdate(updated);
    setIsRefreshingWeather(false);
  };

  useEffect(() => {
    updateWeather();
    const interval = setInterval(updateWeather, 60000);
    return () => clearInterval(interval);
  }, []);

  // Close settings menu on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (settingsMenuRef.current && !settingsMenuRef.current.contains(event.target as Node)) {
        setIsSettingsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Auto-close logo lightbox after 5 seconds
  useEffect(() => {
    if (isLogoModalOpen) {
      const timer = setTimeout(() => {
        setIsLogoModalOpen(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [isLogoModalOpen]);

  const isDark = theme === "dark";
  const permissions = evaluatePermissions(currentUser);

  return (
    <header className={`w-full border-b transition-colors duration-300 sticky top-0 z-40 backdrop-blur-md shadow-xl ${
      isDark 
        ? "bg-[#0d1a15]/95 border-emerald-800/60 text-slate-100" 
        : "bg-[#e8f0eb]/95 border-emerald-300 text-slate-800"
    }`}>
      <div className="max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-2.5">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-2.5 lg:gap-4">
          
          {/* Logo & Branding */}
          <div className="flex items-center space-x-2.5 sm:space-x-3 w-full lg:w-auto justify-between lg:justify-start shrink-0">
            <div className="flex items-center space-x-2.5 sm:space-x-3">
              {/* Logo Button */}
              <button
                type="button"
                onClick={handleLogoClick}
                title="Эмблема эко-клуба «Земляне» (нажмите, чтобы открыть описание символики)"
                className="group relative flex items-center justify-center hover:scale-105 active:scale-95 transition-all duration-200 shrink-0"
              >
                <img
                  src={logoSrc}
                  alt="Логотип Земляне"
                  referrerPolicy="no-referrer"
                  className="w-20 h-20 sm:w-28 sm:h-28 object-contain group-hover:scale-105 transition-transform duration-200 drop-shadow-md"
                />
              </button>

              <div className="cursor-pointer" onClick={handleLogoClick} title="Нажмите, чтобы открыть описание символики клуба">
                <div className="flex items-center space-x-1.5">
                  <h1 className={`text-lg sm:text-2xl font-extrabold tracking-tight font-serif ${
                    isDark 
                      ? "bg-gradient-to-r from-emerald-300 via-teal-100 to-amber-300 bg-clip-text text-transparent" 
                      : "text-emerald-900"
                  }`}>
                    Zemlyane.DataSpace
                  </h1>
                </div>
                <p className={`text-[9px] sm:text-[10px] font-mono tracking-wider uppercase font-semibold hidden sm:block ${
                  isDark ? "text-emerald-400/80" : "text-emerald-700"
                }`}>
                  Эко-мониторинг • Долговременные исследования
                </p>
              </div>
            </div>

            {/* Mobile Quick Add Button - ONLY for roles with canCreateRecords */}
            {permissions.canCreateRecords && (
              <button
                onClick={onOpenDataEntry}
                className="lg:hidden px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs flex items-center space-x-1 shadow-lg border border-emerald-400/40 shrink-0"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>+ Запись</span>
              </button>
            )}
          </div>

          {/* Right Header Cluster: Streamlined Compact Weather + Settings Dropdown + Simple Account */}
          <div className="flex items-center justify-between sm:justify-end w-full lg:w-auto gap-2 shrink-0">
            
            {/* 1. Ultra-Compact 1-Line Weather Informer with Hover Action Buttons */}
            <div className={`group relative px-2.5 py-1.5 rounded-xl border shadow-sm flex items-center space-x-2 text-xs transition-all ${
              isDark 
                ? "bg-[#13261f]/90 border-emerald-800/60 hover:border-emerald-500 text-slate-100" 
                : "bg-white/95 border-emerald-300 hover:border-emerald-500 text-slate-800"
            }`}>
              <CloudSun className="w-4 h-4 text-amber-400 shrink-0" />
              
              <div className="flex items-center space-x-2 text-xs font-semibold whitespace-nowrap">
                <span className="hidden sm:inline text-[11px] text-emerald-400/90 font-medium">Александровка:</span>
                <span className="text-amber-400 flex items-center font-bold">
                  <Thermometer className="w-3 h-3 mr-0.5 inline text-amber-400" />
                  {currentWeather.temperature}
                </span>
                <span className="text-slate-500">|</span>
                <span className="text-sky-400 flex items-center font-bold">
                  <Droplet className="w-3 h-3 mr-0.5 inline text-sky-400" />
                  {currentWeather.humidity}
                </span>
              </div>

              {/* Refresh weather icon */}
              <button 
                onClick={updateWeather} 
                title="Обновить метеоданные"
                className="p-0.5 text-emerald-400/70 hover:text-amber-400 transition"
              >
                <RefreshCw className={`w-3 h-3 ${isRefreshingWeather ? "animate-spin" : ""}`} />
              </button>

              {/* Floating Action Buttons shown on hover */}
              <div className="absolute left-1/2 -translate-x-1/2 top-full mt-1 hidden group-hover:flex items-center space-x-1.5 p-1.5 rounded-xl bg-[#091510] border border-emerald-600/80 shadow-2xl z-50 animate-in fade-in duration-150 whitespace-nowrap backdrop-blur-md">
                <a
                  href="https://yandex.ru/pogoda/ru?lat=53.54770279&lon=63.87924576&via=ssc"
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Открыть подробный прогноз на Яндекс Погоде"
                  className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-[10px] font-bold transition flex items-center space-x-1 border border-slate-700 shadow"
                >
                  <span>Яндекс Погода</span>
                  <ExternalLink className="w-2.5 h-2.5" />
                </a>

                {permissions.canCreateRecords && (
                  <button
                    onClick={onQuickAddWeather}
                    title="Зафиксировать текущие метеоданные в полевом журнале"
                    className="px-2 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[10px] font-bold transition flex items-center space-x-1 shadow"
                  >
                    <Sparkles className="w-2.5 h-2.5 text-amber-300" />
                    <span>+ Журнал</span>
                  </button>
                )}
              </div>
            </div>

            {/* 1b. Network & Offline Sync Status Indicator */}
            <div className="flex items-center space-x-1.5 shrink-0">
              {isOnline ? (
                <div 
                  className={`px-2 py-1 rounded-xl border text-[11px] font-semibold flex items-center space-x-1.5 transition ${
                    pendingSyncCount > 0
                      ? isDark
                        ? "bg-amber-950/70 border-amber-500/70 text-amber-300"
                        : "bg-amber-50 border-amber-400 text-amber-900"
                      : isDark
                        ? "bg-[#13261f]/80 border-emerald-800/60 text-emerald-300"
                        : "bg-white/90 border-emerald-300 text-emerald-800"
                  }`}
                  title={
                    pendingSyncCount > 0
                      ? `Онлайн • Записей в очереди на синхронизацию: ${pendingSyncCount}`
                      : "Подключение к сети активно • Все данные синхронизированы"
                  }
                >
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  <span className="hidden sm:inline">Онлайн</span>
                  {pendingSyncCount > 0 && (
                    <span className="px-1.5 py-0.2 bg-amber-500 text-slate-950 rounded-full font-black text-[10px]">
                      {pendingSyncCount}
                    </span>
                  )}
                </div>
              ) : (
                <div 
                  className={`px-2 py-1 rounded-xl border text-[11px] font-bold flex items-center space-x-1.5 transition ${
                    isDark
                      ? "bg-orange-950/90 border-orange-500 text-orange-300"
                      : "bg-orange-50 border-orange-400 text-orange-900"
                  }`}
                  title="Офлайн-режим • Новые замеры сохраняются локально на устройстве и отправятся в базу при появлении сети"
                >
                  <WifiOff className="w-3.5 h-3.5 text-orange-400 animate-pulse" />
                  <span className="hidden xs:inline sm:inline">Офлайн</span>
                  {pendingSyncCount > 0 && (
                    <span className="px-1.5 py-0.2 bg-orange-500 text-slate-950 rounded-full font-black text-[10px]">
                      {pendingSyncCount}
                    </span>
                  )}
                </div>
              )}

              {/* Sync Trigger Button if pending count > 0 */}
              {pendingSyncCount > 0 && onSyncPendingRecords && (
                <button
                  type="button"
                  onClick={onSyncPendingRecords}
                  disabled={isSyncing || !isOnline}
                  className={`px-2.5 py-1 rounded-xl text-xs font-bold transition flex items-center space-x-1 shadow-md border ${
                    !isOnline
                      ? "bg-slate-800/80 border-slate-700 text-slate-400 cursor-not-allowed"
                      : isDark
                        ? "bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-400/60 active:scale-95"
                        : "bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-700 active:scale-95"
                  }`}
                  title={
                    !isOnline 
                      ? "Синхронизация станет доступна при подключении к сети"
                      : "Синхронизировать накопленные офлайн-замеры с базой Supabase"
                  }
                >
                  <CloudUpload className={`w-3.5 h-3.5 ${isSyncing ? "animate-bounce" : ""}`} />
                  <span className="hidden md:inline">{isSyncing ? "Синхронизация..." : "Синхронизировать"}</span>
                </button>
              )}
            </div>

            {/* 2. Unified Settings Dropdown Menu (Theme day/night & Font size A-/A/A+) */}
            <div className="relative" ref={settingsMenuRef}>
              <button
                onClick={() => setIsSettingsOpen(prev => !prev)}
                title="Настройки оформления (Тема оформления и размер шрифта)"
                className={`p-2 rounded-xl border text-xs font-bold flex items-center space-x-1 shadow transition ${
                  isDark 
                    ? "bg-[#13261f] border-emerald-800/80 text-emerald-300 hover:bg-[#18362a]" 
                    : "bg-white border-emerald-300 text-emerald-900 hover:bg-emerald-50"
                } ${isSettingsOpen ? "ring-2 ring-emerald-400" : ""}`}
              >
                <Settings2 className="w-4 h-4 text-emerald-400" />
                <ChevronDown className={`w-3 h-3 transition-transform ${isSettingsOpen ? "rotate-180" : ""}`} />
              </button>

              {/* Settings Dropdown Popover */}
              {isSettingsOpen && (
                <div className={`absolute right-0 top-full mt-1.5 w-56 p-3 rounded-2xl border shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-150 backdrop-blur-lg ${
                  isDark 
                    ? "bg-[#0d1c16]/95 border-emerald-700/80 text-slate-100" 
                    : "bg-white/95 border-emerald-300 text-slate-800"
                }`}>
                  <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 mb-2 border-b border-emerald-800/50 pb-1 flex items-center justify-between">
                    <span>Оформление</span>
                    <Settings2 className="w-3 h-3" />
                  </div>

                  {/* Theme Switcher Row */}
                  <div className="flex items-center justify-between py-1.5">
                    <span className="text-xs font-medium text-slate-300 flex items-center space-x-1.5">
                      {isDark ? <Moon className="w-3.5 h-3.5 text-amber-400" /> : <Sun className="w-3.5 h-3.5 text-amber-500" />}
                      <span>Тема:</span>
                    </span>
                    <button
                      onClick={onToggleTheme}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center space-x-1 border ${
                        isDark 
                          ? "bg-slate-800 border-emerald-600/60 text-amber-300 hover:bg-slate-700" 
                          : "bg-emerald-50 border-emerald-300 text-emerald-900 hover:bg-emerald-100"
                      }`}
                    >
                      <span>{isDark ? "Тёмная" : "Светлая"}</span>
                    </button>
                  </div>

                  {/* Font Size Row */}
                  <div className="pt-2 mt-1 border-t border-emerald-800/40">
                    <div className="flex items-center justify-between mb-1.5 text-xs text-slate-300">
                      <span className="flex items-center space-x-1">
                        <Type className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Размер шрифта:</span>
                      </span>
                    </div>
                    <div className={`grid grid-cols-3 gap-1 p-1 rounded-xl border ${
                      isDark ? "bg-[#091510] border-emerald-900" : "bg-slate-100 border-slate-200"
                    }`}>
                      <button
                        onClick={() => setFontSize("compact")}
                        className={`py-1 text-xs rounded-lg font-bold transition ${
                          fontSize === "compact"
                            ? "bg-emerald-600 text-white shadow"
                            : "hover:bg-emerald-500/20 text-slate-400 hover:text-slate-200"
                        }`}
                        title="Компактный шрифт"
                      >
                        А-
                      </button>
                      <button
                        onClick={() => setFontSize("normal")}
                        className={`py-1 text-xs rounded-lg font-bold transition ${
                          fontSize === "normal"
                            ? "bg-emerald-600 text-white shadow"
                            : "hover:bg-emerald-500/20 text-slate-400 hover:text-slate-200"
                        }`}
                        title="Стандартный шрифт"
                      >
                        А
                      </button>
                      <button
                        onClick={() => setFontSize("large")}
                        className={`py-1 text-xs rounded-lg font-bold transition ${
                          fontSize === "large"
                            ? "bg-emerald-600 text-white shadow"
                            : "hover:bg-emerald-500/20 text-slate-400 hover:text-slate-200"
                        }`}
                        title="Крупный шрифт"
                      >
                        А+
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 3. Simplified Account Component (Icon + User Name Only) */}
            <button
              onClick={onOpenAuthModal}
              title="Профиль исследователя / Вход в аккаунт"
              className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition flex items-center space-x-1.5 shadow shrink-0 ${
                !currentUser
                  ? "bg-emerald-950/80 border-emerald-500/70 text-emerald-300 hover:bg-emerald-900"
                  : currentUser?.status === "pending"
                    ? "bg-amber-950/90 border-amber-500 text-amber-300"
                    : isDark
                      ? "bg-[#13261f] border-emerald-600/70 text-emerald-200 hover:bg-emerald-900"
                      : "bg-white border-emerald-400 text-emerald-900 hover:bg-emerald-50"
              }`}
            >
              {currentUser?.status === "active" ? (
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : currentUser?.status === "pending" ? (
                <Clock className="w-4 h-4 text-amber-400 shrink-0" />
              ) : (
                <User className="w-4 h-4 text-emerald-400 shrink-0" />
              )}
              <span className="text-xs font-bold truncate max-w-[110px] sm:max-w-[140px]">
                {currentUser ? currentUser.fullName : "Войти"}
              </span>
              {pendingUsersCount > 0 && currentUser?.role === "Администратор" && (
                <span className="ml-1 px-1.5 py-0.2 bg-amber-500 text-slate-950 font-black rounded-full text-[10px]" title="Новые заявки">
                  +{pendingUsersCount}
                </span>
              )}
            </button>

          </div>

        </div>

        {/* Navigation Bar: Главная, Полевой дневник, Аналитика, Хроники Землян, PISA-практикум */}
        <div className={`mt-2.5 pt-2 border-t flex items-center justify-between overflow-x-auto no-scrollbar ${
          isDark ? "border-emerald-900/60" : "border-emerald-300/80"
        }`}>
          <nav className="flex items-center space-x-1.5 sm:space-x-2 min-w-max">
            
            {/* Главная */}
            <button
              onClick={() => setActiveTab("overview")}
              className={`px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl text-xs sm:text-sm font-bold transition flex items-center space-x-1.5 ${
                activeTab === "overview"
                  ? "bg-emerald-600 text-white shadow-lg border border-emerald-400"
                  : isDark
                    ? "text-slate-300 hover:bg-slate-800/80 hover:text-white"
                    : "text-slate-700 hover:bg-emerald-100 hover:text-emerald-900"
              }`}
            >
              <Compass className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-300" />
              <span>Главная</span>
            </button>

            {/* Полевой дневник - Only for Researcher, Correspondent, Leader, Admin */}
            {permissions.canAccessJournal && (
              <button
                onClick={() => setActiveTab("journal")}
                className={`px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl text-xs sm:text-sm font-bold transition flex items-center space-x-1.5 ${
                  activeTab === "journal"
                    ? "bg-emerald-600 text-white shadow-lg border border-emerald-400"
                    : isDark
                      ? "text-slate-300 hover:bg-slate-800/80 hover:text-white"
                      : "text-slate-700 hover:bg-emerald-100 hover:text-emerald-900"
                }`}
              >
                <Table className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-300" />
                <span>Полевой дневник</span>
              </button>
            )}

            {/* Аналитика */}
            <button
              onClick={() => setActiveTab("analytics")}
              className={`px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl text-xs sm:text-sm font-bold transition flex items-center space-x-1.5 ${
                activeTab === "analytics"
                  ? "bg-emerald-600 text-white shadow-lg border border-emerald-400"
                  : isDark
                    ? "text-slate-300 hover:bg-slate-800/80 hover:text-white"
                    : "text-slate-700 hover:bg-emerald-100 hover:text-emerald-900"
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400" />
              <span>Аналитика</span>
            </button>

            {/* Хроники Землян */}
            <button
              onClick={() => setActiveTab("newspaper")}
              className={`px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl text-xs sm:text-sm font-bold transition flex items-center space-x-1.5 ${
                activeTab === "newspaper"
                  ? "bg-emerald-600 text-white shadow-lg border border-emerald-400"
                  : isDark
                    ? "text-slate-300 hover:bg-slate-800/80 hover:text-white"
                    : "text-slate-700 hover:bg-emerald-100 hover:text-emerald-900"
              }`}
            >
              <Newspaper className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400" />
              <span>Хроники Землян</span>
            </button>

            {/* PISA-практикум */}
            <button
              onClick={() => setActiveTab("pisa")}
              className={`px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl text-xs sm:text-sm font-bold transition flex items-center space-x-1.5 ${
                activeTab === "pisa"
                  ? "bg-emerald-600 text-white shadow-lg border border-emerald-400"
                  : isDark
                    ? "text-slate-300 hover:bg-slate-800/80 hover:text-white"
                    : "text-slate-700 hover:bg-emerald-100 hover:text-emerald-900"
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-300" />
              <span>PISA-практикум</span>
            </button>

            {/* Панель администратора (Only visible for Admins / Managers) */}
            {isAdminRole(currentUser?.role) && (
              <button
                onClick={() => setActiveTab("admin")}
                className={`px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl text-xs sm:text-sm font-bold transition flex items-center space-x-1.5 ${
                  activeTab === "admin"
                    ? "bg-amber-600 text-white shadow-lg border border-amber-400"
                    : "bg-amber-950/70 text-amber-300 border border-amber-800/80 hover:bg-amber-900"
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400" />
                <span>Админ-панель</span>
                {pendingUsersCount > 0 && (
                  <span className="ml-1 px-1.5 py-0.2 bg-amber-400 text-slate-950 font-black rounded-full text-[10px] animate-pulse">
                    +{pendingUsersCount}
                  </span>
                )}
              </button>
            )}
          </nav>

          {/* Desktop New Record Action Button - ONLY for canCreateRecords */}
          {permissions.canCreateRecords && (
            <button
              onClick={onOpenDataEntry}
              className="hidden lg:flex items-center space-x-2 px-3.5 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold rounded-xl text-xs shadow-xl transition transform hover:-translate-y-0.5 border border-emerald-400/40"
            >
              <PlusCircle className="w-4 h-4 text-emerald-200" />
              <span>+ Новая запись</span>
            </button>
          )}
        </div>

      </div>

      {/* Enlarged Logo Lightbox Modal */}
      {isLogoModalOpen && (
        <div 
          onClick={() => setIsLogoModalOpen(false)}
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-fade-in overflow-y-auto"
        >
          <div 
            onClick={(e) => e.stopPropagation()} 
            className="relative bg-[#0f1d18] border-2 border-emerald-400 rounded-3xl p-6 sm:p-8 shadow-2xl max-w-xl w-full text-left space-y-4 my-auto max-h-[90vh] overflow-y-auto"
          >
            <button
              onClick={() => setIsLogoModalOpen(false)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white bg-slate-800 rounded-full transition border border-slate-700"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex flex-col sm:flex-row items-center gap-4 border-b border-emerald-800/80 pb-4">
              <img
                src={logoSrc}
                alt="Эко-клуб Земляне"
                referrerPolicy="no-referrer"
                className="w-24 h-24 sm:w-32 sm:h-32 shrink-0 object-contain drop-shadow-xl"
              />
              <div>
                <h3 className="text-xl font-bold text-white font-serif">
                  Символика логотипа «Земляне»
                </h3>
                <p className="text-xs text-amber-300 mt-1 font-mono uppercase tracking-wider">
                  Эмблема эко-сообщества и мониторинговой платформы
                </p>
              </div>
            </div>

            <div className="space-y-2.5 text-xs sm:text-sm text-slate-200 leading-relaxed font-sans">
              <div className="p-2 bg-[#13261f] rounded-xl border border-emerald-800/60">
                <span className="font-bold text-amber-300">ЧЕЛОВЕК</span> — часть природы, личная ответственность.
              </div>
              <div className="p-2 bg-[#13261f] rounded-xl border border-emerald-800/60">
                <span className="font-bold text-emerald-300">ГОЛОВА (НАША ПЛАНЕТА)</span> — дом, в котором мы живем.
              </div>
              <div className="p-2 bg-[#13261f] rounded-xl border border-emerald-800/60">
                <span className="font-bold text-teal-300">СПИРАЛЬ</span> — символ жизни и бесконечного развития.
              </div>
              <div className="p-2 bg-[#13261f] rounded-xl border border-emerald-800/60">
                <span className="font-bold text-amber-400">СЕМЬ ЛУЧЕЙ</span> — универсальный код Вселенной.
              </div>
              <div className="p-2 bg-[#13261f] rounded-xl border border-emerald-800/60">
                <span className="font-bold text-emerald-400">ГЛАВНЫЙ ЛУЧ «Древо жизни»</span> — символ школьного сообщества.
              </div>
            </div>

            <div className="pt-2 text-center">
              <button
                onClick={() => setIsLogoModalOpen(false)}
                className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs shadow-lg transition"
              >
                Понятно
              </button>
            </div>
          </div>
        </div>
      )}

    </header>
  );
};
