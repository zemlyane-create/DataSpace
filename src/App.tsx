import React, { useState, useEffect, useMemo } from "react";
import { Header } from "./components/Header";
import { Footer } from "./components/Footer";
import { MapView } from "./components/MapView";
import { DataTable } from "./components/DataTable";
import { AnalyticsView } from "./components/AnalyticsView";
import { DataEntryModal } from "./components/DataEntryModal";
import { AuthModal } from "./components/AuthModal";
import { AdminPanel } from "./components/AdminPanel";
import { NewspaperWidget } from "./components/NewspaperWidget";
import { PisaPracticumBlock } from "./components/PisaPracticumBlock";
import { ClubSymbolismView } from "./components/ClubSymbolismView";
import { CategoryInfoModal } from "./components/CategoryInfoModal";
import { StationPassportModal } from "./components/StationPassportModal";
import { EcoCalendarWidget } from "./components/EcoCalendarWidget";
import { 
  STATIONS, 
  INITIAL_RECORDS, 
  INITIAL_NEWSPAPER_NOTES, 
  MOCK_WEATHER 
} from "./data/mockData";
import { 
  MonitoringRecord, 
  NewspaperNote, 
  ObservationCategory, 
  EcoStation,
  FilterOptions 
} from "./types";
import { supabase, isSupabaseConfigured, fetchNewspaperNotesFromSupabase, deleteNewspaperNoteFromSupabase } from "./lib/supabase";
import { 
  getPendingRecords, 
  getPendingPublications, 
  initOfflineSync, 
  subscribeToSyncEvents 
} from "./services/offlineSyncService";
import { 
  getCurrentUserProfile, 
  logoutClubMember, 
  ClubMemberProfile, 
  isAdminRole,
  ensureAdminProfileExists 
} from "./services/clubService";
import { usePermissions } from "./hooks/usePermissions";
import { 
  Plus, 
  Download, 
  ShieldCheck, 
  Wifi, 
  WifiOff, 
  RefreshCw, 
  Sparkles, 
  Info,
  Calendar,
  Layers,
  Database
} from "lucide-react";

