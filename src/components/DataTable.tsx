import React, { useState, useMemo } from "react";
import { MonitoringRecord, MonitoringStation, ResearchCategory } from "../types";
import { CATEGORIES } from "../data/mockData";
import { 
  Table as TableIcon, 
  Search, 
  Download, 
  AlertTriangle, 
  Eye, 
  Trash2, 
  FileText,
  X,
  MapPin,
  Settings,
  QrCode,
  Wifi,
  WifiOff,
  CloudUpload,
  Clock,
  Edit3
} from "lucide-react";

interface DataTableProps {
  records: MonitoringRecord[];
  stations?: MonitoringStation[];
  onDeleteRecord: (id: string) => void;
  onEditRecord?: (record: MonitoringRecord) => void;
  onDeleteStation?: (code: string) => void;
  onExportCsv: () => void;
  selectedCategory: ResearchCategory | "ALL";
  setSelectedCategory: (cat: ResearchCategory | "ALL") => void;
  selectedStationCode: string;
  setSelectedStationCode: (code: string) => void;
  onOpenPassportModal?: (station?: MonitoringStation) => void;
  canExportData?: boolean;
  canDeleteRecords?: boolean;
  isOnline?: boolean;
  pendingSyncCount?: number;
  onSyncPendingRecords?: () => void;
  isSyncing?: boolean;
}

function fmtVal(val: any, unit: string = ""): string {
  if (val === undefined || val === null || val === "" || Number.isNaN(val)) {
    return "нет замера";
  }
  return `${val}${unit}`;
}

