import React, { useRef, useState, useMemo, useEffect } from "react";
import { MonitoringStation, MonitoringRecord, ResearchCategory } from "../types";
import { 
  X, 
  Download, 
  Printer, 
  CheckCircle2, 
  Shield, 
  Award, 
  Loader2, 
  FileCheck,
  Sparkles,
  Activity,
  Droplets,
  Wind,
  Trash2,
  Volume2,
  Thermometer,
  CloudRain,
  TestTube,
  Waves,
  Copy,
  Check,
  TrendingUp,
  TrendingDown,
  Minus,
  MapPin,
  Edit3,
  Save,
  FileCode,
  Compass,
  Mountain,
  Building,
  User,
  Calendar,
  Layers,
  Info
} from "lucide-react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import logoSrc from "../assets/images/logotip.gif";
import { StationMiniMap } from "./StationMiniMap";

interface StationPassportModalProps {
  isOpen: boolean;
  onClose: () => void;
  station: MonitoringStation | null;
  stations?: MonitoringStation[];
  onSelectStation?: (station: MonitoringStation) => void;
  records: MonitoringRecord[];
  isDark?: boolean;
}

const CATEGORY_NAMES_RU: Record<string, string> = {
  hydrosphere: "Гидросфера (Водные экосистемы)",
  atmosphere: "Атмосфера (Метеорология)",
  lithosphere: "Литосфера (Почвенный покров)",
  biosphere: "Биосфера (Биомониторинг)",
  anthropogenic: "Антропогенная нагрузка",
  geology: "Геология и минералогия",
  fossils: "Палеонтология (Затерянный мир)"
};

interface MetricPoint {
  date: string;
  value: number;
}

interface DynamicMetric {
  id: string;
  name: string;
  unit: string;
  color: string;
  points: MetricPoint[];
}

interface StationCustomMeta {
  purpose: string;
  organization: string;
  director: string;
  launchDate: string;
  altitude: string;
  landscapeZone: string;
  waterBody: string;
  biotopeDescription: string;
  stationName?: string;
  customLat?: string;
  customLng?: string;
}

/**
 * Helper to build time series dynamics for key monitoring parameters
 */
function buildStationDynamics(records: MonitoringRecord[]) {
  const chrono = [...records].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const waterTempPoints: MetricPoint[] = [];
  const phPoints: MetricPoint[] = [];
  const o2Points: MetricPoint[] = [];
  const tdsPoints: MetricPoint[] = [];

  const airTempPoints: MetricPoint[] = [];
  const humidityPoints: MetricPoint[] = [];
  const co2Points: MetricPoint[] = [];

  const noisePoints: MetricPoint[] = [];
  const litterPoints: MetricPoint[] = [];

  chrono.forEach(rec => {
    if (rec.hydrosphere) {
      const h = rec.hydrosphere;
      if (h.waterTemp !== undefined && h.waterTemp !== null && !isNaN(h.waterTemp)) {
        waterTempPoints.push({ date: rec.date, value: Number(h.waterTemp) });
      }
      if (h.ph !== undefined && h.ph !== null && !isNaN(h.ph)) {
        phPoints.push({ date: rec.date, value: Number(h.ph) });
      }
      if (h.dissolvedOxygen !== undefined && h.dissolvedOxygen !== null && !isNaN(h.dissolvedOxygen)) {
        o2Points.push({ date: rec.date, value: Number(h.dissolvedOxygen) });
      }
      if (h.tds !== undefined && h.tds !== null && !isNaN(h.tds)) {
        tdsPoints.push({ date: rec.date, value: Number(h.tds) });
      }
    }

    if (rec.atmosphere) {
      const a = rec.atmosphere;
      if (a.airTemp !== undefined && a.airTemp !== null && !isNaN(a.airTemp)) {
        airTempPoints.push({ date: rec.date, value: Number(a.airTemp) });
      }
      if (a.humidity !== undefined && a.humidity !== null && !isNaN(a.humidity)) {
        humidityPoints.push({ date: rec.date, value: Number(a.humidity) });
      }
      if (a.co2Percent !== undefined && a.co2Percent !== null && !isNaN(a.co2Percent)) {
        co2Points.push({ date: rec.date, value: Number(a.co2Percent) });
      } else if (a.co2Ppm !== undefined && a.co2Ppm !== null && !isNaN(a.co2Ppm)) {
        co2Points.push({ date: rec.date, value: Number((a.co2Ppm / 10000).toFixed(4)) });
      }
    }

    if (rec.anthropogenic) {
      const an = rec.anthropogenic;
      if (an.noiseLevel !== undefined && an.noiseLevel !== null && !isNaN(an.noiseLevel)) {
        noisePoints.push({ date: rec.date, value: Number(an.noiseLevel) });
      }
      if (an.litterLevel !== undefined && an.litterLevel !== null && !isNaN(an.litterLevel)) {
        litterPoints.push({ date: rec.date, value: Number(an.litterLevel) });
      }
    }
  });

  return {
    hydrosphere: [
      { id: "waterTemp", name: "Температура воды", unit: "°C", color: "#0284c7", points: waterTempPoints },
      { id: "ph", name: "Водородный показатель (pH)", unit: "ед.", color: "#059669", points: phPoints },
      { id: "dissolvedOxygen", name: "Растворенный кислород (O₂)", unit: "мг/л", color: "#0ea5e9", points: o2Points },
      { id: "tds", name: "Минерализация (TDS)", unit: "мг/л (ppm)", color: "#d97706", points: tdsPoints },
    ] as DynamicMetric[],
    atmosphere: [
      { id: "airTemp", name: "Температура воздуха", unit: "°C", color: "#ea580c", points: airTempPoints },
      { id: "humidity", name: "Относительная влажность", unit: "%", color: "#2563eb", points: humidityPoints },
      { id: "co2", name: "Концентрация углекислого газа (CO₂)", unit: "%", color: "#7c3aed", points: co2Points },
    ] as DynamicMetric[],
    anthropogenic: [
      { id: "noise", name: "Шумовое загрязнение", unit: "дБ (дБА)", color: "#e11d48", points: noisePoints },
      { id: "litter", name: "Индекс замусоренности биотопа", unit: "баллы (1–5)", color: "#b45309", points: litterPoints },
    ] as DynamicMetric[]
  };
}

/**
 * Pure SVG Sparkline Component (Ultra-crisp & 100% compatible with html2canvas and jsPDF)
 */