export function App() {
  const [activeTab, setActiveTab] = useState<"overview" | "analytics" | "journal" | "newspaper" | "pisa" | "symbolism" | "admin">("overview");
  const [currentCategory, setCurrentCategory] = useState<ObservationCategory | "all">("all");
  const [selectedStation, setSelectedStation] = useState<EcoStation | null>(null);
  const [isDataEntryOpen, setIsDataEntryOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isCategoryInfoOpen, setIsCategoryInfoOpen] = useState(false);
  const [isStationPassportOpen, setIsStationPassportOpen] = useState(false);
  const [infoCategory, setInfoCategory] = useState<ObservationCategory>("hydrosphere");
  const [passportStation, setPassportStation] = useState<EcoStation | null>(null);
  const [currentUser, setCurrentUser] = useState<ClubMemberProfile | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatusMsg, setSyncStatusMsg] = useState<string | null>(null);

  // Filters State
  const [filters, setFilters] = useState<FilterOptions>({
    category: "all",
    stationCode: "all",
    dateRange: { start: "", end: "" },
    searchQuery: ""
  });

  // Records state (чистая инициализация без демо-данных)
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

  // Newspaper Notes state (чистая инициализация без демо-заметок)
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

  // Permissions hook
  const { 
    canAddRecord, 
    canPublishNews, 
    canEditCalendar, 
    isAdmin 
  } = usePermissions(currentUser);

  // Online / Offline listeners
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Init sync service and auth
  useEffect(() => {
    initOfflineSync();
    
    // Check local auth profile
    const profile = getCurrentUserProfile();
    if (profile) {
      setCurrentUser(profile);
    } else {
      ensureAdminProfileExists().catch(() => {});
    }

    const unsubscribe = subscribeToSyncEvents((status) => {
      setIsSyncing(status.isSyncing);
      if (status.lastError) {
        setSyncStatusMsg(`Ошибка синхронизации: ${status.lastError}`);
      } else if (status.pendingRecords === 0 && status.pendingPublications === 0) {
        setSyncStatusMsg(null);
      } else {
        setSyncStatusMsg(`В очереди на выгрузку: ${status.pendingRecords + status.pendingPublications}`);
      }
    });

    return () => unsubscribe();
  }, []);

  // Sync state to localStorage
  useEffect(() => {
    localStorage.setItem("zemlyane_records", JSON.stringify(records));
  }, [records]);

  useEffect(() => {
    localStorage.setItem("zemlyane_notes", JSON.stringify(newspaperNotes));
  }, [newspaperNotes]);

  // Load from Supabase on start
  useEffect(() => {
    async function loadRemoteData() {
      if (!isSupabaseConfigured) return;
      try {
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
        console.warn("Could not load initial data from Supabase:", err);
      }
    }

    loadRemoteData();
  }, []);

  // Filtered records
  const filteredRecords = useMemo(() => {
    return records.filter((rec) => {
      if (currentCategory !== "all" && rec.category !== currentCategory) return false;
      if (filters.stationCode !== "all" && rec.stationCode !== filters.stationCode) return false;
      if (filters.category !== "all" && rec.category !== filters.category) return false;
      if (filters.dateRange.start && rec.date < filters.dateRange.start) return false;
      if (filters.dateRange.end && rec.date > filters.dateRange.end) return false;
      if (filters.searchQuery) {
        const q = filters.searchQuery.toLowerCase();
        const matchName = rec.stationName.toLowerCase().includes(q);
        const matchCode = rec.stationCode.toLowerCase().includes(q);
        const matchResearcher = rec.researcherName.toLowerCase().includes(q);
        const matchNotes = rec.notes?.toLowerCase().includes(q);
        if (!matchName && !matchCode && !matchResearcher && !matchNotes) return false;
      }
      return true;
    });
  }, [records, currentCategory, filters]);

  // Handlers
  const handleAddRecord = (newRec: MonitoringRecord) => {
    setRecords(prev => [newRec, ...prev]);
  };

  const handleDeleteRecord = async (id: string) => {
    setRecords(prev => prev.filter(r => r.id !== id));
    if (isSupabaseConfigured) {
      try {
        await supabase.from('records').delete().eq('id', id);
      } catch (err) {
        console.error("Delete record from Supabase error:", err);
      }
    }
  };

  const handleAddNewspaperNote = (newNote: NewspaperNote) => {
    setNewspaperNotes(prev => [newNote, ...prev]);
  };

  const handleDeleteNewspaperNote = async (id: string) => {
    setNewspaperNotes(prev => prev.filter(n => n.id !== id));
    await deleteNewspaperNoteFromSupabase(id);
  };

  const handleOpenCategoryInfo = (cat: ObservationCategory) => {
    setInfoCategory(cat);
    setIsCategoryInfoOpen(true);
  };

  const handleOpenStationPassport = (st: EcoStation) => {
    setPassportStation(st);
    setIsStationPassportOpen(true);
  };

  const handleLogout = () => {
    logoutClubMember();
    setCurrentUser(null);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#fbf8f2] text-[#2b241d] font-sans antialiased selection:bg-[#4f6f52]/20 selection:text-[#2b241d]">
      {/* Top Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        currentUser={currentUser}
        onOpenAuthModal={() => setIsAuthOpen(true)}
        onLogout={handleLogout}
        isOnline={isOnline}
        isSyncing={isSyncing}
        syncStatusMsg={syncStatusMsg}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        
        {/* Navigation & Controls Top Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[#dfcfb5]">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold font-serif text-[#382d22] tracking-tight">
              {activeTab === "overview" && "Интерактивная карта и посты мониторинга"}
              {activeTab === "analytics" && "ИИ-эко-аналитик и сравнительная шкала"}
              {activeTab === "journal" && "Полевой дневник экологических замеров"}
              {activeTab === "newspaper" && "Эко-вестник «Хроники Землян»"}
              {activeTab === "pisa" && "Практикум PISA: Научная грамотность"}
              {activeTab === "symbolism" && "Символика и традиции клуба «Земляне»"}
              {activeTab === "admin" && "Панель администрирования клуба"}
            </h1>
            <p className="text-xs sm:text-sm text-[#6c5944] mt-0.5">
              Геоинформационная образовательная эко-платформа долговременных исследований
            </p>
          </div>

          <div className="flex items-center space-x-2.5">
            {/* Quick Data Entry Button */}
            {canAddRecord && (
              <button
                type="button"
                onClick={() => setIsDataEntryOpen(true)}
                className="px-4 py-2 bg-[#4f6f52] hover:bg-[#3d593f] text-[#fbf8f2] text-xs sm:text-sm font-bold rounded-2xl shadow-sm hover:shadow transition flex items-center space-x-2 border border-[#3d593f] active:scale-95 cursor-pointer"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                <span>Внести замер</span>
              </button>
            )}
          </div>
        </div>

        {/* Tab 1: Overview (Map + Stations + Calendar) */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            {/* Eco Calendar Widget */}
            <EcoCalendarWidget 
              currentUser={currentUser}
              records={records}
            />

            {/* Map & Station Cards View */}
            <MapView
              stations={STATIONS}
              records={records}
              selectedStation={selectedStation}
              onSelectStation={setSelectedStation}
              onOpenPassport={handleOpenStationPassport}
              currentCategory={currentCategory}
              setCurrentCategory={setCurrentCategory}
              onOpenCategoryInfo={handleOpenCategoryInfo}
            />
          </div>
        )}

        {/* Tab 2: Analytics & AI */}
        {activeTab === "analytics" && (
          <AnalyticsView
            records={records}
            stations={STATIONS}
          />
        )}

        {/* Tab 3: Field Journal & Data Table */}
        {activeTab === "journal" && (
          <DataTable
            records={filteredRecords}
            allRecordsCount={records.length}
            stations={STATIONS}
            filters={filters}
            setFilters={setFilters}
            onOpenDataEntry={() => setIsDataEntryOpen(true)}
            onDeleteRecord={handleDeleteRecord}
            canAddRecord={canAddRecord}
            canDeleteRecord={isAdmin}
          />
        )}

        {/* Tab 4: Eco Newspaper */}
        {activeTab === "newspaper" && (
          <NewspaperWidget
            notes={newspaperNotes}
            onAddNote={handleAddNewspaperNote}
            onDeleteNote={handleDeleteNewspaperNote}
            canPublishNews={canPublishNews}
            currentUser={currentUser}
          />
        )}

        {/* Tab 5: PISA Practicum */}
        {activeTab === "pisa" && (
          <PisaPracticumBlock 
            records={records}
          />
        )}

        {/* Tab 6: Symbolism & Traditions */}
        {activeTab === "symbolism" && (
          <ClubSymbolismView />
        )}

        {/* Tab 7: Admin Panel */}
        {activeTab === "admin" && (
          <AdminPanel
            currentUser={currentUser}
            records={records}
            onClearRecords={() => setRecords([])}
            onResetToMock={() => setRecords([])}
          />
        )}

      </main>

      {/* Footer */}
      <Footer onOpenAdminPanel={() => setActiveTab("admin")} />

      {/* Modals */}
      {isDataEntryOpen && (
        <DataEntryModal
          isOpen={isDataEntryOpen}
          onClose={() => setIsDataEntryOpen(false)}
          onAddRecord={handleAddRecord}
          stations={STATIONS}
          initialStation={selectedStation}
          currentUser={currentUser}
        />
      )}

      {isAuthOpen && (
        <AuthModal
          isOpen={isAuthOpen}
          onClose={() => setIsAuthOpen(false)}
          onLoginSuccess={(prof) => {
            setCurrentUser(prof);
            setIsAuthOpen(false);
          }}
        />
      )}

      {isCategoryInfoOpen && (
        <CategoryInfoModal
          isOpen={isCategoryInfoOpen}
          category={infoCategory}
          onClose={() => setIsCategoryInfoOpen(false)}
        />
      )}

      {isStationPassportOpen && passportStation && (
        <StationPassportModal
          isOpen={isStationPassportOpen}
          station={passportStation}
          records={records.filter(r => r.stationCode === passportStation.code)}
          onClose={() => {
            setIsStationPassportOpen(false);
            setPassportStation(null);
          }}
        />
      )}
    </div>
  );
}