export const DataTable: React.FC<DataTableProps> = ({
  records,
  stations = [],
  onDeleteRecord,
  onEditRecord,
  onDeleteStation,
  onExportCsv,
  selectedCategory,
  setSelectedCategory,
  selectedStationCode,
  setSelectedStationCode,
  onOpenPassportModal,
  canExportData = false,
  canDeleteRecords = false,
  isOnline = true,
  pendingSyncCount = 0,
  onSyncPendingRecords,
  isSyncing = false
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [viewRecord, setViewRecord] = useState<MonitoringRecord | null>(null);
  const [isStationManagerOpen, setIsStationManagerOpen] = useState(false);
  const [recordToDelete, setRecordToDelete] = useState<MonitoringRecord | null>(null);
  const [stationToDeleteCode, setStationToDeleteCode] = useState<string | null>(null);

  // Filter dataset
  const filteredRecords = useMemo(() => {
    return records.filter(r => {
      if (selectedCategory !== "ALL" && r.category !== selectedCategory) return false;
      if (selectedStationCode !== "ALL" && r.stationCode !== selectedStationCode) return false;

      if (searchTerm.trim() !== "") {
        const term = searchTerm.toLowerCase();
        const matchCode = r.stationCode.toLowerCase().includes(term);
        const matchName = r.stationName.toLowerCase().includes(term);
        const matchResearcher = r.researcherName.toLowerCase().includes(term);
        const matchDate = r.date.includes(term);
        return matchCode || matchName || matchResearcher || matchDate;
      }

      return true;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [records, selectedCategory, selectedStationCode, searchTerm]);

  // Unique list of station codes from stations + records
  const allStationCodes = useMemo(() => {
    const set = new Set<string>();
    stations.forEach(s => set.add(s.code));
    records.forEach(r => set.add(r.stationCode));
    return Array.from(set);
  }, [stations, records]);

  return (
    <div className="bg-[#0f1d18]/90 border border-emerald-800/60 rounded-3xl p-4 sm:p-6 shadow-2xl space-y-4 backdrop-blur-md">
      
      {/* Table Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-emerald-800/60">
        <div>
          <div className="flex items-center space-x-2 text-emerald-400">
            <TableIcon className="w-5 h-5 text-emerald-300" />
            <h2 className="text-base sm:text-xl font-bold text-slate-100 font-serif">
              Полевой научный журнал замеров
            </h2>
          </div>
          <p className="text-xs text-emerald-200/80 mt-1">
            Интерактивный архив замеров с автоматической шифрацией станций (ALX-01, TBL-01) и поддержкой статуса «нет замера».
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {onOpenPassportModal && (
            <button
              onClick={() => {
                const activeSt = stations.find(s => s.code === selectedStationCode) || stations[0] || (records.length > 0 ? {
                  id: `st-${records[0].stationCode}`,
                  code: records[0].stationCode,
                  name: records[0].stationName,
                  lat: records[0].lat,
                  lng: records[0].lng,
                  category: records[0].category,
                  establishedYear: 2024,
                  description: "Стационарный пункт экологических наблюдений."
                } : null);
                if (activeSt) {
                  onOpenPassportModal(activeSt);
                }
              }}
              className="px-3.5 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl font-bold text-xs shadow transition flex items-center space-x-1.5 border border-amber-400/50 hover:scale-105 shrink-0 cursor-pointer"
              title="Открыть Паспорт стационара"
            >
              <QrCode className="w-4 h-4 text-amber-200" />
              <span>Паспорт стационара</span>
            </button>
          )}

          {canDeleteRecords && onDeleteStation && (
            <button
              onClick={() => setIsStationManagerOpen(true)}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-amber-300 rounded-xl font-bold text-xs shadow transition flex items-center space-x-1.5 border border-slate-700"
            >
              <Settings className="w-4 h-4 text-amber-400" />
              <span>Управление постами / Удалить пост</span>
            </button>
          )}

          {canExportData && (
            <button
              onClick={onExportCsv}
              className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl font-bold text-xs sm:text-sm shadow-md transition flex items-center justify-center space-x-2 border border-emerald-400/40 shrink-0 hover:scale-105"
              title="Скачать структурированную таблицу Excel со всеми параметрами в отдельных колонках, границами и переносом текста"
            >
              <Download className="w-4 h-4" />
              <span>Экспорт журнала (Excel .xlsx)</span>
            </button>
          )}
        </div>
      </div>

      {/* Offline Pending Sync Banner */}
      {pendingSyncCount > 0 && (
        <div className="bg-amber-950/60 border border-amber-500/80 rounded-2xl p-3 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-amber-500/20 rounded-xl border border-amber-500/40 text-amber-400 shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs sm:text-sm font-bold text-amber-200 flex items-center space-x-1.5">
                <span>В локальной очереди офлайн-замеров: {pendingSyncCount}</span>
                <span className="px-2 py-0.5 bg-amber-500 text-slate-950 rounded-full font-black text-[10px]">
                  Ожидают отправки
                </span>
              </div>
              <p className="text-[11px] text-amber-300/80 mt-0.5">
                {isOnline 
                  ? "Интернет-соединение доступно. Вы можете синхронизировать эти замеры с сервером прямо сейчас."
                  : "Приложение работает в автономном режиме. Данные сохраняются в памяти устройства."}
              </p>
            </div>
          </div>
          {onSyncPendingRecords && (
            <button
              onClick={onSyncPendingRecords}
              disabled={isSyncing || !isOnline}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-2 shrink-0 shadow-md border ${
                !isOnline
                  ? "bg-slate-800 border-slate-700 text-slate-400 cursor-not-allowed opacity-70"
                  : "bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-slate-950 font-black border-amber-300 active:scale-95"
              }`}
            >
              <CloudUpload className={`w-4 h-4 ${isSyncing ? "animate-bounce" : ""}`} />
              <span>{isSyncing ? "Синхронизация с базой..." : "Синхронизировать сейчас"}</span>
            </button>
          )}
        </div>
      )}

      {/* Filter & Search Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-3 text-emerald-400/80" />
          <input
            type="text"
            placeholder="Поиск по шифру, исследователю или дате..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[#13261f] border border-emerald-800/80 text-slate-100 text-xs rounded-xl pl-9 pr-3 py-2.5 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
          />
        </div>

        {/* Category Filter */}
        <div>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value as ResearchCategory | "ALL")}
            className="w-full bg-[#13261f] border border-emerald-800/80 text-slate-100 text-xs rounded-xl p-2.5 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
          >
            <option value="ALL">Все категории исследований</option>
            {CATEGORIES.map(c => (
              <option key={c.id} value={c.id}>
                {c.name} [{c.prefix}]
              </option>
            ))}
          </select>
        </div>

        {/* Station Filter */}
        <div>
          <select
            value={selectedStationCode}
            onChange={(e) => setSelectedStationCode(e.target.value)}
            className="w-full bg-[#13261f] border border-emerald-800/80 text-slate-100 text-xs rounded-xl p-2.5 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
          >
            <option value="ALL">Все посты и шифры</option>
            {Array.from(new Set(records.map(r => r.stationCode))).map(code => (
              <option key={code} value={code}>
                {code}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Table Element */}
      <div className="overflow-x-auto rounded-2xl border border-emerald-800/60 bg-[#0d1814]">
        <table className="w-full text-left text-xs text-slate-200">
          <thead className="bg-[#13261f] text-emerald-200 font-bold border-b border-emerald-800/60 uppercase tracking-wider text-[11px]">
            <tr>
              <th className="p-3">Шифр станции</th>
              <th className="p-3">Категория</th>
              <th className="p-3">Дата</th>
              <th className="p-3">Координаты</th>
              <th className="p-3">Ключевые показатели</th>
              <th className="p-3">Исследователь</th>
              <th className="p-3 text-right">Действия</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-emerald-900/40 bg-[#0b1512]/90">
            {filteredRecords.length > 0 ? (
              filteredRecords.map(rec => {
                const catInfo = CATEGORIES.find(c => c.id === rec.category);
                
                // Construct brief summary string
                let valSummary = "";
                if (rec.hydrosphere) {
                  const h = rec.hydrosphere;
                  valSummary = `Твод: ${fmtVal(h.waterTemp, "°C")}, Прозрачность: ${fmtVal(h.transparency, " см")}, pH: ${fmtVal(h.ph)}, TDS: ${fmtVal(h.tds, " мг/л")}`;
                } else if (rec.atmosphere) {
                  const a = rec.atmosphere;
                  valSummary = `Твозд: ${fmtVal(a.airTemp, "°C")}, Влажность: ${fmtVal(a.humidity, "%")}, CO2: ${fmtVal(a.co2Ppm, " ppm")}`;
                } else if (rec.lithosphere) {
                  const l = rec.lithosphere;
                  valSummary = `pH почвы: ${fmtVal(l.soilPh)}, Состав: ${fmtVal(l.texture)}, Плотность: ${fmtVal(l.density, " г/см³")}`;
                } else if (rec.biosphere) {
                  const b = rec.biosphere;
                  valSummary = `Шеннон H': ${fmtVal(b.shannonIndex)}, Флора: ${fmtVal(b.floraSpecies)}`;
                } else if (rec.anthropogenic) {
                  const ant = rec.anthropogenic;
                  valSummary = `Мусор: ${fmtVal(ant.litterLevel, "/5")}, Шум: ${fmtVal(ant.noiseLevel, " дБА")}`;
                } else if (rec.geology) {
                  const g = rec.geology;
                  valSummary = `Минерал: ${fmtVal(g.mineralName)}, Твердость: ${fmtVal(g.mohsHardness)}`;
                } else if (rec.fossils) {
                  const f = rec.fossils;
                  valSummary = `Таксон: ${fmtVal(f.organismGroup)}, Длина: ${fmtVal(f.lengthMm, " мм")}`;
                } else {
                  valSummary = "нет замера";
                }

                // Add custom attributes to summary if present
                if (rec.customAttributes) {
                  const customList = Array.isArray(rec.customAttributes)
                    ? rec.customAttributes
                    : Object.values(rec.customAttributes);
                  if (customList.length > 0) {
                    const customSummary = customList
                      .map(cm => `${cm.name}: ${cm.value}${cm.unit ? " " + cm.unit : ""}`)
                      .join(", ");
                    valSummary = valSummary === "нет замера" ? customSummary : `${valSummary}; ${customSummary}`;
                  }
                }

                return (
                  <tr key={rec.id} className="hover:bg-emerald-950/40 transition">
                    <td className="p-3 font-mono font-bold text-amber-300">
                      <div className="flex items-center space-x-1.5">
                        <span>{rec.stationCode}</span>
                        {(rec.isOfflinePending || rec.syncStatus === "pending") && (
                          <span 
                            className="px-1.5 py-0.5 bg-amber-500/20 border border-amber-500/60 text-amber-300 rounded text-[9px] font-sans font-bold flex items-center space-x-0.5"
                            title="Замер сохранен в памяти устройства и ожидает отправки в базу Supabase"
                          >
                            <Clock className="w-2.5 h-2.5 inline" />
                            <span>Офлайн</span>
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-3">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${catInfo?.color || "bg-slate-700 text-white"}`}>
                        {catInfo?.name}
                      </span>
                    </td>
                    <td className="p-3 whitespace-nowrap text-slate-300">
                      {rec.date}
                    </td>
                    <td className="p-3 font-mono text-[11px] text-slate-400 whitespace-nowrap">
                      {rec.lat.toFixed(4)}°, {rec.lng.toFixed(4)}°
                    </td>
                    <td className="p-3 text-slate-200 max-w-xs truncate">
                      {rec.isAnomaly && (
                        <span className="inline-flex items-center text-amber-400 font-bold mr-1.5" title={rec.aiAlert}>
                          <AlertTriangle className="w-3.5 h-3.5" />
                        </span>
                      )}
                      <span>{valSummary}</span>
                    </td>
                    <td className="p-3 text-slate-300 whitespace-nowrap">
                      {rec.researcherName}
                    </td>
                    <td className="p-3 text-right space-x-1 whitespace-nowrap">
                      <button
                        onClick={() => setViewRecord(rec)}
                        title="Просмотреть карточку замера"
                        className="p-1.5 bg-[#13261f] hover:bg-emerald-800 text-slate-200 rounded-lg transition border border-emerald-700/60"
                      >
                        <Eye className="w-3.5 h-3.5 text-emerald-300" />
                      </button>
                      {onEditRecord && (
                        <button
                          onClick={() => onEditRecord(rec)}
                          title="Редактировать замер (станцию, категорию, дату, показатели)"
                          className="p-1.5 bg-[#13261f] hover:bg-amber-700/60 text-slate-200 hover:text-amber-300 rounded-lg transition border border-emerald-700/60"
                        >
                          <Edit3 className="w-3.5 h-3.5 text-amber-400" />
                        </button>
                      )}
                      {canDeleteRecords && (
                        <button
                          onClick={() => setRecordToDelete(rec)}
                          title="Удалить замер из журнала"
                          className="p-1.5 bg-[#13261f] hover:bg-rose-900/60 text-slate-400 hover:text-rose-300 rounded-lg transition border border-emerald-700/60"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={7} className="p-8 text-center text-slate-400 text-sm italic">
                  Записей по заданным условиям поиска не найдено
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* RECORD DETAILS MODAL */}
      {viewRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="bg-[#0f1d18] border border-emerald-800 rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl relative text-slate-100">
            <button
              onClick={() => setViewRecord(null)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white bg-slate-800 rounded-xl transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-2 text-amber-300 mb-1">
              <FileText className="w-5 h-5" />
              <span className="font-mono font-bold text-lg">{viewRecord.stationCode}</span>
            </div>
            <h2 className="text-xl font-bold text-white font-serif mb-1">
              {viewRecord.stationName}
            </h2>
            <p className="text-xs text-emerald-200/80 mb-4">
              Замер от {viewRecord.date} | Исследователь: {viewRecord.researcherName} | Координаты: {viewRecord.lat}°, {viewRecord.lng}°
            </p>

            {/* Anomaly Alert Banner if present */}
            {viewRecord.isAnomaly && viewRecord.aiAlert && (
              <div className="mb-4 p-3 bg-amber-950/80 border border-amber-600/80 rounded-xl text-amber-200 text-xs flex items-start space-x-2">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <strong>Аномальное отклонение (ИИ-Предупреждение):</strong>
                  <p className="mt-0.5">{viewRecord.aiAlert}</p>
                </div>
              </div>
            )}

            {/* Detailed Parameters Display */}
            <div className="bg-[#13261f]/90 border border-emerald-800/80 rounded-2xl p-4 text-xs space-y-2 text-slate-200 mb-4">
              <h4 className="font-bold text-emerald-300 uppercase tracking-wider text-[11px] mb-2 border-b border-emerald-800 pb-1">
                Результаты измерений ({viewRecord.category}):
              </h4>

              {viewRecord.hydrosphere && (
                <div className="grid grid-cols-2 gap-2">
                  <div>Температура воды: <strong>{fmtVal(viewRecord.hydrosphere.waterTemp, " °C")}</strong></div>
                  <div>Прозрачность: <strong>{fmtVal(viewRecord.hydrosphere.transparency, " см")}</strong></div>
                  <div>Кислотность (pH): <strong>{fmtVal(viewRecord.hydrosphere.ph)}</strong></div>
                  <div>Минерализация TDS: <strong>{fmtVal(viewRecord.hydrosphere.tds, " мг/л")}</strong></div>
                  <div>Электропроводность EC: <strong>{fmtVal(viewRecord.hydrosphere.ec, " мкСм/см")}</strong></div>
                  <div>Нитраты: <strong>{fmtVal(viewRecord.hydrosphere.nitrates, " мг/л")}</strong></div>
                  <div>Кислород: <strong>{fmtVal(viewRecord.hydrosphere.dissolvedOxygen, " мг/л")}</strong></div>
                </div>
              )}

              {viewRecord.atmosphere && (
                <div className="grid grid-cols-2 gap-2">
                  <div>Температура воздуха: <strong>{fmtVal(viewRecord.atmosphere.airTemp, " °C")}</strong></div>
                  <div>Влажность: <strong>{fmtVal(viewRecord.atmosphere.humidity, " %")}</strong></div>
                  <div>Давление: <strong>{fmtVal(viewRecord.atmosphere.pressure, " мм")}</strong></div>
                  <div>Облачность: <strong>{fmtVal(viewRecord.atmosphere.cloudiness, " %")}</strong></div>
                  <div>Скорость ветра: <strong>{fmtVal(viewRecord.atmosphere.windSpeed, " м/с")}</strong></div>
                  <div>Осадки: <strong>{fmtVal(viewRecord.atmosphere.precipitation, " мм")}</strong></div>
                  <div>CO2: <strong>{fmtVal(viewRecord.atmosphere.co2Ppm, " ppm")}</strong></div>
                </div>
              )}

              {viewRecord.biosphere && (
                <div className="space-y-1.5">
                  <div>Флора: <strong>{fmtVal(viewRecord.biosphere.floraSpecies)}</strong></div>
                  <div>Фауна: <strong>{fmtVal(viewRecord.biosphere.faunaSpecies)}</strong></div>
                  <div>Индекс Шеннона H': <strong>{fmtVal(viewRecord.biosphere.shannonIndex)}</strong></div>
                </div>
              )}

              {viewRecord.anthropogenic && (
                <div className="grid grid-cols-2 gap-2">
                  <div>Уровень мусора: <strong>{fmtVal(viewRecord.anthropogenic.litterLevel, " / 5")}</strong></div>
                  <div>Уровень шума: <strong>{fmtVal(viewRecord.anthropogenic.noiseLevel, " дБА")}</strong></div>
                  <div>Стихийная свалка: <strong>{viewRecord.anthropogenic.illegalDumps ? "Обнаружена" : "Нет"}</strong></div>
                </div>
              )}

              {viewRecord.geology && (
                <div className="space-y-1.5">
                  <div>Минерал: <strong>{fmtVal(viewRecord.geology.mineralName)}</strong></div>
                  <div>Твердость (Моос): <strong>{fmtVal(viewRecord.geology.mohsHardness)}</strong></div>
                </div>
              )}

              {viewRecord.fossils && (
                <div className="space-y-1.5">
                  <div>Таксон: <strong>{fmtVal(viewRecord.fossils.organismGroup)}</strong></div>
                  <div>Длина: <strong>{fmtVal(viewRecord.fossils.lengthMm, " мм")}</strong></div>
                </div>
              )}

              {/* Custom Attributes in View Modal */}
              {viewRecord.customAttributes && (
                (() => {
                  const customList = Array.isArray(viewRecord.customAttributes)
                    ? viewRecord.customAttributes
                    : Object.values(viewRecord.customAttributes);
                  if (customList.length === 0) return null;
                  return (
                    <div className="pt-2 border-t border-emerald-800/60 mt-2">
                      <div className="text-[11px] font-bold text-teal-300 mb-1">Пользовательские параметры:</div>
                      <div className="grid grid-cols-2 gap-2">
                        {customList.map((cm, idx) => (
                          <div key={cm.id || idx}>
                            {cm.name}: <strong className="text-amber-300 font-mono">{cm.value} {cm.unit || ""}</strong>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()
              )}
            </div>

            {viewRecord.notes && (
              <div className="text-xs text-slate-300 bg-[#13261f] p-3 rounded-xl border border-emerald-800">
                <strong>Полевые примечания:</strong> {viewRecord.notes}
              </div>
            )}

            <div className="mt-5 flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-emerald-900/60">
              {canDeleteRecords ? (
                <button
                  onClick={() => setRecordToDelete(viewRecord)}
                  className="px-3.5 py-2 bg-rose-950 hover:bg-rose-900 text-rose-200 border border-rose-800 rounded-xl font-bold text-xs transition flex items-center space-x-1.5"
                >
                  <Trash2 className="w-4 h-4 text-rose-400" />
                  <span>Удалить этот замер</span>
                </button>
              ) : <div />}

              <div className="flex items-center space-x-2">
                {onEditRecord && (
                  <button
                    onClick={() => {
                      const target = viewRecord;
                      setViewRecord(null);
                      onEditRecord(target);
                    }}
                    className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold rounded-xl text-xs flex items-center space-x-1.5 transition shadow active:scale-95"
                  >
                    <Edit3 className="w-4 h-4 text-slate-950" />
                    <span>Редактировать замер</span>
                  </button>
                )}

                <button
                  onClick={() => setViewRecord(null)}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs shadow transition"
                >
                  Закрыть карточку
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* RECORD DELETE CONFIRMATION MODAL */}
      {recordToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in font-sans">
          <div className="bg-[#0f1d18] border-2 border-rose-500/80 rounded-3xl max-w-md w-full p-6 shadow-2xl relative text-slate-100">
            <div className="flex items-center space-x-3 text-rose-400 mb-3">
              <div className="p-2 bg-rose-950 rounded-xl border border-rose-800">
                <AlertTriangle className="w-6 h-6 text-rose-400" />
              </div>
              <h3 className="text-lg font-bold font-serif text-white">
                Подтверждение удаления
              </h3>
            </div>
            
            <p className="text-xs text-slate-300 leading-relaxed mb-6">
              Вы действительно хотите удалить замер по станции <strong className="text-amber-300 font-mono">{recordToDelete.stationCode}</strong> от <strong className="text-amber-300">{recordToDelete.date}</strong>? Это действие безвозвратно удалит запись из полевого журнала.
            </p>

            <div className="flex items-center justify-end space-x-3">
              <button
                onClick={() => setRecordToDelete(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-bold text-xs"
              >
                Отмена
              </button>
              <button
                onClick={() => {
                  onDeleteRecord(recordToDelete.id);
                  if (viewRecord?.id === recordToDelete.id) setViewRecord(null);
                  setRecordToDelete(null);
                }}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl font-bold text-xs shadow-lg transition flex items-center space-x-1.5"
              >
                <Trash2 className="w-4 h-4" />
                <span>Удалить замер</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STATIONS MANAGER MODAL */}
      {isStationManagerOpen && onDeleteStation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
          <div className="bg-[#0f1d18] border-2 border-emerald-500 rounded-3xl max-w-xl w-full max-h-[85vh] overflow-y-auto p-6 shadow-2xl relative text-slate-100 font-sans">
            <button
              onClick={() => setIsStationManagerOpen(false)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white bg-slate-800 rounded-full transition border border-slate-700"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-2 text-amber-400 mb-1">
              <Settings className="w-5 h-5" />
              <h3 className="text-lg font-bold font-serif text-white">
                Управление постами эко-мониторинга
              </h3>
            </div>
            <p className="text-xs text-emerald-300 mb-4">
              Здесь вы можете просмотреть все созданные гидрометеорологические и био-посты и при необходимости удалить пост целиком вместе с его данными.
            </p>

            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {stations.map(st => {
                const recCount = records.filter(r => r.stationCode === st.code).length;

                return (
                  <div
                    key={st.id || st.code}
                    className="p-3 bg-[#13261f] border border-emerald-800 rounded-2xl flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-mono font-bold text-amber-300 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-700">
                          {st.code}
                        </span>
                        <span className="font-bold text-white">{st.name}</span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1">
                        Категория: {st.category} • Замеров в базе: {recCount} • Координаты: {st.lat.toFixed(4)}°, {st.lng.toFixed(4)}°
                      </p>
                    </div>

                    <button
                      onClick={() => setStationToDeleteCode(st.code)}
                      className="px-3 py-1.5 bg-rose-950 hover:bg-rose-900 text-rose-200 rounded-xl font-bold text-xs border border-rose-800 transition flex items-center space-x-1 shrink-0 ml-2"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Удалить пост</span>
                    </button>
                  </div>
                );
              })}
            </div>

            <div className="mt-5 pt-3 border-t border-emerald-900/60 flex justify-end">
              <button
                onClick={() => setIsStationManagerOpen(false)}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs"
              >
                Готово
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STATION DELETE CONFIRMATION MODAL */}
      {stationToDeleteCode && onDeleteStation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in font-sans">
          <div className="bg-[#0f1d18] border-2 border-rose-500/80 rounded-3xl max-w-md w-full p-6 shadow-2xl relative text-slate-100">
            <div className="flex items-center space-x-3 text-rose-400 mb-3">
              <div className="p-2 bg-rose-950 rounded-xl border border-rose-800">
                <AlertTriangle className="w-6 h-6 text-rose-400" />
              </div>
              <h3 className="text-lg font-bold font-serif text-white">
                Удаление поста эко-мониторинга
              </h3>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed mb-6">
              Вы действительно хотите удалить пост <strong className="text-amber-300 font-mono">{stationToDeleteCode}</strong> и все связанные с ним замеры?
            </p>

            <div className="flex items-center justify-end space-x-3">
              <button
                onClick={() => setStationToDeleteCode(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-bold text-xs"
              >
                Отмена
              </button>
              <button
                onClick={() => {
                  onDeleteStation(stationToDeleteCode);
                  setStationToDeleteCode(null);
                }}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl font-bold text-xs shadow-lg transition flex items-center space-x-1.5"
              >
                <Trash2 className="w-4 h-4" />
                <span>Удалить пост и замеры</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