const SparklineCard: React.FC<{ metric: DynamicMetric }> = ({ metric }) => {
  const { name, unit, color, points } = metric;
  const count = points.length;

  if (count === 0) {
    return (
      <div className="bg-white/90 p-2.5 rounded-xl border border-[#ded5c2] flex flex-col justify-between shadow-2xs">
        <div>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[#3d3429] line-clamp-1">{name}</span>
            <span className="text-[10px] font-mono text-[#8c8072]">{unit}</span>
          </div>
          <div className="text-sm font-bold text-[#8c8072] mt-1 font-mono">—</div>
        </div>
        <div className="mt-2 pt-1 border-t border-dashed border-[#e6decf] flex items-center justify-between text-[9px] text-[#8c8072]">
          <span>Нет зафиксированных замеров</span>
        </div>
      </div>
    );
  }

  const values = points.map(p => p.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min === 0 ? 1 : max - min;
  const latest = points[count - 1].value;
  const first = points[0].value;
  const delta = Number((latest - first).toFixed(2));
  const avg = (values.reduce((a, b) => a + b, 0) / count).toFixed(1);

  const W = 200;
  const H = 44;
  const padX = 8;
  const padY = 6;
  const chartW = W - 2 * padX;
  const chartH = H - 2 * padY;

  const coords = count === 1
    ? [{ x: W / 2, y: H / 2 }]
    : points.map((p, i) => {
        const x = padX + (i / (count - 1)) * chartW;
        const y = H - padY - ((p.value - min) / range) * chartH;
        return { x, y };
      });

  const polylineStr = coords.map(c => `${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(" ");
  const areaPolygonStr = count > 1
    ? `${padX},${H - padY} ${polylineStr} ${W - padX},${H - padY}`
    : "";

  return (
    <div className="bg-white/95 p-2.5 rounded-xl border border-[#ded5c2] flex flex-col justify-between shadow-2xs">
      <div>
        <div className="flex items-center justify-between gap-1">
          <span className="text-[11px] font-bold text-[#233f2a] line-clamp-1" title={name}>
            {name}
          </span>
          <span className="text-[10px] font-mono font-medium text-[#7a6f62] shrink-0">
            {unit}
          </span>
        </div>

        <div className="flex items-baseline justify-between mt-1">
          <div className="flex items-baseline space-x-1">
            <span className="text-sm sm:text-base font-black font-mono text-[#183120]">
              {latest}
            </span>
            <span className="text-[10px] text-[#5c5043] font-mono">{unit}</span>
          </div>

          {count > 1 ? (
            <div className={`flex items-center space-x-0.5 text-[10px] font-bold font-mono px-1.5 py-0.2 rounded border ${
              delta > 0 
                ? "bg-amber-50 text-amber-800 border-amber-300" 
                : delta < 0 
                  ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                  : "bg-slate-50 text-slate-700 border-slate-300"
            }`}>
              {delta > 0 ? (
                <>
                  <TrendingUp className="w-3 h-3 text-amber-600" />
                  <span>+{delta}</span>
                </>
              ) : delta < 0 ? (
                <>
                  <TrendingDown className="w-3 h-3 text-emerald-600" />
                  <span>{delta}</span>
                </>
              ) : (
                <>
                  <Minus className="w-3 h-3 text-slate-500" />
                  <span>0.0</span>
                </>
              )}
            </div>
          ) : (
            <span className="text-[9px] text-[#7a6f62] font-mono bg-[#f0ebd9] px-1 rounded">
              1 замер ({points[0].date})
            </span>
          )}
        </div>
      </div>

      <div className="my-1.5 w-full bg-[#fbf9f4] rounded-lg border border-[#eee6d8] p-1 overflow-hidden">
        <svg 
          viewBox={`0 0 ${W} ${H}`} 
          className="w-full h-9 block overflow-visible"
          style={{ maxHeight: "38px" }}
        >
          <line x1={padX} y1={H - padY} x2={W - padX} y2={H - padY} stroke="#e2d8c7" strokeWidth="1" strokeDasharray="2 2" />
          <line x1={padX} y1={padY} x2={W - padX} y2={padY} stroke="#e2d8c7" strokeWidth="1" strokeDasharray="2 2" />

          {count > 1 && (
            <polygon 
              points={areaPolygonStr} 
              fill={color} 
              fillOpacity="0.16" 
            />
          )}

          {count > 1 && (
            <polyline 
              points={polylineStr} 
              fill="none" 
              stroke={color} 
              strokeWidth="2.2" 
              strokeLinecap="round" 
              strokeLinejoin="round" 
            />
          )}

          {coords.map((c, idx) => (
            <circle 
              key={idx} 
              cx={c.x} 
              cy={c.y} 
              r={idx === count - 1 ? "3.2" : "2"} 
              fill={idx === count - 1 ? color : "#ffffff"} 
              stroke={color} 
              strokeWidth="1.6" 
            />
          ))}
        </svg>
      </div>

      <div className="pt-1 border-t border-[#ede6d9] flex items-center justify-between text-[9px] font-mono text-[#6b5f50]">
        <span>Мин: <strong>{min}</strong> • Макс: <strong>{max}</strong></span>
        <span>Ср: <strong>{avg}</strong></span>
      </div>
    </div>
  );
};

/**
 * Format only the parameters that were actually filled in for a record
 */
function formatFilledParameters(record: MonitoringRecord): string[] {
  const parts: string[] = [];

  if (record.hydrosphere) {
    const h = record.hydrosphere;
    if (h.waterTemp !== undefined && h.waterTemp !== null) parts.push(`T воды: ${h.waterTemp}°C`);
    if (h.ph !== undefined && h.ph !== null) parts.push(`pH: ${h.ph}`);
    if (h.transparency !== undefined && h.transparency !== null) parts.push(`Прозрачность: ${h.transparency} см`);
    if (h.tds !== undefined && h.tds !== null) parts.push(`TDS: ${h.tds} мг/л`);
    if (h.ec !== undefined && h.ec !== null) parts.push(`EC: ${h.ec} мкСм/см`);
    if (h.nitrates !== undefined && h.nitrates !== null) parts.push(`Нитраты: ${h.nitrates} мг/л`);
    if (h.dissolvedOxygen !== undefined && h.dissolvedOxygen !== null) parts.push(`O₂: ${h.dissolvedOxygen} мг/л`);
  }

  if (record.atmosphere) {
    const a = record.atmosphere;
    if (a.airTemp !== undefined && a.airTemp !== null) parts.push(`T воздуха: ${a.airTemp}°C`);
    if (a.humidity !== undefined && a.humidity !== null) parts.push(`Влажность: ${a.humidity}%`);
    if (a.pressure !== undefined && a.pressure !== null) parts.push(`Давление: ${a.pressure} мм рт.ст.`);
    if (a.co2Ppm !== undefined && a.co2Ppm !== null) {
      const pct = (a.co2Ppm / 10000).toFixed(4);
      parts.push(`CO₂: ${a.co2Ppm} ppm (${pct}%)`);
    } else if (a.co2Percent !== undefined && a.co2Percent !== null) {
      parts.push(`CO₂: ${a.co2Percent}%`);
    }
    if (a.windSpeed !== undefined && a.windSpeed !== null) {
      parts.push(`Ветер: ${a.windSpeed} м/с ${a.windDirection || ""}`.trim());
    }
    if (a.cloudiness !== undefined && a.cloudiness !== null) parts.push(`Облачность: ${a.cloudiness}%`);
    if (a.precipitation !== undefined && a.precipitation !== null) parts.push(`Осадки: ${a.precipitation} мм`);
  }

  if (record.lithosphere) {
    const l = record.lithosphere;
    if (l.soilPh !== undefined && l.soilPh !== null) parts.push(`pH почвы: ${l.soilPh}`);
    if (l.texture) parts.push(`Состав: ${l.texture}`);
    if (l.soilColor) parts.push(`Цвет: ${l.soilColor}`);
    if (l.heavyMetals) parts.push(`Тяж. металлы: ${l.heavyMetals}`);
    if (l.waterStability !== undefined && l.waterStability !== null) parts.push(`Водопрочность: ${l.waterStability}%`);
    if (l.density !== undefined && l.density !== null) parts.push(`Плотность: ${l.density} г/см³`);
  }

  if (record.biosphere) {
    const b = record.biosphere;
    if (b.floraSpecies) parts.push(`Флора: ${b.floraSpecies}`);
    if (b.faunaSpecies) parts.push(`Фауна: ${b.faunaSpecies}`);
    if (b.lifeSigns) parts.push(`Следы: ${b.lifeSigns}`);
    if (b.shannonIndex !== undefined && b.shannonIndex !== null) parts.push(`Индекс Шеннона: ${b.shannonIndex}`);
  }

  if (record.anthropogenic) {
    const an = record.anthropogenic;
    if (an.litterLevel !== undefined && an.litterLevel !== null) parts.push(`Замусоренность: ${an.litterLevel}/5`);
    if (an.tramplingLevel !== undefined && an.tramplingLevel !== null) parts.push(`Вытаптывание: ${an.tramplingLevel}/5`);
    if (an.noiseLevel !== undefined && an.noiseLevel !== null) parts.push(`Шум: ${an.noiseLevel} дБА`);
    if (an.trafficIntensity !== undefined && an.trafficIntensity !== null) parts.push(`Транспорт: ${an.trafficIntensity} авт/ч`);
    if (an.firePitsCount !== undefined && an.firePitsCount !== null) parts.push(`Кострища: ${an.firePitsCount} шт`);
    if (an.illegalDumps) parts.push(`Свалка: Обнаружена`);
  }

  if (record.geology) {
    const g = record.geology;
    if (g.mineralName) parts.push(`Минерал: ${g.mineralName}`);
    if (g.geneticType) parts.push(`Тип: ${g.geneticType}`);
    if (g.colorInSample) parts.push(`Цвет: ${g.colorInSample}`);
    if (g.luster) parts.push(`Блеск: ${g.luster}`);
    if (g.cleavageFracture) parts.push(`Спайность: ${g.cleavageFracture}`);
    if (g.mohsHardness !== undefined && g.mohsHardness !== null) parts.push(`Моос: ${g.mohsHardness}`);
  }

  if (record.fossils) {
    const f = record.fossils;
    if (f.organismGroup) parts.push(`Группа: ${f.organismGroup}`);
    if (f.certaintyLevel) parts.push(`Точность: ${f.certaintyLevel}`);
    if (f.lengthMm !== undefined && f.lengthMm !== null) parts.push(`Длина: ${f.lengthMm} мм`);
    if (f.widthMm !== undefined && f.widthMm !== null) parts.push(`Ширина: ${f.widthMm} мм`);
  }

  if (record.customAttributes) {
    if (Array.isArray(record.customAttributes)) {
      record.customAttributes.forEach(m => {
        if (m && m.name && m.value !== undefined && m.value !== "") {
          parts.push(`${m.name}: ${m.value} ${m.unit || ""}`.trim());
        }
      });
    } else if (typeof record.customAttributes === "object") {
      Object.values(record.customAttributes).forEach((m: any) => {
        if (m && m.name && m.value !== undefined && m.value !== "") {
          parts.push(`${m.name}: ${m.value} ${m.unit || ""}`.trim());
        }
      });
    }
  }

  return parts;
}

/**
 * Extract photos and visual artifacts from records
 */
function extractVisualArtifacts(records: MonitoringRecord[]) {
  const artifacts: Array<{
    id: string;
    title: string;
    category: string;
    date: string;
    researcher: string;
    photoUrl?: string;
    details: string;
  }> = [];

  records.forEach(rec => {
    if (rec.geology?.photoUrl || rec.geology?.mineralName) {
      artifacts.push({
        id: `geo-${rec.id}`,
        title: `Минерал: ${rec.geology?.mineralName || "Полевой образец"}`,
        category: "Геология",
        date: rec.date,
        researcher: rec.researcherName,
        photoUrl: rec.geology?.photoUrl,
        details: `Тип: ${rec.geology?.geneticType || "—"}, цвет: ${rec.geology?.colorInSample || "—"}, твердость: ${rec.geology?.mohsHardness || "—"}`
      });
    }

    if (rec.fossils?.photoUrl || rec.fossils?.organismGroup) {
      artifacts.push({
        id: `fos-${rec.id}`,
        title: `Ископаемое: ${rec.fossils?.organismGroup || "Палео-находка"}`,
        category: "Палеонтология",
        date: rec.date,
        researcher: rec.researcherName,
        photoUrl: rec.fossils?.photoUrl,
        details: `Точность: ${rec.fossils?.certaintyLevel || "—"}, размер: ${rec.fossils?.lengthMm ? rec.fossils.lengthMm + " мм" : "—"}`
      });
    }

    if (rec.biosphere?.photoUrl || (rec.biosphere?.floraSpecies && rec.biosphere.floraSpecies.length > 2)) {
      artifacts.push({
        id: `bio-${rec.id}`,
        title: `Флора/Фауна: ${rec.biosphere?.floraSpecies || rec.biosphere?.faunaSpecies || "Биотоп"}`,
        category: "Биосфера",
        date: rec.date,
        researcher: rec.researcherName,
        photoUrl: rec.biosphere?.photoUrl,
        details: `Следы: ${rec.biosphere?.lifeSigns || "—"}, индекс: ${rec.biosphere?.shannonIndex || "—"}`
      });
    }
  });

  return artifacts.slice(0, 6);
}

export const StationPassportModal: React.FC<StationPassportModalProps> = ({
  isOpen,
  onClose,
  station,
  stations = [],
  onSelectStation,
  records,
  isDark = true
}) => {
  const passportPrintRef = useRef<HTMLDivElement>(null);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [exportNotice, setExportNotice] = useState<string | null>(null);
  const [isEditingCustomMeta, setIsEditingCustomMeta] = useState(false);

  // Safe fallback to prevent blank/dark screens if station is missing
  const activeStation = station || (stations.length > 0 ? stations[0] : null);

  // Safe fields with guaranteed fallbacks
  const safeCode = activeStation?.code || "ALX-01";
  const safeName = activeStation?.name || "Экологический стационар";
  const safeLat = typeof activeStation?.lat === "number" && !isNaN(activeStation.lat) ? activeStation.lat : 54.9123;
  const safeLng = typeof activeStation?.lng === "number" && !isNaN(activeStation.lng) ? activeStation.lng : 69.1234;
  const safeCategory = activeStation?.category || "hydrosphere";
  const safeYear = activeStation?.establishedYear || 2024;
  const safeDesc = activeStation?.description || "Стационарный пункт долговременных полевых и лабораторных экологических наблюдений.";

  // User-customizable Administrative & Physical-Geographic Data with persistence
  const [customMeta, setCustomMeta] = useState<StationCustomMeta>({
    stationName: "",
    purpose: "Внесите данные",
    organization: "Внесите данные",
    director: "______",
    launchDate: "Внесите данные",
    altitude: "Внесите данные",
    landscapeZone: "Внесите данные",
    waterBody: "Внесите данные",
    biotopeDescription: "Внесите данные",
    customLat: "",
    customLng: ""
  });

  // Load persisted metadata for this station
  useEffect(() => {
    if (!safeCode) return;
    try {
      const saved = localStorage.getItem(`zemlyane_station_meta_${safeCode}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        setCustomMeta({
          stationName: parsed.stationName || safeName,
          purpose: parsed.purpose || "Внесите данные",
          organization: parsed.organization || "Внесите данные",
          director: parsed.director || "______",
          launchDate: parsed.launchDate || "Внесите данные",
          altitude: parsed.altitude || "Внесите данные",
          landscapeZone: parsed.landscapeZone || "Внесите данные",
          waterBody: parsed.waterBody || "Внесите данные",
          biotopeDescription: parsed.biotopeDescription || safeDesc || "Внесите данные",
          customLat: parsed.customLat ? String(parsed.customLat) : String(safeLat),
          customLng: parsed.customLng ? String(parsed.customLng) : String(safeLng)
        });
      } else {
        setCustomMeta({
          stationName: safeName,
          purpose: "Внесите данные",
          organization: "Внесите данные",
          director: "______",
          launchDate: "Внесите данные",
          altitude: "Внесите данные",
          landscapeZone: "Внесите данные",
          waterBody: "Внесите данные",
          biotopeDescription: safeDesc || "Внесите данные",
          customLat: String(safeLat),
          customLng: String(safeLng)
        });
      }
    } catch {
      // ignore
    }
  }, [safeCode, safeDesc, safeYear, safeCategory, safeName, safeLat, safeLng]);

  const handleSaveCustomMeta = () => {
    try {
      localStorage.setItem(`zemlyane_station_meta_${safeCode}`, JSON.stringify(customMeta));
      setIsEditingCustomMeta(false);
      setExportNotice("✅ Данные паспорта стационара сохранены!");
      setTimeout(() => setExportNotice(null), 3000);
    } catch (e) {
      console.warn("Storage notice:", e);
    }
  };

  const handleResetCustomMeta = () => {
    const freshTemplate: StationCustomMeta = {
      stationName: safeName,
      purpose: "Внесите данные",
      organization: "Внесите данные",
      director: "______",
      launchDate: "Внесите данные",
      altitude: "Внесите данные",
      landscapeZone: "Внесите данные",
      waterBody: "Внесите данные",
      biotopeDescription: "Внесите данные",
      customLat: String(safeLat),
      customLng: String(safeLng)
    };
    setCustomMeta(freshTemplate);
    try {
      localStorage.setItem(`zemlyane_station_meta_${safeCode}`, JSON.stringify(freshTemplate));
      setExportNotice("Шаблон паспорта сброшен к исходным значениям.");
      setTimeout(() => setExportNotice(null), 3000);
    } catch {
      // ignore
    }
  };

  const resolvedLat = useMemo(() => {
    if (customMeta.customLat && !isNaN(Number(customMeta.customLat))) {
      return Number(customMeta.customLat);
    }
    return safeLat;
  }, [customMeta.customLat, safeLat]);

  const resolvedLng = useMemo(() => {
    if (customMeta.customLng && !isNaN(Number(customMeta.customLng))) {
      return Number(customMeta.customLng);
    }
    return safeLng;
  }, [customMeta.customLng, safeLng]);

  const resolvedName = useMemo(() => {
    if (customMeta.stationName && customMeta.stationName.trim()) {
      return customMeta.stationName.trim();
    }
    return safeName;
  }, [customMeta.stationName, safeName]);

  const stationRecords = useMemo(() => {
    return records
      .filter(r => r.stationCode === safeCode)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [records, safeCode]);

  const dynamics = useMemo(() => {
    return buildStationDynamics(stationRecords);
  }, [stationRecords]);

  const artifacts = extractVisualArtifacts(stationRecords);
  const currentCategoryRu = CATEGORY_NAMES_RU[safeCategory] || safeCategory;

  const latFormatted = `${resolvedLat.toFixed(5)}° N`;
  const lngFormatted = `${resolvedLng.toFixed(5)}° E`;

  // Timestamp for bottom right footer
  const currentTimestampStr = useMemo(() => {
    const d = new Date();
    const dateStr = d.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" });
    const timeStr = d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
    return `${dateStr} в ${timeStr}`;
  }, []);

  /**
   * 1. Export as HTML document (100% reliable, zero font degradation, editable)
   */
  const handleExportHtml = () => {
    if (!passportPrintRef.current) return;
    const content = passportPrintRef.current.innerHTML;
    const htmlDocument = `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Паспорт экологического стационара ${safeCode}</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    body { background-color: #f4efe6; font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif; }
    @media print {
      body { background-color: #ffffff !important; padding: 0 !important; }
      .no-print { display: none !important; }
    }
  </style>
</head>
<body class="p-4 sm:p-8 flex justify-center">
  <div class="w-full max-w-[840px] bg-[#fbf8f2] text-[#2b241d] p-8 rounded-2xl shadow-xl border border-[#dcd5c9]">
    ${content}
  </div>
</body>
</html>`;

    const blob = new Blob([htmlDocument], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Паспорт_стационара_${safeCode}_${new Date().toISOString().split("T")[0]}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setExportNotice("✅ Паспорт сохранен как автономный HTML-документ!");
    setTimeout(() => setExportNotice(null), 3500);
  };

  /**
   * 2. High-Resolution Visual PDF Export
   */
  const handleExportPdf = async () => {
    if (!passportPrintRef.current) return;
    setIsExportingPdf(true);
    setExportNotice(null);

    try {
      const element = passportPrintRef.current;
      
      const canvas = await html2canvas(element, {
        scale: 2.0,
        useCORS: true,
        allowTaint: false,
        backgroundColor: "#fbf8f2",
        logging: false,
        windowWidth: 1024,
        imageTimeout: 6000,
        ignoreElements: (el) => {
          return el.classList.contains("no-export-pdf");
        }
      });

      const imgData = canvas.toDataURL("image/png", 1.0);
      const pdf = new jsPDF("p", "mm", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      const imgWidth = pdfWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight, undefined, "FAST");
      heightLeft -= pdfHeight;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight, undefined, "FAST");
        heightLeft -= pdfHeight;
      }

      pdf.save(`Паспорт_стационара_${safeCode}_${new Date().toISOString().split("T")[0]}.pdf`);
      setExportNotice("✅ Паспорт станции успешно сохранён в PDF!");
      setTimeout(() => setExportNotice(null), 4000);
    } catch (err: any) {
      console.warn("Visual PDF export notice:", err);
      // Fallback: offer HTML export directly
      handleExportHtml();
    } finally {
      setIsExportingPdf(false);
    }
  };

  /**
   * 3. Print / Save as PDF via native browser dialog
   */
  const handlePrint = () => {
    if (!passportPrintRef.current) return;
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      window.print();
      return;
    }

    const content = passportPrintRef.current.innerHTML;
    printWindow.document.write(`<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <title>Печать паспорта стационара ${safeCode}</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    body { background-color: #ffffff; padding: 20px; font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1f2937; }
    @page { size: A4; margin: 12mm; }
    @media print {
      body { padding: 0 !important; }
      .no-print { display: none !important; }
    }
  </style>
</head>
<body>
  <div style="max-width: 820px; margin: 0 auto; background: #fbf8f2; padding: 24px; border-radius: 12px; border: 1px solid #dcd5c9;">
    ${content}
  </div>
  <script>
    setTimeout(() => {
      window.print();
      window.close();
    }, 400);
  </script>
</body>
</html>`);
    printWindow.document.close();
  };

  if (!isOpen || !activeStation) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in font-sans overflow-y-auto">
      <div className={`rounded-3xl max-w-4xl w-full shadow-2xl relative border-2 my-auto max-h-[94vh] flex flex-col ${
        isDark ? "bg-[#091510] border-emerald-500/70 text-slate-100" : "bg-[#f4efe6] border-emerald-700/60 text-slate-900"
      }`}>
        
        {/* Top Control Action Bar */}
        <div className={`p-4 border-b flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shrink-0 rounded-t-3xl ${
          isDark ? "bg-[#0d2119] border-emerald-800/80" : "bg-[#e8decb] border-[#d5c7ad]"
        }`}>
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-[#4f6f52] text-white rounded-xl shadow">
              <FileCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-700">
                  ID: {safeCode}
                </span>
                <span className="text-[11px] font-bold text-amber-500 tracking-wide uppercase">
                  Паспорт экологического стационара
                </span>
              </div>
              <h2 className="text-sm sm:text-base font-bold text-emerald-100 line-clamp-1">
                {safeName}
              </h2>
            </div>
          </div>

          {/* Top Actions: Edit Meta, Select Station, Download PDF, Print, Close */}
          <div className="flex items-center space-x-2 w-full sm:w-auto justify-end flex-wrap gap-y-1.5">
            {stations.length > 1 && onSelectStation && (
              <select
                value={safeCode}
                onChange={(e) => {
                  const target = stations.find(s => s.code === e.target.value);
                  if (target) onSelectStation(target);
                }}
                className="px-2.5 py-1.5 bg-slate-900 text-emerald-200 border border-emerald-700 rounded-xl text-xs font-mono font-bold cursor-pointer"
                title="Переключить стационарный пост"
              >
                {stations.map(st => (
                  <option key={st.code} value={st.code}>
                    {st.code} — {st.name}
                  </option>
                ))}
              </select>
            )}

            {/* Toggle Edit Metadata Button */}
            <button
              onClick={() => {
                if (isEditingCustomMeta) {
                  handleSaveCustomMeta();
                } else {
                  setIsEditingCustomMeta(true);
                }
              }}
              className={`px-3 py-1.5 rounded-xl font-bold text-xs transition flex items-center space-x-1 border cursor-pointer ${
                isEditingCustomMeta
                  ? "bg-amber-600 hover:bg-amber-500 text-white border-amber-400 shadow-md"
                  : "bg-emerald-900/80 hover:bg-emerald-800 text-emerald-200 border-emerald-700"
              }`}
              title="Редактировать административные и физико-географические данные"
            >
              {isEditingCustomMeta ? (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>Сохранить</span>
                </>
              ) : (
                <>
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Изменить данные</span>
                </>
              )}
            </button>

            {/* Download PDF Button */}
            <button
              onClick={handleExportPdf}
              disabled={isExportingPdf}
              className="px-3.5 py-1.5 bg-[#4f6f52] hover:bg-[#3d5a40] text-white rounded-xl font-bold text-xs shadow-md transition flex items-center space-x-1.5 disabled:opacity-50 cursor-pointer"
              title="Скачать официальный документ PDF"
            >
              {isExportingPdf ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span className="hidden sm:inline">Рендеринг...</span>
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5" />
                  <span>Скачать PDF</span>
                </>
              )}
            </button>

            {/* Print / Save as PDF Button */}
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-bold text-xs transition flex items-center space-x-1 cursor-pointer"
              title="Открыть чистый предпросмотр для печати / сохранения в PDF"
            >
              <Printer className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Печать</span>
            </button>

            {/* Export HTML Button */}
            <button
              onClick={handleExportHtml}
              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl transition border border-slate-700 cursor-pointer"
              title="Экспортировать как веб-документ (.html)"
            >
              <FileCode className="w-4 h-4" />
            </button>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-1.5 bg-slate-800 hover:bg-rose-900 text-slate-300 hover:text-white rounded-xl transition border border-slate-700 cursor-pointer"
              title="Закрыть"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Container */}
        <div className="p-3 sm:p-6 overflow-y-auto bg-slate-900/60 flex flex-col items-center gap-6">
          
          {/* Active Editing Form Prompt if editing is active */}
          {isEditingCustomMeta && (
            <div className="w-full max-w-[820px] bg-amber-950/90 border border-amber-600/70 p-4 rounded-2xl text-amber-100 shadow-xl space-y-3 animate-fade-in">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-2 border-b border-amber-700/60 gap-2">
                <div className="flex items-center space-x-2">
                  <Edit3 className="w-4 h-4 text-amber-400" />
                  <span className="font-bold text-xs uppercase tracking-wider text-amber-300">
                    Редактирование характеристик паспорта #{safeCode}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={handleResetCustomMeta}
                    type="button"
                    className="px-2.5 py-1 bg-slate-900/80 hover:bg-slate-800 text-amber-300 border border-amber-600/50 rounded-lg text-xs font-semibold transition cursor-pointer"
                    title="Сбросить все поля к чистому шаблону"
                  >
                    Очистить / Сбросить
                  </button>
                  <button
                    onClick={handleSaveCustomMeta}
                    type="button"
                    className="px-3.5 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-lg text-xs transition flex items-center space-x-1 cursor-pointer shadow"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>Сохранить в паспорт</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold text-amber-300 mb-1">
                    Наименование стационарного пункта:
                  </label>
                  <input
                    type="text"
                    value={customMeta.stationName || ""}
                    onChange={(e) => setCustomMeta({ ...customMeta, stationName: e.target.value })}
                    className="w-full p-2 bg-slate-900/90 border border-amber-600/60 rounded-lg text-xs text-white focus:border-amber-400 focus:outline-none"
                    placeholder="Например: г. Костанай — городская эко-станция"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold text-amber-300 mb-1">
                    1. Назначение стационара:
                  </label>
                  <textarea
                    rows={2}
                    value={customMeta.purpose}
                    onChange={(e) => setCustomMeta({ ...customMeta, purpose: e.target.value })}
                    className="w-full p-2 bg-slate-900/90 border border-amber-600/60 rounded-lg text-xs text-white focus:border-amber-400 focus:outline-none"
                    placeholder="Например: Комплексный экологический мониторинг природно-антропогенного ландшафта..."
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-amber-300 mb-1">
                    2. Организация / Учреждение:
                  </label>
                  <input
                    type="text"
                    value={customMeta.organization}
                    onChange={(e) => setCustomMeta({ ...customMeta, organization: e.target.value })}
                    className="w-full p-2 bg-slate-900/90 border border-amber-600/60 rounded-lg text-xs text-white focus:border-amber-400 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-amber-300 mb-1">
                    3. Руководитель:
                  </label>
                  <input
                    type="text"
                    value={customMeta.director}
                    onChange={(e) => setCustomMeta({ ...customMeta, director: e.target.value })}
                    className="w-full p-2 bg-slate-900/90 border border-amber-600/60 rounded-lg text-xs text-white focus:border-amber-400 focus:outline-none"
                    placeholder="ФИО руководителя"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-amber-300 mb-1">
                    4. Дата основания / запуска:
                  </label>
                  <input
                    type="text"
                    value={customMeta.launchDate}
                    onChange={(e) => setCustomMeta({ ...customMeta, launchDate: e.target.value })}
                    className="w-full p-2 bg-slate-900/90 border border-amber-600/60 rounded-lg text-xs text-white focus:border-amber-400 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-amber-300 mb-1">
                    5. Абсолютная высота над уровнем моря (м):
                  </label>
                  <input
                    type="text"
                    value={customMeta.altitude}
                    onChange={(e) => setCustomMeta({ ...customMeta, altitude: e.target.value })}
                    className="w-full p-2 bg-slate-900/90 border border-amber-600/60 rounded-lg text-xs text-white focus:border-amber-400 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-amber-300 mb-1">
                    6. Географические координаты: Широта (°N):
                  </label>
                  <input
                    type="number"
                    step="0.00001"
                    value={customMeta.customLat || ""}
                    onChange={(e) => setCustomMeta({ ...customMeta, customLat: e.target.value })}
                    className="w-full p-2 bg-slate-900/90 border border-amber-600/60 rounded-lg text-xs text-white font-mono focus:border-amber-400 focus:outline-none"
                    placeholder="53.2144"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-amber-300 mb-1">
                    Географические координаты: Долгота (°E):
                  </label>
                  <input
                    type="number"
                    step="0.00001"
                    value={customMeta.customLng || ""}
                    onChange={(e) => setCustomMeta({ ...customMeta, customLng: e.target.value })}
                    className="w-full p-2 bg-slate-900/90 border border-amber-600/60 rounded-lg text-xs text-white font-mono focus:border-amber-400 focus:outline-none"
                    placeholder="63.6246"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-amber-300 mb-1">
                    7. Ландшафтно-экологическая зона:
                  </label>
                  <input
                    type="text"
                    value={customMeta.landscapeZone}
                    onChange={(e) => setCustomMeta({ ...customMeta, landscapeZone: e.target.value })}
                    className="w-full p-2 bg-slate-900/90 border border-amber-600/60 rounded-lg text-xs text-white focus:border-amber-400 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-amber-300 mb-1">
                    8. Ближайший водный объект / экосистема:
                  </label>
                  <input
                    type="text"
                    value={customMeta.waterBody}
                    onChange={(e) => setCustomMeta({ ...customMeta, waterBody: e.target.value })}
                    className="w-full p-2 bg-slate-900/90 border border-amber-600/60 rounded-lg text-xs text-white focus:border-amber-400 focus:outline-none"
                    placeholder="Внесите данные"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold text-amber-300 mb-1">
                    9. Биотопическая характеристика участка:
                  </label>
                  <textarea
                    rows={2}
                    value={customMeta.biotopeDescription}
                    onChange={(e) => setCustomMeta({ ...customMeta, biotopeDescription: e.target.value })}
                    className="w-full p-2 bg-slate-900/90 border border-amber-600/60 rounded-lg text-xs text-white focus:border-amber-400 focus:outline-none"
                    placeholder="Внесите данные (тип растительности, ярусность, почвенный субстрат, рельеф...)"
                  />
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* THE OFFICIAL SCIENTIFIC PASSPORT DOCUMENT CONTAINER (Rendered & Exported) */}
          {/* ========================================================================= */}
          <div 
            ref={passportPrintRef}
            className="w-full max-w-[820px] bg-[#fbf8f2] text-[#2b241d] p-5 sm:p-8 rounded-2xl shadow-xl border border-[#dcd5c9] font-sans transition-all"
            style={{ backgroundColor: "#fbf8f2", color: "#2b241d" }}
          >
            {/* ======================================================================= */}
            {/* DOCUMENT HEADER BAR                                                     */}
            {/* ======================================================================= */}
            <div className="border-b-2 border-[#4f6f52] pb-4 mb-5">
              <div className="flex items-center justify-between gap-4">
                {/* Logo & Network Identity */}
                <div className="flex items-center space-x-3.5">
                  <img 
                    src={logoSrc} 
                    alt="Эко-клуб Земляне" 
                    className="w-13 h-13 sm:w-14 sm:h-14 rounded-xl object-contain border border-[#dcd5c9] p-1 bg-white shadow-sm shrink-0"
                    referrerPolicy="no-referrer"
                  />
                  <div>
                    <div className="text-[10px] sm:text-[11px] uppercase tracking-widest font-bold text-[#4f6f52]">
                      СЕТЬ ЭКОЛОГИЧЕСКОГО МОНИТОРИНГА
                    </div>
                    <div className="text-lg sm:text-2xl font-black font-serif text-[#1b3824] tracking-tight">
                      Zemlyane.DataSpace
                    </div>
                  </div>
                </div>

                {/* Right Badge: Station Code & Status */}
                <div className="text-right flex flex-col items-end">
                  <div className="bg-[#4f6f52] text-white px-3.5 py-1 rounded-lg text-xs font-mono font-bold shadow-sm inline-block tracking-wider">
                    ШИФР: {safeCode}
                  </div>
                  <div className="text-[9px] sm:text-[10px] uppercase font-bold text-[#7a6f62] mt-1 tracking-wider">
                    ПАСПОРТ СТАЦИОНАРА
                  </div>
                </div>
              </div>
            </div>

            {/* ======================================================================= */}
            {/* 1. ОБЩАЯ ИНФОРМАЦИЯ И АДМИНИСТРАТИВНЫЕ ДАННЫЕ                          */}
            {/* ======================================================================= */}
            <div className="mb-5 bg-[#f4eee2] p-4 sm:p-5 rounded-xl border border-[#dfd5c2]">
              <div className="flex items-center justify-between mb-3 border-b border-[#dfd5c2] pb-2">
                <h3 className="font-serif font-bold text-base sm:text-lg text-[#203c27] flex items-center space-x-2">
                  <span className="w-2 h-2 rounded-full bg-[#4f6f52]" />
                  <span>1. Общая информация и административные данные</span>
                </h3>
              </div>

              <div className="space-y-2.5 text-xs sm:text-sm">
                {/* Station Name */}
                <div className="bg-white/85 p-2.5 rounded-lg border border-[#ded5c2]">
                  <span className="text-[11px] text-[#7a6f62] block font-medium">Наименование стационарного пункта:</span>
                  <span className="font-serif font-bold text-sm sm:text-base text-[#1b3824]">{resolvedName}</span>
                </div>

                {/* Purpose */}
                <div className="bg-white/85 p-2.5 rounded-lg border border-[#ded5c2]">
                  <span className="text-[11px] text-[#7a6f62] block font-medium">Назначение стационара:</span>
                  <p className="text-xs text-[#2b241d] leading-relaxed mt-0.5 font-medium">
                    {customMeta.purpose || "Внесите данные"}
                  </p>
                </div>

                {/* Grid: Organization, Director, Launch Date */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                  <div className="bg-white/85 p-2.5 rounded-lg border border-[#ded5c2]">
                    <span className="text-[10px] text-[#7a6f62] block font-medium">Организация / Учреждение:</span>
                    <span className="font-bold text-[#1b3824] text-xs block mt-0.5">
                      {customMeta.organization || "Внесите данные"}
                    </span>
                  </div>

                  <div className="bg-white/85 p-2.5 rounded-lg border border-[#ded5c2]">
                    <span className="text-[10px] text-[#7a6f62] block font-medium">Руководитель:</span>
                    <span className="font-bold text-[#1b3824] text-xs block mt-0.5">
                      {customMeta.director || "______"}
                    </span>
                  </div>

                  <div className="bg-white/85 p-2.5 rounded-lg border border-[#ded5c2]">
                    <span className="text-[10px] text-[#7a6f62] block font-medium">Дата основания / запуска:</span>
                    <span className="font-bold font-mono text-[#1b3824] text-xs block mt-0.5">
                      {customMeta.launchDate || "Внесите данные"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* ======================================================================= */}
            {/* 2. ФИЗИКО-ГЕОГРАФИЧЕСКАЯ ХАРАКТЕРИСТИКА                                */}
            {/* ======================================================================= */}
            <div className="mb-5 bg-[#f4eee2] p-4 sm:p-5 rounded-xl border border-[#dfd5c2]">
              <div className="flex items-center justify-between mb-3 border-b border-[#dfd5c2] pb-2">
                <h3 className="font-serif font-bold text-base sm:text-lg text-[#203c27] flex items-center space-x-2">
                  <span className="w-2 h-2 rounded-full bg-[#4f6f52]" />
                  <span>2. Физико-географическая характеристика</span>
                </h3>
                <span className="text-[11px] text-[#7a6f62] font-mono">
                  WGS-84 спутниковая карта
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
                {/* Physical-Geographic Attributes */}
                <div className="md:col-span-7 space-y-2 text-xs">
                  {/* Coordinates & Altitude */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-white/85 p-2.5 rounded-lg border border-[#ded5c2]">
                      <span className="text-[10px] text-[#7a6f62] block font-medium">Географические координаты (WGS-84):</span>
                      <span className="font-mono font-bold text-[#1b3824] text-xs">
                        {latFormatted}, {lngFormatted}
                      </span>
                    </div>
                    <div className="bg-white/85 p-2.5 rounded-lg border border-[#ded5c2]">
                      <span className="text-[10px] text-[#7a6f62] block font-medium">Высота над уровнем моря:</span>
                      <span className="font-mono font-bold text-[#1b3824] text-xs">
                        {customMeta.altitude ? (customMeta.altitude.includes('м') ? customMeta.altitude : `${customMeta.altitude} м`) : "Внесите данные"}
                      </span>
                    </div>
                  </div>

                  {/* Landscape Zone */}
                  <div className="bg-white/85 p-2.5 rounded-lg border border-[#ded5c2]">
                    <span className="text-[10px] text-[#7a6f62] block font-medium">Ландшафтно-экологическая зона:</span>
                    <p className="text-xs font-semibold text-[#1b3824] mt-0.5">
                      {customMeta.landscapeZone || "Внесите данные"}
                    </p>
                  </div>

                  {/* Nearest Water Object / Ecosystem */}
                  <div className="bg-white/85 p-2.5 rounded-lg border border-[#ded5c2]">
                    <span className="text-[10px] text-[#7a6f62] block font-medium">Ближайший водный объект / экосистема:</span>
                    <p className="text-xs font-semibold text-[#1b3824] mt-0.5">
                      {customMeta.waterBody || "Внесите данные"}
                    </p>
                  </div>

                  {/* Biotope Description (User editable) */}
                  <div className="bg-white/85 p-2.5 rounded-lg border border-[#ded5c2]">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-[10px] text-[#7a6f62] block font-medium">Биотопическая характеристика участка:</span>
                      {!isEditingCustomMeta && (
                        <button
                          onClick={() => setIsEditingCustomMeta(true)}
                          className="text-[10px] text-amber-700 hover:text-amber-900 font-bold flex items-center space-x-1 no-export-pdf cursor-pointer"
                          title="Редактировать характеристику"
                        >
                          <Edit3 className="w-3 h-3" />
                          <span>Изменить</span>
                        </button>
                      )}
                    </div>
                    <p className="text-[11px] text-[#3a3229] leading-relaxed mt-0.5 whitespace-pre-wrap">
                      {customMeta.biotopeDescription || "Внесите данные"}
                    </p>
                  </div>
                </div>

                {/* Right Side: Satellite Map with precise pin */}
                <div className="md:col-span-5 flex flex-col gap-1.5">
                  <div className="w-full h-56 rounded-xl overflow-hidden border border-[#ded5c2] shadow-xs relative">
                    <StationMiniMap 
                      lat={resolvedLat} 
                      lng={resolvedLng} 
                      stationName={resolvedName} 
                      stationCode={safeCode} 
                    />
                  </div>
                  <span className="text-[9px] text-center text-[#7a6f62] italic block">
                    * Точная географическая привязка стационарного пункта наблюдений
                  </span>
                </div>
              </div>
            </div>

            {/* ======================================================================= */}
            {/* 3. РЕЕСТР ЭМПИРИЧЕСКИХ ДАННЫХ И ПОЛЕВЫХ НАБЛЮДЕНИЙ                      */}
            {/* ======================================================================= */}
            <div className="mb-5">
              <div className="flex items-center justify-between mb-2.5">
                <h3 className="font-serif font-bold text-base text-[#203c27] flex items-center space-x-2">
                  <span className="w-2 h-2 rounded-full bg-[#4f6f52]" />
                  <span>3. Реестр эмпирических данных и полевых наблюдений ({stationRecords.length})</span>
                </h3>
                <span className="text-[11px] text-[#7a6f62] font-mono">
                  Зафиксировано замеров: {stationRecords.length}
                </span>
              </div>

              <div className="border border-[#ded5c2] rounded-xl overflow-hidden bg-white shadow-sm">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-[#4f6f52] text-white text-[11px]">
                      <th className="p-2.5 font-bold w-24">Дата</th>
                      <th className="p-2.5 font-bold w-36">Исследователь</th>
                      <th className="p-2.5 font-bold">Зафиксированные показатели</th>
                      <th className="p-2.5 font-bold text-right w-24">Статус</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#eee6d8] text-[#332b23]">
                    {stationRecords.map((rec, idx) => {
                      const paramsList = formatFilledParameters(rec);
                      const isEven = idx % 2 === 0;

                      return (
                        <tr key={rec.id || idx} className={isEven ? "bg-white" : "bg-[#fbf9f4]"}>
                          <td className="p-2.5 font-mono text-[11px] font-semibold text-[#1e3423] align-top whitespace-nowrap">
                            {rec.date}
                          </td>

                          <td className="p-2.5 font-medium text-xs text-[#2c241c] align-top">
                            {rec.researcherName || "Исследователь клуба"}
                          </td>

                          <td className="p-2.5 text-xs align-top">
                            {paramsList.length > 0 ? (
                              <div className="flex flex-wrap gap-1.5">
                                {paramsList.map((p, pIdx) => (
                                  <span 
                                    key={pIdx} 
                                    className="inline-block px-1.5 py-0.5 bg-[#f0ebd9] text-[#243d29] rounded text-[11px] font-medium border border-[#ded5c2]"
                                  >
                                    {p}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-[#8c8072] italic">Базовый полевой замер</span>
                            )}

                            {rec.notes && (
                              <div className="text-[11px] text-[#6b5f50] mt-1.5 italic bg-[#f7f3ea] p-1.5 rounded border border-[#e8dfcf]">
                                💬 {rec.notes}
                              </div>
                            )}
                          </td>

                          <td className="p-2.5 text-right align-top whitespace-nowrap">
                            {rec.isAnomaly ? (
                              <span className="inline-block px-2 py-0.5 bg-amber-100 text-amber-900 border border-amber-300 rounded font-bold text-[10px]">
                                ⚠️ Аномалия
                              </span>
                            ) : (
                              <span className="inline-block px-2 py-0.5 bg-emerald-100 text-emerald-900 border border-emerald-300 rounded font-bold text-[10px]">
                                ✓ Норма
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}

                    {stationRecords.length === 0 && (
                      <tr>
                        <td colSpan={4} className="p-6 text-center text-[#7a6f62] italic bg-[#fbf9f4]">
                          В базе пока нет зарегистрированных замеров по этой экологической станции.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* ======================================================================= */}
            {/* 4. ДИНАМИКА ПОКАЗАТЕЛЕЙ МОНИТОРИНГА                                    */}
            {/* ======================================================================= */}
            <div className="mb-5 bg-[#f5f1e8] p-4 sm:p-5 rounded-xl border border-[#dfd5c2]">
              <div className="flex items-center justify-between mb-3 border-b border-[#dfd5c2] pb-2">
                <div className="flex items-center space-x-2">
                  <span className="w-2 h-2 rounded-full bg-[#4f6f52]" />
                  <h3 className="font-serif font-bold text-base sm:text-lg text-[#203c27]">
                    4. Динамика показателей мониторинга
                  </h3>
                </div>
                <span className="text-[11px] text-[#7a6f62] font-mono">
                  Ряды данных по {stationRecords.length} замерам
                </span>
              </div>

              {/* A. Гидросфера */}
              <div className="mb-4">
                <div className="flex items-center space-x-2 mb-2">
                  <Droplets className="w-4 h-4 text-sky-700 shrink-0" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-sky-950 font-serif">
                    Гидросфера (Водные экосистемы)
                  </h4>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                  {dynamics.hydrosphere.map(metric => (
                    <SparklineCard key={metric.id} metric={metric} />
                  ))}
                </div>
              </div>

              {/* B. Атмосфера */}
              <div className="mb-4">
                <div className="flex items-center space-x-2 mb-2">
                  <Wind className="w-4 h-4 text-violet-700 shrink-0" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-violet-950 font-serif">
                    Атмосфера (Метеорологические параметры)
                  </h4>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {dynamics.atmosphere.map(metric => (
                    <SparklineCard key={metric.id} metric={metric} />
                  ))}
                </div>
              </div>

              {/* C. Антропогенная нагрузка */}
              <div>
                <div className="flex items-center space-x-2 mb-2">
                  <Activity className="w-4 h-4 text-rose-700 shrink-0" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-rose-950 font-serif">
                    Антропогенная нагрузка и экологическое состояние
                  </h4>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {dynamics.anthropogenic.map(metric => (
                    <SparklineCard key={metric.id} metric={metric} />
                  ))}
                </div>
              </div>
            </div>

            {/* ======================================================================= */}
            {/* 5. ВЕРИФИЦИРОВАННЫЕ ВИЗУАЛЬНЫЕ СВИДЕТЕЛЬСТВА И АРТЕФАКТЫ                */}
            {/* ======================================================================= */}
            {artifacts.length > 0 && (
              <div className="mb-5">
                <h3 className="font-serif font-bold text-base text-[#203c27] mb-2.5 flex items-center space-x-2">
                  <span className="w-2 h-2 rounded-full bg-[#4f6f52]" />
                  <span>5. Верифицированные визуальные свидетельства и артефакты</span>
                </h3>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {artifacts.map((art, aIdx) => (
                    <div 
                      key={art.id || aIdx}
                      className="bg-white rounded-xl border border-[#ded5c2] p-2.5 shadow-sm flex flex-col justify-between"
                    >
                      {art.photoUrl ? (
                        <div className="w-full h-28 rounded-lg overflow-hidden bg-[#e8e0d1] mb-2 border border-[#ded5c2]">
                          <img 
                            src={art.photoUrl} 
                            alt={art.title} 
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                      ) : (
                        <div className="w-full h-20 rounded-lg bg-[#f0ebd9] mb-2 border border-[#ded5c2] flex flex-col items-center justify-center text-[#4f6f52]">
                          <Award className="w-6 h-6 mb-1 opacity-70" />
                          <span className="text-[10px] font-bold uppercase tracking-wider">Экспонат коллекции</span>
                        </div>
                      )}

                      <div>
                        <span className="font-bold text-xs text-[#203c27] block line-clamp-1">
                          {art.title}
                        </span>
                        <span className="text-[10px] text-[#6b5f50] block mt-0.5 line-clamp-2 leading-tight">
                          {art.details}
                        </span>
                        <div className="flex items-center justify-between text-[9px] text-[#8c8072] font-mono mt-1.5 pt-1 border-t border-[#f0ebd9]">
                          <span>{art.date}</span>
                          <span className="truncate max-w-[80px]">{art.researcher}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ======================================================================= */}
            {/* DOCUMENT FOOTER (Нижний колонтитул)                                     */}
            {/* ======================================================================= */}
            <div className="pt-4 mt-5 border-t-2 border-[#4f6f52] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-[#5c5043]">
              {/* Scientific Curator Signature */}
              <div className="space-y-1">
                <span className="font-bold text-[#23422a] block text-xs">
                  Руководитель: {customMeta.director || "______"}
                </span>
                <span className="text-[10px] text-[#7a6f62] block">
                  {customMeta.organization || "Внесите данные"}
                </span>
              </div>

              {/* Right Footer Timestamp & Brand: Strictly as requested */}
              <div className="text-left sm:text-right space-y-0.5 self-end">
                <div className="text-[11px] text-[#5c5043] font-medium">
                  Документ сформирован: {currentTimestampStr}
                </div>
                <div className="text-xs font-bold font-serif text-[#1b3824]">
                  Zemlyane.DataSpace
                </div>
              </div>
            </div>

          </div>

        </div>

        {/* Export Notification Toast */}
        {exportNotice && (
          <div className="px-4 py-2 bg-emerald-900/90 border-t border-emerald-500/50 text-emerald-200 text-xs font-bold flex items-center justify-between animate-fade-in shrink-0">
            <span>{exportNotice}</span>
            <button onClick={() => setExportNotice(null)} className="text-emerald-400 hover:text-white text-xs cursor-pointer">✕</button>
          </div>
        )}

        {/* Bottom Modal Actions */}
        <div className={`p-4 border-t flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0 rounded-b-3xl ${
          isDark ? "bg-[#0d2119] border-emerald-800/80" : "bg-[#e8decb] border-[#d5c7ad]"
        }`}>
          <div className="flex items-center space-x-2 text-xs text-slate-400">
            <Shield className="w-4 h-4 text-emerald-400" />
            <span>Паспорт станции #{safeCode} • Охват картографии: 50 км • Редактирование сохраняется в базе</span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleExportHtml}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-bold text-xs transition flex items-center space-x-1 cursor-pointer border border-slate-700"
            >
              <FileCode className="w-3.5 h-3.5 text-amber-400" />
              <span>HTML-паспорт</span>
            </button>
            <button
              onClick={handlePrint}
              className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-bold text-xs transition flex items-center space-x-1 cursor-pointer border border-slate-700"
            >
              <Printer className="w-3.5 h-3.5 text-sky-400" />
              <span>Печать / Векторный PDF</span>
            </button>
            <button
              onClick={handleExportPdf}
              disabled={isExportingPdf}
              className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs shadow-md transition flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Скачать PDF</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
