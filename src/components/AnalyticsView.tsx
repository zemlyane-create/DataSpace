import React, { useState, useMemo } from "react";
import { MonitoringRecord, MonitoringStation, ResearchCategory, FilterState } from "../types";
import { CATEGORIES } from "../data/mockData";
import { calculateStats, calculateStudentTTest } from "../utils/ecoCalculators";
import { exportToExcel } from "../utils/excelExporter";
import { 
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from "recharts";
import { 
  BarChart3, 
  TrendingUp, 
  Sparkles, 
  HelpCircle, 
  Filter, 
  Download, 
  Calendar, 
  MapPin, 
  Layers, 
  RefreshCw,
  Lightbulb,
  Calculator,
  CheckCircle2,
  XCircle,
  ShieldCheck,
  Lock
} from "lucide-react";

interface AnalyticsViewProps {
  records: MonitoringRecord[];
  stations: MonitoringStation[];
  filterState: FilterState;
  onFilterChange: (newFilters: Partial<FilterState>) => void;
  onExportReport: () => void;
  isGuest?: boolean;
  canExportData?: boolean;
}

const PARAMETER_OPTIONS: Record<ResearchCategory, { key: string; label: string; unit: string }[]> = {
  hydrosphere: [
    { key: "waterTemp", label: "Температура воды", unit: "°C" },
    { key: "transparency", label: "Прозрачность воды (диск Секки)", unit: "см" },
    { key: "ph", label: "Кислотность (pH)", unit: "рН" },
    { key: "tds", label: "Минерализация (TDS)", unit: "мг/л" },
    { key: "ec", label: "Электропроводность (EC)", unit: "мкСм/см" },
    { key: "nitrates", label: "Нитраты", unit: "мг/л" },
    { key: "dissolvedOxygen", label: "Растворённый кислород", unit: "мг/л" },
  ],
  atmosphere: [
    { key: "airTemp", label: "Температура воздуха", unit: "°C" },
    { key: "humidity", label: "Относительная влажность", unit: "%" },
    { key: "pressure", label: "Атмосферное давление", unit: "мм рт.ст." },
    { key: "cloudiness", label: "Облачность", unit: "%" },
    { key: "windSpeed", label: "Скорость ветра", unit: "м/с" },
    { key: "precipitation", label: "Количество осадков", unit: "мм" },
    { key: "co2Ppm", label: "Содержание CO2", unit: "ppm" },
  ],
  lithosphere: [
    { key: "soilPh", label: "Кислотность почвы (pH)", unit: "рН" },
    { key: "density", label: "Плотность грунта", unit: "г/см³" },
    { key: "permeability", label: "Водопроницаемость", unit: "мм/мин" },
    { key: "waterStability", label: "Водопрочность агрегатов", unit: "%" },
  ],
  biosphere: [
    { key: "shannonIndex", label: "Индекс разнообразия Шеннона (H')", unit: "H'" },
  ],
  anthropogenic: [
    { key: "litterLevel", label: "Уровень захламления / мусора", unit: "баллы (1-5)" },
    { key: "tramplingLevel", label: "Вытаптывание растительности", unit: "баллы (1-5)" },
    { key: "firePitsCount", label: "Количество кострищ", unit: "шт" },
    { key: "noiseLevel", label: "Уровень шума", unit: "дБА" },
    { key: "trafficIntensity", label: "Интенсивность транспорта", unit: "авто/час" },
  ],
  geology: [
    { key: "mohsHardness", label: "Твёрдость по шкале Мооса", unit: "ед." },
  ],
  fossils: [
    { key: "lengthMm", label: "Длина образца", unit: "мм" },
    { key: "widthMm", label: "Ширина образца", unit: "мм" },
  ]
};

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({
  records,
  stations,
  filterState,
  onFilterChange,
  onExportReport,
  isGuest = false,
  canExportData = false
}) => {
  const [aiLoading, setAiLoading] = useState(false);
  const [customAiText, setCustomAiText] = useState<string | null>(null);

  // t-test controls
  const [groupAStation, setGroupAStation] = useState<string>("ALL");
  const [groupBStation, setGroupBStation] = useState<string>("ALL");

  const activeCategory = filterState.category === "ALL" ? "hydrosphere" : filterState.category;
  const currentParams = PARAMETER_OPTIONS[activeCategory] || PARAMETER_OPTIONS.hydrosphere;
  const activeParamObj = currentParams.find(p => p.key === filterState.parameterKey) || currentParams[0];

  // Filter dataset based on controls
  const filteredRecords = useMemo(() => {
    return records.filter(r => {
      if (filterState.category !== "ALL" && r.category !== filterState.category) return false;
      if (filterState.stationCode !== "ALL" && r.stationCode !== filterState.stationCode) return false;
      if (filterState.dateFrom && r.date < filterState.dateFrom) return false;
      if (filterState.dateTo && r.date > filterState.dateTo) return false;
      return true;
    }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [records, filterState]);

  // Format data for Timeline Chart
  const timelineData = useMemo(() => {
    return filteredRecords.map(r => {
      let val: number | undefined = undefined;
      const catData = r[r.category as keyof MonitoringRecord] as any;
      if (catData && catData[activeParamObj.key] !== undefined) {
        val = Number(catData[activeParamObj.key]);
      }
      return {
        date: r.date,
        value: val !== undefined && !isNaN(val) ? val : null,
        stationCode: r.stationCode,
        stationName: r.stationName,
        researcher: isGuest ? "Эко-клуб «Земляне» (Агрегировано)" : r.researcherName,
      };
    }).filter(d => d.value !== null);
  }, [filteredRecords, activeParamObj, isGuest]);

  // Extract numerical values array for active parameter
  const allParamValues = useMemo(() => {
    return timelineData.map(d => d.value as number).filter(v => v !== null && !isNaN(v));
  }, [timelineData]);

  // Sample Statistics (Mean, StdDev, Min, Max)
  const sampleStats = useMemo(() => {
    return calculateStats(allParamValues);
  }, [allParamValues]);

  // Format data for Station Comparison Bar Chart
  const comparisonData = useMemo(() => {
    const mapByStation: Record<string, { stationCode: string; sum: number; count: number }> = {};
    
    records.forEach(r => {
      if (filterState.category !== "ALL" && r.category !== filterState.category) return;
      
      const catData = r[r.category as keyof MonitoringRecord] as any;
      if (catData && catData[activeParamObj.key] !== undefined) {
        const val = Number(catData[activeParamObj.key]);
        if (!isNaN(val)) {
          if (!mapByStation[r.stationCode]) {
            mapByStation[r.stationCode] = { stationCode: r.stationCode, sum: 0, count: 0 };
          }
          mapByStation[r.stationCode].sum += val;
          mapByStation[r.stationCode].count += 1;
        }
      }
    });

    return Object.values(mapByStation).map(item => ({
      stationCode: item.stationCode,
      avgValue: Math.round((item.sum / item.count) * 100) / 100,
    }));
  }, [records, filterState.category, activeParamObj]);

  // Calculate Student's t-test for selected stations Group A vs Group B
  const tTestResults = useMemo(() => {
    const valuesA: number[] = [];
    const valuesB: number[] = [];

    records.forEach(r => {
      if (filterState.category !== "ALL" && r.category !== filterState.category) return;
      const catData = r[r.category as keyof MonitoringRecord] as any;
      if (!catData || catData[activeParamObj.key] === undefined) return;
      const val = Number(catData[activeParamObj.key]);
      if (isNaN(val)) return;

      if (groupAStation === "ALL" || r.stationCode === groupAStation) {
        valuesA.push(val);
      }
      if (groupBStation !== "ALL" && r.stationCode === groupBStation) {
        valuesB.push(val);
      }
    });

    return calculateStudentTTest(valuesA, valuesB);
  }, [records, filterState.category, activeParamObj, groupAStation, groupBStation]);

  // Rule-based summary generation
  const computedAiSummary = useMemo(() => {
    if (timelineData.length === 0) {
      return "Нет зафиксированных данных для выбранного сочетания фильтров. Добавьте новые наблюдения через форму замера или сбросьте фильтры.";
    }

    const firstVal = timelineData[0].value as number;
    const lastVal = timelineData[timelineData.length - 1].value as number;
    const stationName = filterState.stationCode !== "ALL" ? filterState.stationCode : "выбранным станциям";

    const diffPct = firstVal !== 0 ? Math.round(((lastVal - firstVal) / firstVal) * 100) : 0;

    let trendDesc = "";
    if (diffPct > 5) {
      trendDesc = `зафиксирован РОСТ показателя на ${diffPct}% во времени.`;
    } else if (diffPct < -5) {
      trendDesc = `зафиксировано СНИЖЕНИЕ показателя на ${Math.abs(diffPct)}% во времени.`;
    } else {
      trendDesc = `показатель демонстрирует относительную стабильность в пределах нормы.`;
    }

    return `Внимание по объекту (${stationName}): в периоде измерений для параметра «${activeParamObj.label}» ${trendDesc} Среднее арифметическое: ${sampleStats.mean} ${activeParamObj.unit}, Стандартное отклонение: ±${sampleStats.stdDev}. Последний замеренный результат составляет ${lastVal} ${activeParamObj.unit}.`;
  }, [timelineData, filterState.stationCode, activeParamObj, sampleStats]);

  // Deep AI Analysis fetch via backend
  const handleDeepAiAnalysis = async () => {
    setAiLoading(true);
    try {
      const response = await fetch("/api/ai-analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: activeCategory,
          stationCode: filterState.stationCode,
          currentRecord: timelineData[timelineData.length - 1],
          historyRecords: timelineData,
          query: "Сделай научный разбор динамики этого показателя, свяжи с эко-мониторингом и предложи гипотезу для школьников."
        })
      });
      const data = await response.json();
      if (data.text) {
        setCustomAiText(data.text);
      } else if (data.summary) {
        setCustomAiText(data.summary + "\n\nГипотеза: " + data.hypothesis);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Public Aggregated Analytics Security Notice for Guests */}
      {isGuest && (
        <div className="p-4 sm:p-5 bg-gradient-to-r from-emerald-950/90 via-[#0d221a] to-teal-950/80 border-2 border-emerald-500/70 rounded-3xl shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs font-sans">
          <div className="flex items-start sm:items-center space-x-3.5">
            <div className="p-2.5 bg-emerald-900/80 border border-emerald-600 rounded-2xl text-emerald-300 shrink-0">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h4 className="font-bold text-emerald-200 text-sm font-serif">
                  Режим: Публичная агрегированная аналитика
                </h4>
                <span className="px-2 py-0.5 rounded-full bg-emerald-900 border border-emerald-600 text-[10px] font-mono text-emerald-300 font-bold">
                  Гостевой доступ
                </span>
              </div>
              <p className="text-emerald-100/90 mt-1 leading-relaxed">
                Отображаются сезонные тренды, динамика параметров и математическая статистика. В целях защиты от плагиата точные GPS-координаты станций и личные протоколы юных исследователей скрыты.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* FILTER CONTROL BAR */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4 pb-3 border-b border-slate-800">
          <div className="flex items-center space-x-2">
            <Filter className="w-5 h-5 text-emerald-400" />
            <h2 className="text-base sm:text-lg font-bold text-slate-100 font-serif">
              Панель научной фильтрации и анализа
            </h2>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800">
              Выборка: {filteredRecords.length} записей
            </span>
          </div>

          {canExportData && (
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => exportToExcel(records, filterState, activeParamObj.label, activeParamObj.unit)}
                className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl font-bold text-xs sm:text-sm shadow-md transition flex items-center justify-center space-x-2 border border-emerald-400/30"
              >
                <Download className="w-4 h-4 text-emerald-200" />
                <span>Скачать отчет в Excel (.xlsx)</span>
              </button>

              <button
                onClick={onExportReport}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-bold text-xs shadow transition flex items-center justify-center space-x-1.5 border border-slate-700"
              >
                <Download className="w-3.5 h-3.5 text-slate-400" />
                <span>CSV</span>
              </button>
            </div>
          )}
        </div>

        {/* Filter Controls Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          
          {/* 1. Station Filter */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center">
              <MapPin className="w-3.5 h-3.5 mr-1 text-emerald-400" />
              1. Пост / Станция:
            </label>
            <select
              value={filterState.stationCode}
              onChange={(e) => onFilterChange({ stationCode: e.target.value })}
              className="w-full bg-slate-800 border border-slate-700 text-slate-100 text-xs rounded-xl p-2.5 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            >
              <option value="ALL">Все посты и станции</option>
              {stations.map(st => (
                <option key={st.id} value={st.code}>
                  {st.code} — {st.name}
                </option>
              ))}
            </select>
          </div>

          {/* 2. Category Filter */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center">
              <Layers className="w-3.5 h-3.5 mr-1 text-blue-400" />
              2. Категория исследований:
            </label>
            <select
              value={filterState.category}
              onChange={(e) => {
                const newCat = e.target.value as ResearchCategory | "ALL";
                const catParams = PARAMETER_OPTIONS[newCat === "ALL" ? "hydrosphere" : newCat];
                onFilterChange({ 
                  category: newCat, 
                  parameterKey: catParams[0].key 
                });
              }}
              className="w-full bg-slate-800 border border-slate-700 text-slate-100 text-xs rounded-xl p-2.5 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            >
              <option value="ALL">Все категории</option>
              {CATEGORIES.map(cat => (
                <option key={cat.id} value={cat.id}>
                  {cat.name} [{cat.prefix}]
                </option>
              ))}
            </select>
          </div>

          {/* 3. Parameter Filter */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center">
              <BarChart3 className="w-3.5 h-3.5 mr-1 text-amber-400" />
              3. Выбираемый параметр:
            </label>
            <select
              value={filterState.parameterKey}
              onChange={(e) => onFilterChange({ parameterKey: e.target.value })}
              className="w-full bg-slate-800 border border-slate-700 text-slate-100 text-xs rounded-xl p-2.5 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            >
              {currentParams.map(p => (
                <option key={p.key} value={p.key}>
                  {p.label} ({p.unit})
                </option>
              ))}
            </select>
          </div>

          {/* 4. Date Range Filter */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center">
              <Calendar className="w-3.5 h-3.5 mr-1 text-purple-400" />
              4. Диапазон дат:
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              <input
                type="date"
                value={filterState.dateFrom}
                onChange={(e) => onFilterChange({ dateFrom: e.target.value })}
                className="bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-xl p-2 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
              <input
                type="date"
                value={filterState.dateTo}
                onChange={(e) => onFilterChange({ dateTo: e.target.value })}
                className="bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-xl p-2 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
          </div>

        </div>
      </div>

      {/* STATISTICAL SUMMARY CARDS (Среднее арифметическое, Стандартное отклонение, t-критерий Стьюдента) */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-2 text-emerald-400">
            <Calculator className="w-5 h-5 text-amber-300" />
            <h3 className="text-base font-bold text-white font-serif">
              Модуль математико-статистической обработки
            </h3>
          </div>
          <span className="text-xs text-slate-400 bg-slate-800 px-3 py-1 rounded-lg border border-slate-700">
            Параметр: {activeParamObj.label} ({activeParamObj.unit})
          </span>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5">
            <span className="text-xs text-slate-400 block font-medium">1. Объем выборки (n):</span>
            <span className="text-xl font-extrabold text-white">{sampleStats.n} замера</span>
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5">
            <span className="text-xs text-emerald-400 block font-medium">2. Среднее арифметическое (X̄):</span>
            <span className="text-xl font-extrabold text-emerald-300">
              {sampleStats.mean} <span className="text-xs text-slate-400 font-normal">{activeParamObj.unit}</span>
            </span>
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5">
            <span className="text-xs text-sky-400 block font-medium">3. Стандартное отклонение (s):</span>
            <span className="text-xl font-extrabold text-sky-300">
              ±{sampleStats.stdDev} <span className="text-xs text-slate-400 font-normal">{activeParamObj.unit}</span>
            </span>
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5">
            <span className="text-xs text-purple-400 block font-medium">4. Мин / Макс значения:</span>
            <span className="text-base font-bold text-purple-200">
              {sampleStats.min} ... {sampleStats.max} {activeParamObj.unit}
            </span>
          </div>
        </div>

        {/* Student's t-test Calculation Box */}
        <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-4 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-2.5">
            <div className="flex items-center space-x-2">
              <Calculator className="w-4 h-4 text-emerald-400" />
              <h4 className="text-sm font-bold text-slate-200 font-serif">
                Сравнение двух выборок по t-критерию Стьюдента (для независимых групп)
              </h4>
            </div>
          </div>

          {/* Group Selectors */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Выборка А (Группа 1):</label>
              <select
                value={groupAStation}
                onChange={(e) => setGroupAStation(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 text-slate-200 p-2 rounded-xl"
              >
                <option value="ALL">Все станции выборки</option>
                {stations.map(st => (
                  <option key={st.id} value={st.code}>{st.code} — {st.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">Выборка Б (Группа 2):</label>
              <select
                value={groupBStation}
                onChange={(e) => setGroupBStation(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 text-slate-200 p-2 rounded-xl"
              >
                <option value="ALL">Выберите станцию для сравнения...</option>
                {stations.map(st => (
                  <option key={st.id} value={st.code}>{st.code} — {st.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* t-test Results Card */}
          <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl text-xs space-y-2">
            {groupBStation === "ALL" ? (
              <p className="text-slate-400 italic">
                Выберите «Выборку Б» выше, чтобы рассчитать t-критерий Стьюдента и оценить достоверность различий между двумя постами наблюдения.
              </p>
            ) : (
              <div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-2 text-slate-300">
                  <div>X̄₁ = <strong>{tTestResults.stats1.mean}</strong> (n₁={tTestResults.stats1.n})</div>
                  <div>X̄₂ = <strong>{tTestResults.stats2.mean}</strong> (n₂={tTestResults.stats2.n})</div>
                  <div>t-критерий: <strong>{tTestResults.tStat}</strong></div>
                  <div>Уров. p: <strong>{tTestResults.pValue}</strong></div>
                </div>

                <div className={`p-2.5 rounded-lg border font-bold flex items-center space-x-2 ${
                  tTestResults.isSignificant 
                    ? "bg-emerald-950/80 border-emerald-600 text-emerald-200" 
                    : "bg-amber-950/60 border-amber-700 text-amber-200"
                }`}>
                  {tTestResults.isSignificant ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : (
                    <XCircle className="w-4 h-4 text-amber-400 shrink-0" />
                  )}
                  <span>Вывод: {tTestResults.message}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* CHARTS + AI ANALYST GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* CHARTS CONTAINER (Left 2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Chart 1: Timeline (Временной график динамики) */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <div>
                <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">
                  Временной график (Timeline)
                </span>
                <h3 className="text-base font-bold text-white font-serif flex items-center space-x-2">
                  <TrendingUp className="w-5 h-5 text-emerald-400 inline mr-1" />
                  <span>Динамика показателя «{activeParamObj.label}» во времени</span>
                </h3>
              </div>
              <span className="text-xs text-slate-400 bg-slate-800 px-2.5 py-1 rounded-lg">
                Ед. изм: {activeParamObj.unit}
              </span>
            </div>

            {timelineData.length > 0 ? (
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={timelineData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="date" stroke="#94a3b8" tick={{ fontSize: 11 }} />
                    <YAxis stroke="#94a3b8" tick={{ fontSize: 11 }} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", borderRadius: "12px", color: "#f8fafc" }}
                      formatter={(val: any) => [`${val} ${activeParamObj.unit}`, activeParamObj.label]}
                      labelFormatter={(lbl) => `Дата: ${lbl}`}
                    />
                    <Legend wrapperStyle={{ paddingTop: "10px", fontSize: "12px" }} />
                    <Line 
                      type="monotone" 
                      dataKey="value" 
                      name={`${activeParamObj.label} (${activeParamObj.unit})`} 
                      stroke="#10b981" 
                      strokeWidth={3} 
                      dot={{ r: 6, fill: "#34d399", strokeWidth: 2, stroke: "#065f46" }}
                      activeDot={{ r: 8 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center text-slate-400 text-sm bg-slate-950/50 rounded-xl border border-dashed border-slate-800">
                Нет данных для построения графика по выбранным фильтрам
              </div>
            )}
          </div>

          {/* Chart 2: Comparative Bar Chart (Сравнительные диаграммы) */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <div>
                <span className="text-xs font-semibold text-blue-400 uppercase tracking-wider">
                  Сравнительный анализ по станциям
                </span>
                <h3 className="text-base font-bold text-white font-serif">
                  Сопоставление «{activeParamObj.label}» между постами наблюдения
                </h3>
              </div>
            </div>

            {comparisonData.length > 0 ? (
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={comparisonData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="stationCode" stroke="#94a3b8" tick={{ fontSize: 11 }} />
                    <YAxis stroke="#94a3b8" tick={{ fontSize: 11 }} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", borderRadius: "12px", color: "#f8fafc" }}
                      formatter={(val: any) => [`${val} ${activeParamObj.unit}`, "Среднее значение"]}
                    />
                    <Bar dataKey="avgValue" name={`Средний уровень (${activeParamObj.unit})`} fill="#3b82f6" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-56 flex items-center justify-center text-slate-400 text-sm bg-slate-950/50 rounded-xl border border-dashed border-slate-800">
                Недостаточно станций для сравнения
              </div>
            )}
          </div>

        </div>

        {/* AI ECO-ANALYST & GUIDING QUESTIONS (Right 1 col) */}
        <div className="space-y-6">
          
          {/* AI Eco-Analyst Card */}
          <div className="bg-gradient-to-b from-slate-900 via-slate-900 to-emerald-950/40 border border-emerald-800/60 rounded-2xl p-5 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none"></div>

            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2 text-emerald-400">
                <Sparkles className="w-5 h-5 text-amber-300 animate-spin-slow" />
                <h3 className="text-base font-bold text-white font-serif">
                  Интеллектуальный модуль «ИИ-Эко-аналитик»
                </h3>
              </div>
              <span className="text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded bg-emerald-900 text-emerald-300 border border-emerald-700">
                AI Studio
              </span>
            </div>

            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 text-xs sm:text-sm text-slate-200 leading-relaxed mb-4">
              {customAiText ? (
                <div className="whitespace-pre-line text-emerald-100">
                  {customAiText}
                </div>
              ) : (
                <p>{computedAiSummary}</p>
              )}
            </div>

            <button
              onClick={handleDeepAiAnalysis}
              disabled={aiLoading}
              className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 text-white rounded-xl font-bold text-xs transition flex items-center justify-center space-x-2 shadow-lg"
            >
              {aiLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-amber-300" />
                  <span>Генерация гипотезы Gemini AI...</span>
                </>
              ) : (
                <>
                  <Lightbulb className="w-4 h-4 text-amber-300" />
                  <span>Сгенерировать гипотезу с Gemini AI</span>
                </>
              )}
            </button>
          </div>

          {/* Interactive Guiding Questions for Students */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
            <div className="flex items-center space-x-2 text-amber-400 mb-3">
              <HelpCircle className="w-5 h-5" />
              <h3 className="text-base font-bold text-white font-serif">
                Наводящие вопросы исследователю
              </h3>
            </div>

            <p className="text-xs text-slate-400 mb-3">
              Ответьте на эти вопросы для формулирования выводов в исследовательском отчете:
            </p>

            <ul className="space-y-2.5">
              <li className="p-3 bg-slate-800/80 rounded-xl text-xs text-slate-200 border border-slate-700/80 flex items-start space-x-2">
                <span className="text-amber-400 font-bold">1.</span>
                <span>
                  Связаны ли изменения параметра «{activeParamObj.label}» с сезонными факторами или осадками?
                </span>
              </li>
              <li className="p-3 bg-slate-800/80 rounded-xl text-xs text-slate-200 border border-slate-700/80 flex items-start space-x-2">
                <span className="text-amber-400 font-bold">2.</span>
                <span>
                  Какова роль зафиксированного значения в жизнедеятельности местных биоценозов?
                </span>
              </li>
              <li className="p-3 bg-slate-800/80 rounded-xl text-xs text-slate-200 border border-slate-700/80 flex items-start space-x-2">
                <span className="text-amber-400 font-bold">3.</span>
                <span>
                  Подтверждают ли данные t-критерия Стьюдента наличие статистически значимого экологического тренда?
                </span>
              </li>
            </ul>
          </div>

        </div>

      </div>

    </div>
  );
};
