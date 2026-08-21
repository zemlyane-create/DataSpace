import React, { useState, useEffect } from "react";
import { Header } from "./components/Header";
import { MapView } from "./components/MapView";
import { AnalyticsView } from "./components/AnalyticsView";
import { DataTable } from "./components/DataTable";
import { NewspaperWidget } from "./components/NewspaperWidget";
import { DataEntryModal } from "./components/DataEntryModal";
import { AuthModal } from "./components/AuthModal";
import { CategoryInfoModal } from "./components/CategoryInfoModal";
import { EcoCalendarWidget } from "./components/EcoCalendarWidget";
import { PisaPracticumModal } from "./components/PisaPracticumModal";
import { PisaPracticumBlock } from "./components/PisaPracticumBlock";
import { StationPassportModal } from "./components/StationPassportModal";
import { ClubSymbolismView } from "./components/ClubSymbolismView";
import { AdminPanel } from "./components/AdminPanel";
import { Footer } from "./components/Footer";
import { supabase, getAccessControl, fetchNewspaperNotesFromSupabase, insertNewspaperNoteToSupabase, deleteNewspaperNoteFromSupabase } from "./lib/supabase";
import { 
  loginUser, 
  logoutUser, 
  registerUser, 
  subscribeToAuthChanges, 
  refreshCurrentUserProfile,
  getProfiles, 
  ensureAdminProfileExists,
  isAdminRole,
  isPendingRole,
  isRejectedRole,
  getUserStatusFromRole,
  nicknameToTechnicalEmail, 
  ADMIN_CREDENTIALS 
} from "./services/clubService";

import {
  getPendingRecords,
  getPendingRecordsCount,
  getPendingPublications,
  getTotalPendingCount,
  enqueueOfflineRecord,
  queuePublicationForSync,
  syncAllPendingData,
  subscribeToSyncState,
  sanitizeRecordForSupabase
} from "./services/offlineSyncService";

import { 
  MonitoringStation, 
  MonitoringRecord, 
  NewspaperNote, 
  WeatherData, 
  FilterState,
  UserProfile,
  UserRole,
  UserStatus,
  CategoryInfo,
  ResearchCategory
} from "./types";

import { 
  CATEGORIES, 
  INITIAL_STATIONS, 
  INITIAL_RECORDS, 
  INITIAL_NEWSPAPER_NOTES, 
  INITIAL_WEATHER 
} from "./data/mockData";

import { 
  CloudSun, 
  Droplets, 
  Layers, 
  Trees, 
  AlertTriangle, 
  User, 
  Gem, 
  Skull, 
  Plus,
  PlusCircle, 
  Compass, 
  BarChart3, 
  Table, 
  Newspaper, 
  Clock, 
  ShieldCheck, 
  Shield, 
  Lock, 
  ArrowRight, 
  BookOpen, 
  Sparkles,
  CheckCircle2,
  RefreshCw 
} from "lucide-react";

export default function App() {
  // Navigation State
  const [activeTab, setActiveTab] = useState<"overview" | "analytics" | "journal" | "newspaper" | "pisa" | "symbolism" | "admin">("overview");

  // Notification Toast State
  const [toastMessage, setToastMessage] = useState<{ text: string; type: "success" | "info" | "warning" } | null>(null);

  const showToast = (text: string, type: "success" | "info" | "warning" = "success") => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage((current) => (current?.text === text ? null : current));
    }, 4000);
  };

  // Auth & Current User Session State (Default to guest null if no saved session)
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => {
    try {
      const savedEmail = localStorage.getItem("zemlyane_current_email");
      if (savedEmail) {
        return {
          id: "usr-current",
          email: savedEmail,
          fullName: savedEmail === ADMIN_CREDENTIALS.email ? ADMIN_CREDENTIALS.fullName : "Исследователь",
          role: (savedEmail === ADMIN_CREDENTIALS.email ? "Администратор" : "Участник") as UserRole,
          status: "active",
          createdAt: new Date().toISOString()
        };
      }
    } catch {
      // fallback
    }
    return null;
  });

  const accessControl = getAccessControl(currentUser);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // Theme State ("dark" | "light")
  const [theme, setTheme] = useState<"dark" | "light">( () => {
    try {
      const saved = localStorage.getItem("zemlyane_theme");
      return (saved === "light" || saved === "dark") ? saved : "dark";
    } catch {
      return "dark";
    }
  });

  // Font Size State ("compact" | "normal" | "large")
  const [fontSize, setFontSize] = useState<"compact" | "normal" | "large">( () => {
    try {
      const saved = localStorage.getItem("zemlyane_fontsize");
      return (saved === "compact" || saved === "normal" || saved === "large") ? saved : "normal";
    } catch {
      return "normal";
    }
  });

  // Data State with Supabase Synchronization & LocalStorage Offline Cache
  const [records, setRecords] = useState<MonitoringRecord[]>(() => {
    try {
      const saved = localStorage.getItem("zemlyane_records");
      if (saved) {
        const parsed: MonitoringRecord[] = JSON.parse(saved);
        return parsed.filter(r => !r.id?.startsWith("rec-demo-") && !r.id?.startsWith("demo-"));
      }
      return [];
    } catch {
      return [];
    }
  });

  const [stations, setStations] = useState<MonitoringStation[]>(() => {
    try {
      const saved = localStorage.getItem("zemlyane_stations");
      return saved ? JSON.parse(saved) : INITIAL_STATIONS;
    } catch {
      return INITIAL_STATIONS;
    }
  });
  
  const [newspaperNotes, setNewspaperNotes] = useState<NewspaperNote[]>(() => {
    try {
      const saved = localStorage.getItem("zemlyane_notes");
      if (saved) {
        const parsed: NewspaperNote[] = JSON.parse(saved);
        return parsed.filter(n => n.id !== "note-01" && !n.id?.startsWith("note-demo-"));
      }
      return [];
    } catch {
      return [];
    }
  });

  const [weather, setWeather] = useState<WeatherData>(INITIAL_WEATHER);
  const [pendingUsersCount, setPendingUsersCount] = useState<number>(0);

  // Network Connectivity & Offline Synchronization State
  const [isOnline, setIsOnline] = useState<boolean>(() => typeof navigator !== "undefined" ? navigator.onLine : true);
  const [pendingSyncCount, setPendingSyncCount] = useState<number>(() => getTotalPendingCount());
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  // Subscribe to offline sync state
  useEffect(() => {
    const unsubscribe = subscribeToSyncState((count, online) => {
      setPendingSyncCount(count);
      setIsOnline(online);
    });
    return () => unsubscribe();
  }, []);

  const handleManualSync = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    try {
      const result = await syncAllPendingData((itemType, syncedId) => {
        if (itemType === "record") {
          setRecords(prev => prev.map(r => r.id === syncedId ? { ...r, isOfflinePending: false, syncStatus: "synced" } : r));
        } else if (itemType === "publication") {
          setNewspaperNotes(prev => prev.map(n => n.id === syncedId ? { ...n, isOfflinePending: false, syncStatus: "synced" } : n));
        }
      });
      if (result.syncedCount > 0) {
        showToast(`✅ Успешно синхронизировано объектов: ${result.syncedCount} (замеров: ${result.syncedRecords}, статей: ${result.syncedPublications}, событий: ${result.syncedEvents})`);
      } else if (result.errors.length > 0) {
        showToast(`⚠️ Часть данных не синхронизирована: ${result.errors[0]}`, "warning");
      } else {
        showToast("Все данные уже синхронизированы с базой данных.", "info");
      }
    } catch (err: any) {
      showToast(`Ошибка синхронизации: ${err.message || "Сбой связи"}`, "warning");
    } finally {
      setIsSyncing(false);
    }
  };

  // Automatically trigger sync when back online
  useEffect(() => {
    const handleAutoSync = () => {
      if (typeof navigator !== "undefined" && navigator.onLine && getTotalPendingCount() > 0) {
        handleManualSync();
      }
    };
    window.addEventListener("online", handleAutoSync);
    return () => window.removeEventListener("online", handleAutoSync);
  }, []);

  const fetchPendingUsersCount = async () => {
    try {
      const profiles = await getProfiles();
      const count = profiles.filter(p => isPendingRole(p.role)).length;
      setPendingUsersCount(count);
    } catch (e) {
      console.warn("Notice checking pending users count:", e);
    }
  };

  // Load data & init auth session directly from Supabase on mount
  useEffect(() => {
    async function initSupabaseDataAndAuth() {
      try {
        // Ensure admin profile exists in Supabase
        await ensureAdminProfileExists();

        // Fetch pending registrations count
        await fetchPendingUsersCount();

        // Direct UNRESTRICTED query to profiles table by auth.uid() / saved session
        const freshProfile = await refreshCurrentUserProfile();
        if (freshProfile) {
          const status = getUserStatusFromRole(freshProfile.role, freshProfile.email);
          setCurrentUser({
            id: freshProfile.id,
            email: freshProfile.email,
            fullName: freshProfile.fullName,
            role: freshProfile.role as UserRole,
            status: status as UserStatus,
            createdAt: freshProfile.createdAt,
            avatarUrl: freshProfile.avatarUrl,
          });
        }

        // Fetch Stations from Supabase
        const { data: stationsData, error: stationsError } = await supabase.from('stations').select('*');
        if (!stationsError && stationsData && stationsData.length > 0) {
          setStations(stationsData);
        }

        // Fetch Records from Supabase and merge pending offline records
        const { data: recordsData, error: recordsError } = await supabase.from('records').select('*');
        if (!recordsError && recordsData) {
          const cleanRecordsData = recordsData.filter(r => !r.id?.startsWith("rec-demo-") && !r.id?.startsWith("demo-"));
          const pendingOffline = getPendingRecords().filter(r => !r.id?.startsWith("rec-demo-") && !r.id?.startsWith("demo-"));
          if (pendingOffline.length > 0) {
            const pendingIds = new Set(pendingOffline.map(p => p.id));
            const merged = [
              ...pendingOffline,
              ...cleanRecordsData.filter(r => !pendingIds.has(r.id))
            ];
            setRecords(merged);
          } else {
            setRecords(cleanRecordsData);
          }

          // Clean demo records from Supabase if any exist from initial seed
          const demoRecs = recordsData.filter(r => r.id?.startsWith("rec-demo-") || r.id?.startsWith("demo-"));
          if (demoRecs.length > 0) {
            demoRecs.forEach(dr => {
              supabase.from('records').delete().eq('id', dr.id).then(() => {});
            });
          }
        }

        // Fetch Newspaper Notes / Publications from Supabase and merge pending offline items
        const notesFromSupabase = await fetchNewspaperNotesFromSupabase();
        if (notesFromSupabase) {
          const cleanNotes = notesFromSupabase.filter(n => n.id !== "note-01" && !n.id?.startsWith("note-demo-"));
          const pendingPubs = getPendingPublications().filter(p => p.id !== "note-01" && !p.id?.startsWith("note-demo-"));
          if (pendingPubs.length > 0) {
            const pendingIds = new Set(pendingPubs.map(p => p.id));
            const merged = [
              ...pendingPubs,
              ...cleanNotes.filter(n => !pendingIds.has(n.id))
            ];
            setNewspaperNotes(merged);
          } else {
            setNewspaperNotes(cleanNotes);
          }

          // Clean demo notes from Supabase if any exist
          const demoNotes = notesFromSupabase.filter(n => n.id === "note-01" || n.id?.startsWith("note-demo-"));
          if (demoNotes.length > 0) {
            demoNotes.forEach(dn => {
              deleteNewspaperNoteFromSupabase(dn.id).catch(() => {});
            });
          }
        }
      } catch (err) {
        console.warn("Operating in offline mode or Supabase unreachable, using local cache:", err);
      }
    }
    initSupabaseDataAndAuth();

    // Subscribe to auth state changes from Supabase
    const unsubscribe = subscribeToAuthChanges((profile) => {
      if (profile) {
        const status = getUserStatusFromRole(profile.role, profile.email);
        setCurrentUser({
          id: profile.id,
          email: profile.email,
          fullName: profile.fullName,
          role: profile.role as UserRole,
          status: status as UserStatus,
          createdAt: profile.createdAt,
          avatarUrl: profile.avatarUrl,
        });
        fetchPendingUsersCount();
      } else {
        setCurrentUser(null);
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // State for manual status checking from banner
  const [isCheckingPendingStatus, setIsCheckingPendingStatus] = useState(false);

  // Direct manual check / tab-focus check for user profile & role status from UNRESTRICTED profiles table
  const handleCheckUserStatus = async (showToastNotice = true) => {
    if (!currentUser) return;
    setIsCheckingPendingStatus(true);
    try {
      const updatedProfile = await refreshCurrentUserProfile(currentUser.id || currentUser.email);
      if (updatedProfile) {
        const newRole = updatedProfile.role as UserRole;
        const newStatus = getUserStatusFromRole(newRole, updatedProfile.email);
        const wasPending = isPendingRole(currentUser.role) || currentUser.status === "pending";
        const isNowActive = !isPendingRole(newRole) && newStatus === "active";

        const hadStatusChange = currentUser.status !== newStatus || currentUser.role !== newRole;

        if (hadStatusChange) {
          setCurrentUser(prev => {
            if (!prev) return null;
            return {
              ...prev,
              id: updatedProfile.id || prev.id,
              email: updatedProfile.email || prev.email,
              fullName: updatedProfile.fullName || prev.fullName,
              role: newRole,
              status: newStatus,
              createdAt: updatedProfile.createdAt || prev.createdAt,
              avatarUrl: updatedProfile.avatarUrl || prev.avatarUrl,
            };
          });

          fetchPendingUsersCount();

          if (wasPending && isNowActive) {
            showToast(`🎉 Ваша заявка одобрена! Назначена роль «${newRole}». Доступ к функционалу открыт!`, "success");
          } else if (currentUser.role !== newRole) {
            showToast(`ℹ️ Ваша роль в клубе обновлена: «${newRole}».`, "info");
          }
        } else if (showToastNotice) {
          if (newStatus === "active") {
            showToast(`✓ Статус аккаунта активен. Роль: «${newRole}».`, "success");
          } else if (newStatus === "rejected") {
            showToast("⚠️ Регистрация отклонена администратором.", "warning");
          } else {
            showToast("⏳ Заявка все еще находится на рассмотрении администратора.", "info");
          }
        }
      }
    } catch (err: any) {
      if (showToastNotice) {
        showToast("Ошибка проверки статуса: " + (err.message || "сбой связи"), "warning");
      }
    } finally {
      setIsCheckingPendingStatus(false);
    }
  };

  // Automatic check when user returns to the tab (window focus & visibilitychange)
  useEffect(() => {
    const handleRecheck = () => {
      if (document.visibilityState === "visible" && currentUser) {
        handleCheckUserStatus(false);
      }
    };

    window.addEventListener("focus", handleRecheck);
    document.addEventListener("visibilitychange", handleRecheck);
    return () => {
      window.removeEventListener("focus", handleRecheck);
      document.removeEventListener("visibilitychange", handleRecheck);
    };
  }, [currentUser]);

  // Sync Records and Stations to LocalStorage for full offline access
  useEffect(() => {
    try {
      localStorage.setItem("zemlyane_records", JSON.stringify(records));
    } catch (e) {
      console.warn("Could not save records to localStorage:", e);
    }
  }, [records]);

  useEffect(() => {
    try {
      localStorage.setItem("zemlyane_stations", JSON.stringify(stations));
    } catch (e) {
      console.warn("Could not save stations to localStorage:", e);
    }
  }, [stations]);

  useEffect(() => {
    if (currentUser) {
      try {
        localStorage.setItem("zemlyane_current_email", currentUser.email);
      } catch (e) {
        console.error(e);
      }
    }
  }, [currentUser]);

  useEffect(() => {
    try {
      localStorage.setItem("zemlyane_theme", theme);
    } catch (e) {
      console.error(e);
    }
  }, [theme]);

  // Selected category for scientific definition modal & data entry
  const [selectedCategoryForInfo, setSelectedCategoryForInfo] = useState<CategoryInfo | null>(null);
  const [selectedCategoryForDataEntry, setSelectedCategoryForDataEntry] = useState<ResearchCategory | null>(null);

  const handleOpenDataEntryForCategory = (catId: ResearchCategory) => {
    setSelectedCategoryForDataEntry(catId);
    setSelectedCategoryForInfo(null);
    setIsDataEntryOpen(true);
  };

  // Modal states for PISA Practicum and Station Passport / QR Code
  const [isPisaModalOpen, setIsPisaModalOpen] = useState(false);
  const [isPassportModalOpen, setIsPassportModalOpen] = useState(false);
  const [passportStation, setPassportStation] = useState<MonitoringStation | null>(null);

  useEffect(() => {
    const root = document.documentElement;
    if (fontSize === "compact") {
      root.style.fontSize = "13.5px";
    } else if (fontSize === "large") {
      root.style.fontSize = "17.5px";
    } else {
      root.style.fontSize = "15px";
    }
    try {
      localStorage.setItem("zemlyane_fontsize", fontSize);
    } catch (e) {
      console.error(e);
    }
  }, [fontSize]);

  useEffect(() => {
    try {
      localStorage.setItem("zemlyane_notes", JSON.stringify(newspaperNotes));
    } catch (e) {
      console.error("Failed to save notes to localStorage", e);
    }
  }, [newspaperNotes]);

  // Auth & Session Handlers using Supabase clubService
  const handleRegisterUser = async (fullName: string, nicknameOrEmail: string, password?: string, role: string = "Ожидает") => {
    const technicalEmail = nicknameToTechnicalEmail(nicknameOrEmail);
    const newProfile = await registerUser({
      fullName,
      email: technicalEmail,
      password,
      role: role || "Ожидает",
    });
    const derivedStatus = getUserStatusFromRole(newProfile.role, newProfile.email);
    setCurrentUser({
      id: newProfile.id,
      email: newProfile.email,
      fullName: newProfile.fullName,
      role: newProfile.role as UserRole,
      status: derivedStatus as UserStatus,
      createdAt: newProfile.createdAt
    });
    try {
      localStorage.setItem("zemlyane_current_email", newProfile.email);
    } catch (e) {
      console.warn(e);
    }
    fetchPendingUsersCount();
  };

  const handleLoginUser = async (nicknameOrEmail: string, password?: string) => {
    const result = await loginUser(nicknameOrEmail, password);
    if (result.success && result.profile) {
      const derivedStatus = getUserStatusFromRole(result.profile.role, result.profile.email);
      setCurrentUser({
        id: result.profile.id,
        email: result.profile.email,
        fullName: result.profile.fullName,
        role: result.profile.role as UserRole,
        status: derivedStatus as UserStatus,
        createdAt: result.profile.createdAt
      });
      try {
        localStorage.setItem("zemlyane_current_email", result.profile.email);
      } catch (e) {
        console.warn(e);
      }
      fetchPendingUsersCount();
      return true;
    } else {
      throw new Error(result.error || "Неверный никнейм или пароль.");
    }
  };

  const handleLogoutUser = async () => {
    await logoutUser();
    setCurrentUser(null);
    localStorage.removeItem("zemlyane_current_email");
    if (activeTab === "admin") {
      setActiveTab("overview");
    }
  };

  // Station Deletion Handler with Supabase sync
  const handleDeleteStation = async (stationCode: string) => {
    setStations(prev => prev.filter(s => s.code !== stationCode));
    setRecords(prev => prev.filter(r => r.stationCode !== stationCode));
    if (filterState.stationCode === stationCode) {
      setFilterState(prev => ({ ...prev, stationCode: "ALL" }));
    }
    
    try {
      await supabase.from('stations').delete().eq('code', stationCode);
      await supabase.from('records').delete().eq('stationCode', stationCode);
    } catch (err) {
      console.error("Error deleting station from Supabase:", err);
    }
  };

  // Filter State
  const [filterState, setFilterState] = useState<FilterState>({
    stationCode: "ALL",
    category: "ALL",
    dateFrom: "",
    dateTo: "",
    parameterKey: "waterTemp"
  });

  // Modal Control
  const [isDataEntryOpen, setIsDataEntryOpen] = useState(false);
  const [preselectedStation, setPreselectedStation] = useState<MonitoringStation | null>(null);
  const [clickedCoords, setClickedCoords] = useState<{ lat: number; lng: number } | null>(null);

  // Category Icon Renderer
  const renderCategoryIcon = (iconName: string) => {
    switch (iconName) {
      case "CloudSun": return <CloudSun className="w-6 h-6 text-sky-400" />;
      case "Droplets": return <Droplets className="w-6 h-6 text-blue-400" />;
      case "Layers": return <Layers className="w-6 h-6 text-amber-500" />;
      case "Trees": return <Trees className="w-6 h-6 text-emerald-400" />;
      case "User":
      case "AlertTriangle": return <User className="w-6 h-6 text-orange-400" />;
      case "Gem": return <Gem className="w-6 h-6 text-purple-400" />;
      case "Skull": return <Skull className="w-6 h-6 text-amber-600" />;
      default: return <Compass className="w-6 h-6 text-emerald-400" />;
    }
  };

  // Handlers
  const handleToggleTheme = () => {
    setTheme(prev => prev === "dark" ? "light" : "dark");
  };

  const handleAddRecord = async (newRec: MonitoringRecord) => {
    const online = typeof navigator !== "undefined" ? navigator.onLine : true;

    if (!online) {
      // 2. OFFLINE MODE: Save exclusively to local offline queue
      const offlineRec: MonitoringRecord = {
        ...newRec,
        isOfflinePending: true,
        syncStatus: "pending"
      };
      enqueueOfflineRecord(offlineRec);
      setRecords(prev => [offlineRec, ...prev]);

      const existingStation = stations.find(s => s.code === newRec.stationCode);
      if (!existingStation) {
        const newStation: MonitoringStation = {
          id: `st-${Date.now()}`,
          code: newRec.stationCode,
          name: newRec.stationName,
          category: newRec.category,
          lat: newRec.lat,
          lng: newRec.lng,
          description: `Новая станция наблюдения: ${newRec.stationName}`,
          establishedYear: new Date().getFullYear()
        };
        setStations(prev => [...prev, newStation]);
      }
      showToast("📡 Замер сохранен в памяти устройства (офлайн-режим). Будет отправлен в базу при появлении сети.");
      return;
    }

    // 1. ONLINE MODE: Direct and instant upload to Supabase (bypassing offline queue)
    try {
      let payload = sanitizeRecordForSupabase(newRec, false);
      let { error } = await supabase.from('records').insert([payload]);

      // Resilient schema cache fallback if table has unmigrated optional columns
      if (
        error &&
        (error.message?.includes("isAnomaly") ||
          error.message?.includes("aiAlert") ||
          error.message?.includes("researcherName") ||
          error.message?.includes("schema cache") ||
          error.message?.includes("column"))
      ) {
        console.warn("Retrying direct insert without optional unmigrated columns:", error.message);
        payload = sanitizeRecordForSupabase(newRec, true);
        const retry = await supabase.from('records').insert([payload]);
        error = retry.error;
      }

      if (error) {
        throw error;
      }

      // Successfully saved directly to Supabase cloud
      const cloudRec: MonitoringRecord = {
        ...newRec,
        isOfflinePending: false,
        syncStatus: "synced"
      };
      setRecords(prev => [cloudRec, ...prev]);
      showToast("✅ Замер успешно отправлен и сохранен в базе данных Supabase!");

      const existingStation = stations.find(s => s.code === newRec.stationCode);
      if (!existingStation) {
        const newStation: MonitoringStation = {
          id: `st-${Date.now()}`,
          code: newRec.stationCode,
          name: newRec.stationName,
          category: newRec.category,
          lat: newRec.lat,
          lng: newRec.lng,
          description: `Новая станция наблюдения: ${newRec.stationName}`,
          establishedYear: new Date().getFullYear()
        };
        setStations(prev => [...prev, newStation]);
        try {
          await supabase.from('stations').insert([newStation]);
        } catch (err) {
          console.warn("Error saving new station to Supabase:", err);
        }
      }
    } catch (err: any) {
      console.error("Error saving online record to Supabase:", err);
      // If internet disconnected during request execution
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        const offlineRec: MonitoringRecord = {
          ...newRec,
          isOfflinePending: true,
          syncStatus: "pending"
        };
        enqueueOfflineRecord(offlineRec);
        setRecords(prev => [offlineRec, ...prev]);
        showToast("📡 Связь прервалась. Замер сохранен в локальную офлайн-очередь.", "warning");
      } else {
        showToast(`Ошибка сохранения в базу данных: ${err?.message || "Проверьте структуру таблицы records"}`, "warning");
      }
    }
  };

  const handleDeleteRecord = async (id: string) => {
    setRecords(prev => prev.filter(r => r.id !== id));
    try {
      await supabase.from('records').delete().eq('id', id);
    } catch (err) {
      console.error("Error deleting record from Supabase:", err);
    }
  };

  const handleAddNote = async (newNote: NewspaperNote) => {
    const online = typeof navigator !== "undefined" ? navigator.onLine : true;

    if (!online) {
      // OFFLINE MODE: Save to local queue
      const offlineNote: NewspaperNote = {
        ...newNote,
        isOfflinePending: true,
        syncStatus: "pending"
      };
      queuePublicationForSync(offlineNote);
      setNewspaperNotes(prev => [offlineNote, ...prev]);
      showToast("📡 Статья сохранена в памяти устройства (офлайн-режим). Будет опубликована при появлении сети.");
      return;
    }

    // ONLINE MODE: Direct upload to Supabase
    try {
      const cloudNote: NewspaperNote = {
        ...newNote,
        isOfflinePending: false,
        syncStatus: "synced"
      };
      setNewspaperNotes(prev => [cloudNote, ...prev]);
      const saved = await insertNewspaperNoteToSupabase(cloudNote);
      if (saved) {
        showToast("✅ Заметка успешно опубликована в газете «Хроники Землян» и сохранена в Supabase!");
      } else {
        showToast("⚠️ Заметка сохранена локально. Проверьте соединение с базой данных.", "warning");
      }
    } catch (err: any) {
      console.warn("Online note publication error:", err);
      // Fallback to offline queue
      const offlineNote: NewspaperNote = {
        ...newNote,
        isOfflinePending: true,
        syncStatus: "pending"
      };
      queuePublicationForSync(offlineNote);
      setNewspaperNotes(prev => [offlineNote, ...prev]);
      showToast("📡 Ошибка отправки. Статья сохранена в локальную офлайн-очередь.", "warning");
    }
  };

  const handleDeleteNote = async (id: string) => {
    setNewspaperNotes(prev => prev.filter(n => n.id !== id));
    await deleteNewspaperNoteFromSupabase(id);
    showToast("Заметка удалена из архива.", "info");
  };

  const handleEditNote = async (updated: NewspaperNote) => {
    setNewspaperNotes(prev => prev.map(n => n.id === updated.id ? updated : n));
    try {
      await insertNewspaperNoteToSupabase(updated);
    } catch (err) {
      console.warn("Supabase note update error:", err);
    }
    showToast("Изменения в заметке сохранены.");
  };

  const handleQuickAddWeather = () => {
    const weatherRecord: MonitoringRecord = {
      id: `rec-weather-${Date.now()}`,
      stationCode: "KST-01",
      stationName: "Костанай — городская эко-станция",
      category: "atmosphere",
      date: new Date().toISOString().split("T")[0],
      lat: 53.2144,
      lng: 63.6246,
      researcherName: "Автоматический гидрометпост",
      notes: "Зафиксированы суточные метеоданные Яндекс Погоды.",
      atmosphere: {
        airTemp: 22.0,
        humidity: 55,
        pressure: 752,
        cloudiness: 20,
        windSpeed: 3.2,
        windDirection: "СЗ",
        precipitation: 0.0,
        co2Ppm: 420,
        co2Percent: 0.0420
      }
    };
    handleAddRecord(weatherRecord);
    showToast("Текущие метеоданные успешно занесены в полевой журнал!");
  };

  const handleExportCsv = () => {
    const targetRecords = records.filter(r => {
      if (filterState.category !== "ALL" && r.category !== filterState.category) return false;
      if (filterState.stationCode !== "ALL" && r.stationCode !== filterState.stationCode) return false;
      if (filterState.dateFrom && r.date < filterState.dateFrom) return false;
      if (filterState.dateTo && r.date > filterState.dateTo) return false;
      return true;
    });

    if (targetRecords.length === 0) {
      showToast("Нет данных для экспорта с выбранными фильтрами!", "warning");
      return;
    }

    const headers = ["Шифр Станции", "Название Станции", "Категория", "Дата", "Широта", "Долгота", "Исследователь", "Значения", "Примечания"];
    
    const rows = targetRecords.map(r => {
      let vals = "";
      if (r.hydrosphere) {
        vals = `Вода:${r.hydrosphere.waterTemp ?? "нет замера"}°C, Прозрачность:${r.hydrosphere.transparency ?? "нет замера"}см, pH:${r.hydrosphere.ph ?? "нет замера"}, TDS:${r.hydrosphere.tds ?? "нет замера"}`;
      } else if (r.atmosphere) {
        vals = `Воздух:${r.atmosphere.airTemp ?? "нет замера"}°C, Влажность:${r.atmosphere.humidity ?? "нет замера"}%, CO2:${r.atmosphere.co2Ppm ?? "нет замера"}ppm`;
      } else if (r.lithosphere) {
        vals = `pH почва:${r.lithosphere.soilPh ?? "нет замера"}, Состав:${r.lithosphere.texture ?? "нет замера"}`;
      } else if (r.biosphere) {
        vals = `Шеннон H':${r.biosphere.shannonIndex ?? "нет замера"}, Флора:${r.biosphere.floraSpecies ?? "нет замера"}`;
      } else if (r.anthropogenic) {
        vals = `Мусор:${r.anthropogenic.litterLevel ?? "нет замера"}/5, Шум:${r.anthropogenic.noiseLevel ?? "нет замера"}дБА`;
      } else if (r.geology) {
        vals = `Минерал:${r.geology.mineralName ?? "нет замера"}, Твердость:${r.geology.mohsHardness ?? "нет замера"}`;
      } else if (r.fossils) {
        vals = `Фоссилия:${r.fossils.organismGroup ?? "нет замера"}, Длина:${r.fossils.lengthMm ?? "нет замера"}мм`;
      }

      return [
        `"${r.stationCode}"`,
        `"${r.stationName}"`,
        `"${r.category}"`,
        `"${r.date}"`,
        `"${r.lat}"`,
        `"${r.lng}"`,
        `"${r.researcherName}"`,
        `"${vals}"`,
        `"${(r.notes || "").replace(/"/g, '""')}"`
      ].join(",");
    });

    const csvContent = "\uFEFF" + [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `zemlyane_dataspace_${filterState.category}_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const fontSizeClass = fontSize === "compact" 
    ? "text-xs" 
    : fontSize === "large" 
      ? "text-base sm:text-lg" 
      : "text-sm";

  const isDark = theme === "dark";

  return (
    <div className={`min-h-screen transition-colors duration-300 flex flex-col font-sans ${fontSizeClass} ${
      isDark 
        ? "bg-[#0b1512] text-slate-100" 
        : "bg-[#f2f7f4] text-slate-900"
    }`}>
      
      <Header
        weather={weather}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenDataEntry={() => {
          setPreselectedStation(null);
          setIsDataEntryOpen(true);
        }}
        onQuickAddWeather={handleQuickAddWeather}
        theme={theme}
        onToggleTheme={handleToggleTheme}
        fontSize={fontSize}
        setFontSize={setFontSize}
        currentUser={currentUser}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
        pendingUsersCount={pendingUsersCount}
        onOpenSymbolism={() => setActiveTab("symbolism")}
        isOnline={isOnline}
        pendingSyncCount={pendingSyncCount}
        onSyncPendingRecords={handleManualSync}
        isSyncing={isSyncing}
      />

      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 animate-bounce-in">
          <div className={`px-4 py-3 rounded-2xl shadow-2xl border flex items-center space-x-3 ${
            toastMessage.type === "warning"
              ? "bg-amber-950/95 border-amber-500 text-amber-100"
              : toastMessage.type === "info"
                ? "bg-sky-950/95 border-sky-500 text-sky-100"
                : "bg-emerald-950/95 border-emerald-500 text-emerald-100"
          }`}>
            {toastMessage.type === "warning" ? (
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
            ) : (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            )}
            <span className="text-xs sm:text-sm font-medium">{toastMessage.text}</span>
            <button
              onClick={() => setToastMessage(null)}
              className="text-slate-400 hover:text-white transition p-1"
            >
              <span className="sr-only">Закрыть</span>
              ×
            </button>
          </div>
        </div>
      )}

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8">
        
        {(isPendingRole(currentUser?.role) || currentUser?.status === "pending") && (
          <div className="p-4 bg-amber-950/90 border-2 border-amber-500 rounded-3xl text-amber-200 shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-3 font-sans">
            <div className="flex items-center space-x-3">
              <Clock className="w-6 h-6 text-amber-400 shrink-0 animate-pulse" />
              <div>
                <h4 className="font-bold text-sm text-amber-300">Ожидание назначения роли администратором</h4>
                <p className="text-xs text-amber-100/90 mt-0.5">
                  Регистрация прошла успешно. Доступ к внесению данных и публикации заметок откроется сразу после назначения роли администратором.
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2 shrink-0 w-full sm:w-auto">
              <button
                onClick={() => handleCheckUserStatus(true)}
                disabled={isCheckingPendingStatus}
                className="flex-1 sm:flex-none px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs shadow-lg transition flex items-center justify-center space-x-1.5"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isCheckingPendingStatus ? "animate-spin" : ""}`} />
                <span>{isCheckingPendingStatus ? "Проверка..." : "Проверить статус"}</span>
              </button>
              <button
                onClick={() => setIsAuthModalOpen(true)}
                className="px-3 py-2 bg-amber-900/80 hover:bg-amber-800 text-amber-200 border border-amber-600 rounded-xl text-xs font-bold transition"
              >
                Профиль
              </button>
            </div>
          </div>
        )}

        {activeTab === "overview" && (
          <div className="space-y-8">
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className={`text-lg font-bold font-serif flex items-center space-x-2 ${isDark ? "text-slate-100" : "text-emerald-950"}`}>
                  <Compass className="w-5 h-5 text-emerald-500" />
                  <span>Разделы исследований</span>
                </h2>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
                {CATEGORIES.map(cat => {
                  const catRecords = records.filter(r => r.category === cat.id);
                  const isCatActive = filterState.category === cat.id;

                  return (
                    <div
                      key={cat.id}
                      onClick={() => {
                        setFilterState(prev => ({ ...prev, category: cat.id }));
                        setSelectedCategoryForInfo(cat);
                      }}
                      className={`cursor-pointer rounded-2xl p-3 border transition duration-200 flex flex-col justify-between space-y-2 group ${
                        isCatActive
                          ? isDark 
                            ? "bg-[#13261f] border-emerald-400 shadow-lg ring-2 ring-emerald-500/50"
                            : "bg-emerald-100 border-emerald-600 shadow-lg ring-2 ring-emerald-500/50"
                          : isDark
                            ? "bg-[#0f1d18]/90 border-emerald-900/60 hover:border-emerald-600 hover:bg-[#13261f]"
                            : "bg-white border-emerald-200 hover:border-emerald-400 hover:bg-emerald-50/80"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        {renderCategoryIcon(cat.iconName)}
                        <span className={`text-[10px] font-bold font-mono px-1.5 py-0.5 rounded border ${
                          isDark ? "bg-[#0b1512] text-amber-300 border-emerald-800" : "bg-emerald-50 text-emerald-900 border-emerald-200"
                        }`}>
                          {cat.prefix}
                        </span>
                      </div>

                      <div>
                        <h3 className={`text-xs font-bold transition truncate ${
                          isDark ? "text-slate-100 group-hover:text-emerald-300" : "text-slate-800 group-hover:text-emerald-700"
                        }`}>
                          {cat.name}
                        </h3>
                        <div className="flex items-center justify-between mt-1 pt-1 border-t border-emerald-900/30">
                          <p className={`text-[10px] ${isDark ? "text-emerald-200/70" : "text-emerald-700"}`}>
                            {catRecords.length} замеров
                          </p>
                          {accessControl.canCreateRecords && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenDataEntryForCategory(cat.id as ResearchCategory);
                              }}
                              title={`Внести данные в полевой дневник (${cat.name})`}
                              className="px-1.5 py-0.5 rounded bg-emerald-600/30 hover:bg-emerald-600 text-emerald-300 hover:text-white text-[10px] font-bold border border-emerald-500/40 transition flex items-center space-x-0.5"
                            >
                              <Plus className="w-2.5 h-2.5" />
                              <span>Дневник</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Школьная газета «Хроники Землян» */}
            <section className="w-full">
              <NewspaperWidget
                notes={newspaperNotes}
                onAddNote={handleAddNote}
                onDeleteNote={handleDeleteNote}
                onEditNote={handleEditNote}
                userStatus={currentUser?.status}
                canEditNewspaper={accessControl.canEditNewspaper}
              />
            </section>

            {/* Настенный интерактивный Эко-календарь */}
            <section className="w-full">
              <EcoCalendarWidget 
                isDark={isDark} 
                canEditCalendar={accessControl.canEditCalendar}
              />
            </section>

          </div>
        )}

        {activeTab === "journal" && (
          <div className="space-y-8">
            <div className={`border rounded-3xl p-4 sm:p-6 shadow-xl flex flex-col md:flex-row items-center justify-between gap-4 backdrop-blur-md ${
              isDark ? "bg-[#0f1d18]/90 border-emerald-800/60" : "bg-white border-emerald-300"
            }`}>
              <div>
                <h2 className={`text-xl font-bold font-serif flex items-center space-x-2 ${isDark ? "text-white" : "text-emerald-950"}`}>
                  <Table className="w-6 h-6 text-emerald-500" />
                  <span>Полевой журнал и ГИС-карта с зафиксированными точками</span>
                </h2>
                <p className={`text-xs mt-1 ${isDark ? "text-emerald-200/80" : "text-emerald-800"}`}>
                  Все сохраненные замеры из облачной базы данных Supabase отображаются интерактивными маркерами на спутниковой карте Esri World Imagery.
                </p>
              </div>

              {accessControl.canCreateRecords && (
                <button
                  onClick={() => {
                    setPreselectedStation(null);
                    setIsDataEntryOpen(true);
                  }}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs shadow transition flex items-center space-x-1.5 border border-emerald-400/40 shrink-0"
                >
                  <PlusCircle className="w-4 h-4 text-emerald-200" />
                  <span>+ Новая запись</span>
                </button>
              )}
            </div>

            {/* Access Control Guard for Raw Scientific Data */}
            {!accessControl.canViewRawRecords ? (
              <div className={`border-2 border-emerald-500/80 rounded-3xl p-6 sm:p-10 shadow-2xl relative overflow-hidden backdrop-blur-md ${
                isDark ? "bg-[#0c1813]/95 text-slate-100" : "bg-emerald-50/90 text-slate-900 border-emerald-400"
              }`}>
                <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
                
                <div className="max-w-3xl mx-auto text-center space-y-6 relative z-10">
                  <div className="inline-flex p-4 bg-emerald-950/90 border border-emerald-500/60 rounded-3xl text-emerald-400 shadow-xl">
                    <Shield className="w-10 h-10 animate-pulse" />
                  </div>

                  <div className="space-y-2">
                    <h3 className={`text-2xl sm:text-3xl font-bold font-serif ${isDark ? "text-white" : "text-emerald-950"}`}>
                      Защита первичных научных данных от плагиата
                    </h3>
                    <p className={`text-sm sm:text-base leading-relaxed ${isDark ? "text-emerald-200/90" : "text-emerald-800"}`}>
                      Сырые экспедиционные протоколы, точные GPS-координаты постов и журнал полевых замеров доступны исключительно авторизованным и подтвержденным участникам эко-клуба «Земляне».
                    </p>
                  </div>

                  <div className={`p-4 sm:p-5 rounded-2xl border text-xs sm:text-sm text-left grid grid-cols-1 sm:grid-cols-2 gap-4 ${
                    isDark ? "bg-[#11241c] border-emerald-800/80 text-emerald-100" : "bg-white border-emerald-200 text-slate-700"
                  }`}>
                    <div className="space-y-1.5">
                      <div className="flex items-center space-x-2 font-bold text-emerald-400">
                        <ShieldCheck className="w-4 h-4 text-emerald-400" />
                        <span>Доступно в гостевом режиме:</span>
                      </div>
                      <ul className="list-disc list-inside space-y-1 text-xs opacity-90">
                        <li>Публичная агрегированная аналитика (графики и тренды)</li>
                        <li>Пресс-центр: газета «Хроники Землян»</li>
                        <li>Интерактивный эко-календарь событий</li>
                        <li>PISA-практикум функциональной грамотности</li>
                      </ul>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center space-x-2 font-bold text-amber-400">
                        <Lock className="w-4 h-4 text-amber-400" />
                        <span>Требуется статус активного исследователя:</span>
                      </div>
                      <ul className="list-disc list-inside space-y-1 text-xs opacity-90">
                        <li>Таблицы сырых замеров (pH, TDS, CO2, фауна)</li>
                        <li>Спутниковая карта с точными точками и паспортами</li>
                        <li>Внесение новых полевых замеров и фотофиксация</li>
                        <li>Модерация и верификация записей</li>
                      </ul>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                    <button
                      onClick={() => setIsAuthModalOpen(true)}
                      className="px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-2xl font-bold text-sm shadow-xl transition flex items-center space-x-2 border border-emerald-400/40 hover:scale-105"
                    >
                      <User className="w-4 h-4" />
                      <span>{currentUser ? "Проверить статус аккаунта" : "Войти / Подать заявку на доступ"}</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => setActiveTab("analytics")}
                      className={`px-5 py-3 rounded-2xl font-bold text-xs sm:text-sm border transition flex items-center space-x-2 ${
                        isDark 
                          ? "bg-slate-800/80 hover:bg-slate-700 text-slate-200 border-slate-700" 
                          : "bg-white hover:bg-slate-100 text-slate-800 border-slate-300"
                      }`}
                    >
                      <BarChart3 className="w-4 h-4 text-emerald-400" />
                      <span>Открыть Публичную аналитику</span>
                    </button>

                    <button
                      onClick={() => setActiveTab("newspaper")}
                      className={`px-5 py-3 rounded-2xl font-bold text-xs sm:text-sm border transition flex items-center space-x-2 ${
                        isDark 
                          ? "bg-[#142820] hover:bg-[#1a342a] text-amber-200 border-amber-900/60" 
                          : "bg-amber-50 hover:bg-amber-100 text-amber-900 border-amber-300"
                      }`}
                    >
                      <Newspaper className="w-4 h-4 text-amber-400" />
                      <span>Читать «Хроники Землян»</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-8">
                {/* GIS Map: Left Column = Legend & Symbols, Right Column = Satellite Map (height bounded) */}
                <MapView
                  stations={stations}
                  records={records}
                  selectedStationCode={filterState.stationCode}
                  selectedCategory={filterState.category}
                  onSelectCategory={(cat) => setFilterState(prev => ({ ...prev, category: cat }))}
                  clickedCoords={clickedCoords}
                  onSelectStation={(code) => {
                    setFilterState(prev => ({ ...prev, stationCode: code }));
                  }}
                  onMapClickCoordinates={(lat, lng) => {
                    // Places a temporary pin without abruptly jumping into a modal
                    setClickedCoords({ lat, lng });
                  }}
                  onClearClickedCoords={() => {
                    setClickedCoords(null);
                  }}
                  onOpenDataEntryWithCoords={(coords) => {
                    if (!accessControl.canCreateRecords) {
                      setIsAuthModalOpen(true);
                      return;
                    }
                    setClickedCoords(coords);
                    setPreselectedStation(null);
                    setIsDataEntryOpen(true);
                  }}
                  onOpenDataEntryForStation={(st) => {
                    if (!accessControl.canCreateRecords) {
                      setIsAuthModalOpen(true);
                      return;
                    }
                    setPreselectedStation(st);
                    setIsDataEntryOpen(true);
                  }}
                  canCreateRecords={accessControl.canCreateRecords}
                />

                {/* Field Scientific Journal Data Table */}
                <DataTable
                  records={records}
                  stations={stations}
                  onDeleteRecord={handleDeleteRecord}
                  onDeleteStation={handleDeleteStation}
                  onExportCsv={handleExportCsv}
                  selectedCategory={filterState.category}
                  setSelectedCategory={(cat) => setFilterState(prev => ({ ...prev, category: cat }))}
                  selectedStationCode={filterState.stationCode}
                  setSelectedStationCode={(code) => setFilterState(prev => ({ ...prev, stationCode: code }))}
                  onOpenPassportModal={(st) => {
                    setPassportStation(st || stations[0] || null);
                    setIsPassportModalOpen(true);
                  }}
                  canExportData={accessControl.canExportData}
                  canDeleteRecords={accessControl.canDeleteRecords}
                  isOnline={isOnline}
                  pendingSyncCount={pendingSyncCount}
                  onSyncPendingRecords={handleManualSync}
                  isSyncing={isSyncing}
                />
              </div>
            )}
          </div>
        )}

        {activeTab === "analytics" && (
          <div className="space-y-8">
            <div className={`border rounded-3xl p-4 sm:p-6 shadow-xl flex flex-col md:flex-row items-center justify-between gap-4 backdrop-blur-md ${
              isDark ? "bg-[#0f1d18]/90 border-emerald-800/60" : "bg-white border-emerald-300"
            }`}>
              <div>
                <h2 className={`text-xl font-bold font-serif flex items-center space-x-2 ${isDark ? "text-white" : "text-emerald-950"}`}>
                  <BarChart3 className="w-6 h-6 text-amber-500" />
                  <span>Аналитический модуль «ИИ-эко-аналитик»</span>
                </h2>
                <p className={`text-xs mt-1 ${isDark ? "text-emerald-200/80" : "text-emerald-800"}`}>
                  Построение временной динамики, проверка статистических гипотез по t-критерию Стьюдента и автогенерация профессиональных Excel отчетов.
                </p>
              </div>

              {accessControl.canCreateRecords && (
                <button
                  onClick={() => {
                    setPreselectedStation(null);
                    setIsDataEntryOpen(true);
                  }}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs shadow transition flex items-center space-x-1.5 border border-emerald-400/40 shrink-0"
                >
                  <PlusCircle className="w-4 h-4 text-emerald-200" />
                  <span>+ Добавить замер</span>
                </button>
              )}
            </div>

            <AnalyticsView
              records={records}
              stations={stations}
              filterState={filterState}
              onFilterChange={(newFilters) => setFilterState(prev => ({ ...prev, ...newFilters }))}
              onExportReport={handleExportCsv}
              isGuest={accessControl.isGuest}
              canExportData={accessControl.canExportData}
            />
          </div>
        )}

        {activeTab === "newspaper" && (
          <div className="space-y-6">
            <NewspaperWidget
              notes={newspaperNotes}
              onAddNote={handleAddNote}
              onDeleteNote={handleDeleteNote}
              onEditNote={handleEditNote}
              userStatus={currentUser?.status}
              canEditNewspaper={accessControl.canEditNewspaper}
            />
          </div>
        )}

        {activeTab === "pisa" && (
          <div className="space-y-6">
            <PisaPracticumBlock isDark={isDark} stations={stations} records={records} />
          </div>
        )}

        {activeTab === "symbolism" && (
          <ClubSymbolismView 
            onBackToMain={() => {
              setActiveTab("overview");
              window.scrollTo({ top: 0, behavior: "smooth" });
            }} 
            isDark={isDark} 
          />
        )}

        {activeTab === "admin" && (
          <AdminPanel
            currentUser={currentUser}
            onNavigateToTab={setActiveTab}
            onRefreshAppState={fetchPendingUsersCount}
          />
        )}

      </main>

      <CategoryInfoModal
        category={selectedCategoryForInfo}
        onClose={() => setSelectedCategoryForInfo(null)}
        onOpenDataEntry={handleOpenDataEntryForCategory}
        isDark={isDark}
        canCreateRecords={accessControl.canCreateRecords}
      />

      <DataEntryModal
        isOpen={isDataEntryOpen}
        onClose={() => {
          setIsDataEntryOpen(false);
          setSelectedCategoryForDataEntry(null);
        }}
        stations={stations}
        onAddRecord={handleAddRecord}
        preselectedStation={preselectedStation}
        initialCategory={selectedCategoryForDataEntry}
        clickedCoords={clickedCoords}
        recordsCount={records.length}
        userStatus={currentUser?.status}
        onOpenPassportModal={(st) => {
          setPassportStation(st || stations[0] || null);
          setIsPassportModalOpen(true);
        }}
      />

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        currentUser={currentUser}
        onRegister={handleRegisterUser}
        onLogin={handleLoginUser}
        onLogout={handleLogoutUser}
        onOpenAdminPanel={() => setActiveTab("admin")}
        onStatusUpdated={(updated) => {
          setCurrentUser(updated);
          fetchPendingUsersCount();
        }}
      />

      <PisaPracticumModal
        isOpen={isPisaModalOpen}
        onClose={() => setIsPisaModalOpen(false)}
        isDark={isDark}
      />

      <StationPassportModal
        isOpen={isPassportModalOpen}
        onClose={() => setIsPassportModalOpen(false)}
        station={passportStation || stations[0] || null}
        records={records}
        isDark={isDark}
      />

      <Footer />

    </div>
  );
}
