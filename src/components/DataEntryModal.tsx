import React, { useState, useEffect } from "react";
import { 
  ResearchCategory, 
  MonitoringStation, 
  MonitoringRecord, 
  SpeciesCount,
  CustomMetric
} from "../types";
import { CATEGORIES } from "../data/mockData";
import { 
  calculateShannonIndex, 
  convertPpmToPercent, 
  checkRecordAnomalies 
} from "../utils/ecoCalculators";
import { 
  X, 
  Plus, 
  MapPin, 
  Sliders, 
  Camera,
  Calculator,
  HelpCircle,
  Ban,
  QrCode,
  WifiOff,
  Clock,
  Upload,
  Trash2,
  Sparkles,
  Pipette,
  CheckCircle2,
  Image as ImageIcon,
  FileText,
  RefreshCw,
  Loader2,
  Edit3
} from "lucide-react";
import { analyzeSoilImage, SoilColorResult } from "../utils/soilColorAnalyzer";

interface DataEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  stations: MonitoringStation[];
  onAddRecord: (newRecord: MonitoringRecord) => void;
  onUpdateRecord?: (updatedRecord: MonitoringRecord) => void;
  editingRecord?: MonitoringRecord | null;
  preselectedStation?: MonitoringStation | null;
  initialCategory?: ResearchCategory | null;
  clickedCoords?: { lat: number; lng: number } | null;
  recordsCount: number;
  userStatus?: string;
  onOpenPassportModal?: (station?: MonitoringStation) => void;
}

// Litter Level tooltips map (1-5 scale)
const LITTER_DESCRIPTIONS: Record<number, string> = {
  1: "1 — Чисто (мусор полностью отсутствует)",
  2: "2 — Нормально (единичные мелкие бытовые фрагменты)",
  3: "3 — Средне (заметный мусор вдоль троп и кострищ)",
  4: "4 — Много (значительное скопление пластика и отходов)",
  5: "5 — Критично (стихийная свалка, замусорен водоем)"
};

export const DataEntryModal: React.FC<DataEntryModalProps> = ({
  isOpen,
  onClose,
  stations,
  onAddRecord,
  onUpdateRecord,
  editingRecord,
  preselectedStation,
  initialCategory,
  clickedCoords,
  recordsCount,
  userStatus,
  onOpenPassportModal
}) => {
  if (!isOpen) return null;

  const isEditing = Boolean(editingRecord);

  const [category, setCategory] = useState<ResearchCategory>(
    editingRecord?.category || initialCategory || "hydrosphere"
  );
  const [stationMode, setStationMode] = useState<"preset" | "custom">("preset");
  const [selectedStationId, setSelectedStationId] = useState<string>(
    preselectedStation?.id || stations[0]?.id || ""
  );

  // Common Fields
  const [date, setDate] = useState<string>(
    editingRecord?.date || new Date().toISOString().split("T")[0]
  );
  const [researcherName, setResearcherName] = useState(
    editingRecord?.researcherName || ""
  );
  const [notes, setNotes] = useState(
    editingRecord?.notes || ""
  );
  const [customLat, setCustomLat] = useState<number>(
    editingRecord?.lat || clickedCoords?.lat || 53.2144
  );
  const [customLng, setCustomLng] = useState<number>(
    editingRecord?.lng || clickedCoords?.lng || 63.6246
  );
  const [customStationName, setCustomStationName] = useState(
    editingRecord?.stationName || "г. Костанай — новая точка"
  );
  const [customStationCode, setCustomStationCode] = useState(
    editingRecord?.stationCode || `KST-${String(recordsCount + 1).padStart(2, "0")}`
  );
  const [modalError, setModalError] = useState<string | null>(null);

  // Map of enabled/measured flags for every parameter (if false -> "нет замера")
  const [activeParams, setActiveParams] = useState<Record<string, boolean>>({
    // Hydrosphere
    waterTemp: true,
    transparency: true,
    ph: true,
    tds: true,
    ec: true,
    nitrates: true,
    dissolvedOxygen: true,

    // Atmosphere
    airTemp: true,
    humidity: true,
    pressure: true,
    cloudiness: true,
    windSpeed: true,
    windDirection: true,
    precipitation: true,
    co2Ppm: true,

    // Lithosphere
    soilPh: true,
    soilTexture: true,
    soilColor: true,
    heavyMetals: true,
    soilDensity: true,
    permeability: true,

    // Biosphere
    floraSpecies: true,
    faunaSpecies: true,
    shannonIndex: true,
    bioPhoto: true,

    // Anthropogenic
    litterLevel: true,
    noiseLevel: true,
    tramplingLevel: true,
    firePitsCount: true,
    trafficIntensity: true,

    // Geology
    mineralName: true,
    geneticType: true,
    mohsHardness: true,
    streakColor: true,
    minPhoto: true,

    // Fossils
    organismGroup: true,
    lengthMm: true,
    widthMm: true,
    fosPhoto: true
  });

  const toggleParam = (key: string) => {
    setActiveParams(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Category-specific Values (Initially blank strings/empty, to not constrain user or force 0)
  // Hydrosphere
  const [waterTemp, setWaterTemp] = useState<string>("");
  const [transparency, setTransparency] = useState<string>("");
  const [ph, setPh] = useState<string>("");
  const [tds, setTds] = useState<string>("");
  const [ec, setEc] = useState<string>("");
  const [nitrates, setNitrates] = useState<string>("");
  const [dissolvedOxygen, setDissolvedOxygen] = useState<string>("");

  // Atmosphere
  const [airTemp, setAirTemp] = useState<string>("");
  const [humidity, setHumidity] = useState<string>("");
  const [pressure, setPressure] = useState<string>("");
  const [cloudiness, setCloudiness] = useState<string>("");
  const [windSpeed, setWindSpeed] = useState<string>("");
  const [windDirection, setWindDirection] = useState("СЗ");
  const [precipitation, setPrecipitation] = useState<string>("");
  const [co2Ppm, setCo2Ppm] = useState<string>("");

  // Lithosphere (Pedosphere)
  const [soilPh, setSoilPh] = useState<string>("");
  const [soilTexture, setSoilTexture] = useState("Суглинок средний");
  const [soilColor, setSoilColor] = useState("Темно-серый черноземный");
  const [soilColorRgb, setSoilColorRgb] = useState<{ r: number; g: number; b: number; hex: string } | null>({
    r: 58,
    g: 51,
    b: 45,
    hex: "#3A332D"
  });
  const [soilColorMode, setSoilColorMode] = useState<"manual" | "analyzer">("manual");
  const [soilPhotoUrl, setSoilPhotoUrl] = useState("");
  const [isAnalyzingSoil, setIsAnalyzingSoil] = useState(false);
  const [soilAnalysisResult, setSoilAnalysisResult] = useState<SoilColorResult | null>(null);
  const [heavyMetals, setHeavyMetals] = useState("Низкий");
  const [soilDensity, setSoilDensity] = useState<string>("");
  const [permeability, setPermeability] = useState<string>("");

  // Biosphere
  const [floraSpecies, setFloraSpecies] = useState("");
  const [faunaSpecies, setFaunaSpecies] = useState("");
  const [speciesCounts, setSpeciesCounts] = useState<SpeciesCount[]>([]);
  const [bioPhotoUrl, setBioPhotoUrl] = useState("");

  // Anthropogenic
  const [litterLevel, setLitterLevel] = useState<string>("");
  const [tramplingLevel, setTramplingLevel] = useState<string>("");
  const [firePitsCount, setFirePitsCount] = useState<string>("");
  const [illegalDumps, setIllegalDumps] = useState<boolean>(false);
  const [noiseLevel, setNoiseLevel] = useState<string>("");
  const [trafficIntensity, setTrafficIntensity] = useState<string>("");
  const [antPhotoUrl, setAntPhotoUrl] = useState("");

  // Geology
  const [mineralName, setMineralName] = useState("");
  const [geneticType, setGeneticType] = useState<"Осадочный" | "Магматический" | "Метаморфический">("Осадочный");
  const [streakColor, setStreakColor] = useState("");
  const [mohsHardness, setMohsHardness] = useState<string>("");
  const [minPhotoUrl, setMinPhotoUrl] = useState("");

  // Fossils
  const [organismGroup, setOrganismGroup] = useState("");
  const [certaintyLevel, setCertaintyLevel] = useState<"До вида" | "До рода" | "До семейства" | "До отряда">("До рода");
  const [lengthMm, setLengthMm] = useState<string>("");
  const [widthMm, setWidthMm] = useState<string>("");
  const [fosPhotoUrl, setFosPhotoUrl] = useState("");

  // Custom User-Defined Metrics list
  const [customMetrics, setCustomMetrics] = useState<CustomMetric[]>([]);
  const [newMetricName, setNewMetricName] = useState("");
  const [newMetricValue, setNewMetricValue] = useState("");
  const [newMetricUnit, setNewMetricUnit] = useState("");

  const handleAddCustomMetric = () => {
    if (!newMetricName.trim()) return;
    const newMetric: CustomMetric = {
      id: `cm-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: newMetricName.trim(),
      value: newMetricValue.trim(),
      unit: newMetricUnit.trim()
    };
    setCustomMetrics(prev => [...prev, newMetric]);
    setNewMetricName("");
    setNewMetricValue("");
    setNewMetricUnit("");
  };

  const handleRemoveCustomMetric = (id: string) => {
    setCustomMetrics(prev => prev.filter(m => m.id !== id));
  };

  const handleUpdateCustomMetric = (id: string, field: keyof CustomMetric, val: string) => {
    setCustomMetrics(prev => prev.map(m => m.id === id ? { ...m, [field]: val } : m));
  };

  // Populate state on modal open / edit record change
  useEffect(() => {
    if (!isOpen) return;

    if (editingRecord) {
      setCategory(editingRecord.category);
      setDate(editingRecord.date || new Date().toISOString().split("T")[0]);
      setResearcherName(editingRecord.researcherName || "");
      setNotes(editingRecord.notes || "");

      // Match station
      const matched = stations.find(s => s.code === editingRecord.stationCode);
      if (matched) {
        setStationMode("preset");
        setSelectedStationId(matched.id);
      } else {
        setStationMode("custom");
        setCustomStationCode(editingRecord.stationCode);
        setCustomStationName(editingRecord.stationName);
        setCustomLat(editingRecord.lat);
        setCustomLng(editingRecord.lng);
      }

      // Hydrosphere
      if (editingRecord.hydrosphere) {
        const h = editingRecord.hydrosphere;
        if (h.waterTemp !== undefined) setWaterTemp(String(h.waterTemp));
        if (h.transparency !== undefined) setTransparency(String(h.transparency));
        if (h.ph !== undefined) setPh(String(h.ph));
        if (h.tds !== undefined) setTds(String(h.tds));
        if (h.ec !== undefined) setEc(String(h.ec));
        if (h.nitrates !== undefined) setNitrates(String(h.nitrates));
        if (h.dissolvedOxygen !== undefined) setDissolvedOxygen(String(h.dissolvedOxygen));

        setActiveParams(prev => ({
          ...prev,
          waterTemp: h.waterTemp !== undefined,
          transparency: h.transparency !== undefined,
          ph: h.ph !== undefined,
          tds: h.tds !== undefined,
          ec: h.ec !== undefined,
          nitrates: h.nitrates !== undefined,
          dissolvedOxygen: h.dissolvedOxygen !== undefined,
        }));
      }

      // Atmosphere
      if (editingRecord.atmosphere) {
        const a = editingRecord.atmosphere;
        if (a.airTemp !== undefined) setAirTemp(String(a.airTemp));
        if (a.humidity !== undefined) setHumidity(String(a.humidity));
        if (a.pressure !== undefined) setPressure(String(a.pressure));
        if (a.cloudiness !== undefined) setCloudiness(String(a.cloudiness));
        if (a.windSpeed !== undefined) setWindSpeed(String(a.windSpeed));
        if (a.windDirection !== undefined) setWindDirection(a.windDirection);
        if (a.precipitation !== undefined) setPrecipitation(String(a.precipitation));
        if (a.co2Ppm !== undefined) setCo2Ppm(String(a.co2Ppm));

        setActiveParams(prev => ({
          ...prev,
          airTemp: a.airTemp !== undefined,
          humidity: a.humidity !== undefined,
          pressure: a.pressure !== undefined,
          cloudiness: a.cloudiness !== undefined,
          windSpeed: a.windSpeed !== undefined,
          windDirection: a.windDirection !== undefined,
          precipitation: a.precipitation !== undefined,
          co2Ppm: a.co2Ppm !== undefined,
        }));
      }

      // Lithosphere
      if (editingRecord.lithosphere) {
        const l = editingRecord.lithosphere;
        if (l.soilPh !== undefined) setSoilPh(String(l.soilPh));
        if (l.texture !== undefined) setSoilTexture(l.texture);
        if (l.soilColor !== undefined) setSoilColor(l.soilColor);
        if (l.soilColorRgb !== undefined) setSoilColorRgb(l.soilColorRgb);
        if (l.heavyMetals !== undefined) setHeavyMetals(l.heavyMetals);
        if (l.density !== undefined) setSoilDensity(String(l.density));
        if (l.permeability !== undefined) setPermeability(String(l.permeability));
        if (l.photoUrl !== undefined) setSoilPhotoUrl(l.photoUrl);

        setActiveParams(prev => ({
          ...prev,
          soilPh: l.soilPh !== undefined,
          soilTexture: l.texture !== undefined,
          soilColor: l.soilColor !== undefined,
          heavyMetals: l.heavyMetals !== undefined,
          soilDensity: l.density !== undefined,
          permeability: l.permeability !== undefined,
        }));
      }

      // Biosphere
      if (editingRecord.biosphere) {
        const b = editingRecord.biosphere;
        if (b.floraSpecies !== undefined) setFloraSpecies(b.floraSpecies);
        if (b.faunaSpecies !== undefined) setFaunaSpecies(b.faunaSpecies);
        if (b.speciesCounts !== undefined) setSpeciesCounts(b.speciesCounts);
        if (b.photoUrl !== undefined) setBioPhotoUrl(b.photoUrl);

        setActiveParams(prev => ({
          ...prev,
          floraSpecies: b.floraSpecies !== undefined,
          faunaSpecies: b.faunaSpecies !== undefined,
          shannonIndex: b.shannonIndex !== undefined,
        }));
      }

      // Anthropogenic
      if (editingRecord.anthropogenic) {
        const an = editingRecord.anthropogenic;
        if (an.litterLevel !== undefined) setLitterLevel(String(an.litterLevel));
        if (an.tramplingLevel !== undefined) setTramplingLevel(String(an.tramplingLevel));
        if (an.firePitsCount !== undefined) setFirePitsCount(String(an.firePitsCount));
        if (an.illegalDumps !== undefined) setIllegalDumps(an.illegalDumps);
        if (an.noiseLevel !== undefined) setNoiseLevel(String(an.noiseLevel));
        if (an.trafficIntensity !== undefined) setTrafficIntensity(String(an.trafficIntensity));
        if (an.photoUrl !== undefined) setAntPhotoUrl(an.photoUrl);

        setActiveParams(prev => ({
          ...prev,
          litterLevel: an.litterLevel !== undefined,
          tramplingLevel: an.tramplingLevel !== undefined,
          firePitsCount: an.firePitsCount !== undefined,
          noiseLevel: an.noiseLevel !== undefined,
          trafficIntensity: an.trafficIntensity !== undefined,
        }));
      }

      // Geology
      if (editingRecord.geology) {
        const g = editingRecord.geology;
        if (g.mineralName !== undefined) setMineralName(g.mineralName);
        if (g.geneticType !== undefined) setGeneticType(g.geneticType);
        if (g.streakColor !== undefined) setStreakColor(g.streakColor);
        if (g.mohsHardness !== undefined) setMohsHardness(String(g.mohsHardness));
        if (g.photoUrl !== undefined) setMinPhotoUrl(g.photoUrl);

        setActiveParams(prev => ({
          ...prev,
          mineralName: g.mineralName !== undefined,
          geneticType: g.geneticType !== undefined,
          streakColor: g.streakColor !== undefined,
          mohsHardness: g.mohsHardness !== undefined,
        }));
      }

      // Fossils
      if (editingRecord.fossils) {
        const f = editingRecord.fossils;
        if (f.organismGroup !== undefined) setOrganismGroup(f.organismGroup);
        if (f.certaintyLevel !== undefined) setCertaintyLevel(f.certaintyLevel);
        if (f.lengthMm !== undefined) setLengthMm(String(f.lengthMm));
        if (f.widthMm !== undefined) setWidthMm(String(f.widthMm));
        if (f.photoUrl !== undefined) setFosPhotoUrl(f.photoUrl);

        setActiveParams(prev => ({
          ...prev,
          organismGroup: f.organismGroup !== undefined,
          lengthMm: f.lengthMm !== undefined,
          widthMm: f.widthMm !== undefined,
        }));
      }

      // Custom attributes / metrics
      if (editingRecord.customAttributes) {
        if (Array.isArray(editingRecord.customAttributes)) {
          setCustomMetrics(editingRecord.customAttributes);
        } else if (typeof editingRecord.customAttributes === "object") {
          setCustomMetrics(Object.values(editingRecord.customAttributes));
        }
      } else {
        setCustomMetrics([]);
      }
    } else {
      if (initialCategory) {
        setCategory(initialCategory);
      }
      if (preselectedStation) {
        setStationMode("preset");
        setSelectedStationId(preselectedStation.id);
      } else if (clickedCoords) {
        setStationMode("custom");
        setCustomLat(clickedCoords.lat);
        setCustomLng(clickedCoords.lng);
        setCustomStationName("Пользовательская точка на карте");
        setCustomStationCode(`KST-${String(recordsCount + 1).padStart(2, "0")}`);
      }
    }
  }, [isOpen, editingRecord, initialCategory, preselectedStation, clickedCoords, recordsCount, stations]);

  // Soil Color Analysis via Canvas API
  const handleSoilPhotoUploadAndAnalyze = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsAnalyzingSoil(true);
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const dataUrl = reader.result as string;
        setSoilPhotoUrl(dataUrl);

        try {
          const result = await analyzeSoilImage(dataUrl);
          setSoilAnalysisResult(result);
          setSoilColor(result.colorName);
          setSoilColorRgb({
            r: result.rgb.r,
            g: result.rgb.g,
            b: result.rgb.b,
            hex: result.hex
          });
        } catch (colorErr) {
          console.warn("Soil color analysis notice:", colorErr);
        } finally {
          setIsAnalyzingSoil(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error("Soil photo read error:", err);
      setIsAnalyzingSoil(false);
    }
  };

  // General Photo Upload Helper
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>, setter: (url: string) => void) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setter(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const presetStation = stations.find(s => s.id === selectedStationId) || stations[0];
  const stationCode = stationMode === "preset" && presetStation
    ? presetStation.code
    : (customStationCode.trim() || `KST-${String(recordsCount + 1).padStart(2, "0")}`);

  const stationName = stationMode === "preset" && presetStation
    ? presetStation.name
    : (customStationName.trim() || "Пользовательская точка на карте");

  const activeLat = stationMode === "preset" && presetStation ? presetStation.lat : customLat;
  const activeLng = stationMode === "preset" && presetStation ? presetStation.lng : customLng;

  const computedShannon = calculateShannonIndex(speciesCounts);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (userStatus === "pending") {
      setModalError("Ваша учетная запись ожидает подтверждения администратором. Внесение данных станет доступно сразу после активации.");
      return;
    }

    setModalError(null);

    const targetId = editingRecord ? editingRecord.id : `rec-${Date.now()}`;

    const newRec: MonitoringRecord = {
      id: targetId,
      stationCode,
      stationName,
      category,
      date,
      lat: Number(activeLat),
      lng: Number(activeLng),
      researcherName: researcherName.trim() || "Юный исследователь",
      notes: notes.trim(),
      ...(editingRecord ? {
        syncStatus: editingRecord.syncStatus,
        isOfflinePending: editingRecord.isOfflinePending
      } : {})
    };

    const parseNum = (val: string): number | undefined => {
      if (val === "" || val === null || val === undefined || isNaN(Number(val))) return undefined;
      return Number(val);
    };

    if (category === "hydrosphere") {
      newRec.hydrosphere = {
        waterTemp: activeParams.waterTemp ? parseNum(waterTemp) : undefined,
        transparency: activeParams.transparency ? parseNum(transparency) : undefined,
        ph: activeParams.ph ? parseNum(ph) : undefined,
        tds: activeParams.tds ? parseNum(tds) : undefined,
        ec: activeParams.ec ? parseNum(ec) : undefined,
        nitrates: activeParams.nitrates ? parseNum(nitrates) : undefined,
        dissolvedOxygen: activeParams.dissolvedOxygen ? parseNum(dissolvedOxygen) : undefined,
      };
    } else if (category === "atmosphere") {
      const co2Val = parseNum(co2Ppm);
      newRec.atmosphere = {
        airTemp: activeParams.airTemp ? parseNum(airTemp) : undefined,
        humidity: activeParams.humidity ? parseNum(humidity) : undefined,
        pressure: activeParams.pressure ? parseNum(pressure) : undefined,
        cloudiness: activeParams.cloudiness ? parseNum(cloudiness) : undefined,
        windSpeed: activeParams.windSpeed ? parseNum(windSpeed) : undefined,
        windDirection: activeParams.windDirection ? windDirection : undefined,
        precipitation: activeParams.precipitation ? parseNum(precipitation) : undefined,
        co2Ppm: activeParams.co2Ppm ? co2Val : undefined,
        co2Percent: activeParams.co2Ppm && co2Val !== undefined ? convertPpmToPercent(co2Val) : undefined
      };
    } else if (category === "lithosphere") {
      newRec.lithosphere = {
        soilPh: activeParams.soilPh ? parseNum(soilPh) : undefined,
        texture: activeParams.soilTexture ? soilTexture : undefined,
        soilColor: activeParams.soilColor ? soilColor : undefined,
        soilColorRgb: soilColorRgb || undefined,
        heavyMetals: activeParams.heavyMetals ? heavyMetals : undefined,
        density: activeParams.soilDensity ? parseNum(soilDensity) : undefined,
        permeability: activeParams.permeability ? parseNum(permeability) : undefined,
        photoUrl: soilPhotoUrl || undefined
      };
    } else if (category === "biosphere") {
      newRec.biosphere = {
        floraSpecies: activeParams.floraSpecies ? floraSpecies : undefined,
        faunaSpecies: activeParams.faunaSpecies ? faunaSpecies : undefined,
        speciesCounts,
        shannonIndex: activeParams.shannonIndex ? computedShannon : undefined,
        photoUrl: bioPhotoUrl || undefined
      };
    } else if (category === "anthropogenic") {
      newRec.anthropogenic = {
        litterLevel: activeParams.litterLevel ? parseNum(litterLevel) : undefined,
        tramplingLevel: activeParams.tramplingLevel ? parseNum(tramplingLevel) : undefined,
        firePitsCount: activeParams.firePitsCount ? parseNum(firePitsCount) : undefined,
        illegalDumps,
        noiseLevel: activeParams.noiseLevel ? parseNum(noiseLevel) : undefined,
        trafficIntensity: activeParams.trafficIntensity ? parseNum(trafficIntensity) : undefined,
        photoUrl: antPhotoUrl || undefined
      };
    } else if (category === "geology") {
      newRec.geology = {
        mineralName: activeParams.mineralName ? mineralName : undefined,
        geneticType: activeParams.geneticType ? geneticType : undefined,
        streakColor: activeParams.streakColor ? streakColor : undefined,
        mohsHardness: activeParams.mohsHardness ? parseNum(mohsHardness) : undefined,
        photoUrl: minPhotoUrl || undefined
      };
    } else if (category === "fossils") {
      newRec.fossils = {
        organismGroup: activeParams.organismGroup ? organismGroup : undefined,
        certaintyLevel,
        lengthMm: activeParams.lengthMm ? parseNum(lengthMm) : undefined,
        widthMm: activeParams.widthMm ? parseNum(widthMm) : undefined,
        photoUrl: fosPhotoUrl || undefined
      };
    }

    if (customMetrics.length > 0) {
      newRec.customAttributes = customMetrics;
    }

    const { isAnomaly, alerts } = checkRecordAnomalies(newRec);
    newRec.isAnomaly = isAnomaly;
    if (isAnomaly) {
      newRec.aiAlert = alerts.join(" ");
    }

    if (editingRecord && onUpdateRecord) {
      onUpdateRecord(newRec);
    } else {
      onAddRecord(newRec);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md overflow-y-auto animate-fade-in">
      <div className="bg-[#0f1d18] border border-emerald-800/70 rounded-3xl max-w-3xl w-full max-h-[92vh] overflow-y-auto p-5 sm:p-7 shadow-2xl relative my-auto text-slate-100">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 text-slate-400 hover:text-white bg-slate-800/80 rounded-2xl transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Title */}
        <div className="flex items-center space-x-2 mb-1">
          {isEditing ? (
            <Edit3 className="w-6 h-6 text-amber-400" />
          ) : (
            <Plus className="w-6 h-6 text-emerald-400" />
          )}
          <h2 className="text-lg sm:text-2xl font-bold text-white font-serif">
            {isEditing ? "Редактирование полевого замера" : "Внесение замера в полевой журнал"}
          </h2>
        </div>
        <p className="text-xs text-emerald-300/80 mb-4">
          {isEditing 
            ? `Эко-клуб «Земляне» • Изменение станции, категории, даты и ключевых показателей [${stationCode}]`
            : "Эко-клуб «Земляне» • Форма академического эко-мониторинга"}
        </p>

        {typeof navigator !== "undefined" && !navigator.onLine && (
          <div className="mb-4 p-3 bg-orange-950/70 border border-orange-500/80 rounded-2xl flex items-center space-x-3 text-orange-200 text-xs">
            <WifiOff className="w-4 h-4 text-orange-400 shrink-0 animate-pulse" />
            <div>
              <span className="font-bold text-orange-300">Офлайн-режим активен:</span> данные будут сохранены локально в памяти вашего устройства и автоматически отправлены в базу данных Supabase при подключении к сети.
            </div>
          </div>
        )}

        {/* 1. Category Selection */}
        <div className="mb-5">
          <label className="block text-xs font-bold text-emerald-300 mb-2 uppercase tracking-wider">
            1. Категория исследований:
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-1.5">
            {CATEGORIES.map(cat => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setCategory(cat.id)}
                className={`p-2 rounded-xl text-xs font-medium transition text-center flex flex-col items-center justify-center space-y-1 border ${
                  category === cat.id
                    ? "bg-emerald-600 text-white font-bold border-emerald-400 shadow-md"
                    : "bg-[#13261f] text-slate-300 hover:bg-slate-800 border-emerald-900/60"
                }`}
              >
                <span className="text-[10px] uppercase font-mono">{cat.prefix}</span>
                <span className="text-[11px] truncate w-full">{cat.name.split(" ")[0]}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {modalError && (
            <div className="p-3 bg-rose-950/90 border border-rose-500 rounded-xl text-xs text-rose-200 flex items-center justify-between">
              <span>{modalError}</span>
              <button
                type="button"
                onClick={() => setModalError(null)}
                className="text-rose-400 hover:text-white ml-2 text-sm font-bold"
              >
                ✕
              </button>
            </div>
          )}
          
          {/* 2. Station & Location Selector with Geographic Codes */}
          <div className="bg-[#13261f]/90 border border-emerald-800/60 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-emerald-800/60 pb-2">
              <label className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center">
                <MapPin className="w-4 h-4 mr-1" />
                2. Пункт или объект на карте (например, ALX-01, TBL-01):
              </label>
              
              <div className="flex items-center space-x-2 text-xs">
                <button
                  type="button"
                  onClick={() => setStationMode("preset")}
                  className={`px-2.5 py-1 rounded-lg font-medium transition ${
                    stationMode === "preset"
                      ? "bg-emerald-600 text-white font-bold"
                      : "bg-slate-800 text-slate-300"
                  }`}
                >
                  Постоянный пост
                </button>
                <button
                  type="button"
                  onClick={() => setStationMode("custom")}
                  className={`px-2.5 py-1 rounded-lg font-medium transition ${
                    stationMode === "custom"
                      ? "bg-emerald-600 text-white font-bold"
                      : "bg-slate-800 text-slate-300"
                  }`}
                >
                  + Новый шифр
                </button>
              </div>
            </div>

            {stationMode === "preset" ? (
              <div>
                <select
                  value={selectedStationId}
                  onChange={(e) => setSelectedStationId(e.target.value)}
                  className="w-full bg-[#0b1512] border border-emerald-800 text-slate-100 text-xs rounded-xl p-2.5 focus:ring-2 focus:ring-emerald-500"
                >
                  {stations.map(st => (
                    <option key={st.id} value={st.id}>
                      [{st.code}] — {st.name} ({st.lat.toFixed(4)}°, {st.lng.toFixed(4)}°)
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <label className="block text-slate-300 mb-1 font-semibold">Шифр точки (напр. ALX-01, TBL-01):</label>
                  <input
                    type="text"
                    value={customStationCode}
                    onChange={(e) => setCustomStationCode(e.target.value)}
                    placeholder="ALX-01"
                    className="w-full bg-[#0b1512] border border-emerald-800 text-amber-300 font-mono font-bold p-2 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1 font-semibold">Название гео-объекта:</label>
                  <input
                    type="text"
                    value={customStationName}
                    onChange={(e) => setCustomStationName(e.target.value)}
                    placeholder="с. Александровка"
                    className="w-full bg-[#0b1512] border border-emerald-800 text-slate-100 p-2 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1">Широта (Lat °N):</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={customLat}
                    onChange={(e) => setCustomLat(Number(e.target.value))}
                    className="w-full bg-[#0b1512] border border-emerald-800 text-slate-100 p-2 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1">Долгота (Lng °E):</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={customLng}
                    onChange={(e) => setCustomLng(Number(e.target.value))}
                    className="w-full bg-[#0b1512] border border-emerald-800 text-slate-100 p-2 rounded-xl"
                  />
                </div>
              </div>
            )}
          </div>

          {/* 3. Date & Researcher */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Дата проведения замера:</label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-[#13261f] border border-emerald-800 text-slate-100 p-2.5 rounded-xl focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Исследователь / Класс:</label>
              <input
                type="text"
                placeholder="ФИО ученика или класс"
                required
                value={researcherName}
                onChange={(e) => setResearcherName(e.target.value)}
                className="w-full bg-[#13261f] border border-emerald-800 text-slate-100 p-2.5 rounded-xl focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Helper Banner for "Нет замера" */}
          <div className="p-2.5 bg-emerald-950/60 border border-emerald-700/60 rounded-xl text-xs text-emerald-200 flex items-center justify-between">
            <span className="flex items-center space-x-1.5">
              <Ban className="w-4 h-4 text-amber-400 shrink-0" />
              <span>
                Флажок <strong>«Нет замера»</strong> позволяет пропустить любой параметр, установив для него официальный статус «нет замера».
              </span>
            </span>
          </div>

          {/* 4. PARAMETERS WITH "НЕТ ЗАМЕРА" TOGGLES */}

          {/* HYDROSPHERE FORM */}
          {category === "hydrosphere" && (
            <div className="bg-[#13261f]/90 border border-blue-800/60 rounded-2xl p-4 space-y-4">
              <h4 className="text-xs font-bold text-blue-400 uppercase tracking-wider flex items-center">
                <Sliders className="w-4 h-4 mr-1" />
                Параметры гидросферы (числовой ввод без ограничений):
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* Water Temp */}
                <div className="p-3 bg-[#0b1512] rounded-xl border border-emerald-900/60">
                  <div className="flex justify-between items-center text-xs mb-1">
                    <span className="font-semibold text-slate-200">Температура воды (°C):</span>
                    {activeParams.waterTemp && waterTemp !== "" && (
                      <span className="text-emerald-300 font-bold text-[11px]">{waterTemp} °C</span>
                    )}
                  </div>
                  {activeParams.waterTemp ? (
                    <input
                      type="number"
                      step="any"
                      placeholder="Введите температуру..."
                      value={waterTemp}
                      onChange={(e) => setWaterTemp(e.target.value)}
                      className="w-full bg-[#13261f] border border-emerald-800 text-slate-100 p-2 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500"
                    />
                  ) : (
                    <div className="text-xs text-slate-400 italic py-1">Статус: нет замера</div>
                  )}
                  <label className="flex items-center space-x-1.5 text-[11px] text-slate-400 mt-2">
                    <input
                      type="checkbox"
                      checked={!activeParams.waterTemp}
                      onChange={() => toggleParam("waterTemp")}
                      className="rounded text-emerald-600"
                    />
                    <span>Поставить статус «нет замера»</span>
                  </label>
                </div>

                {/* Transparency */}
                <div className="p-3 bg-[#0b1512] rounded-xl border border-emerald-900/60">
                  <div className="flex justify-between items-center text-xs mb-1">
                    <span className="font-semibold text-slate-200">Прозрачность по диску Секки (см):</span>
                    {activeParams.transparency && transparency !== "" && (
                      <span className="text-emerald-300 font-bold text-[11px]">{transparency} см</span>
                    )}
                  </div>
                  {activeParams.transparency ? (
                    <input
                      type="number"
                      step="any"
                      placeholder="Введите глубину видимости..."
                      value={transparency}
                      onChange={(e) => setTransparency(e.target.value)}
                      className="w-full bg-[#13261f] border border-emerald-800 text-slate-100 p-2 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500"
                    />
                  ) : (
                    <div className="text-xs text-slate-400 italic py-1">Статус: нет замера</div>
                  )}
                  <label className="flex items-center space-x-1.5 text-[11px] text-slate-400 mt-2">
                    <input
                      type="checkbox"
                      checked={!activeParams.transparency}
                      onChange={() => toggleParam("transparency")}
                      className="rounded text-emerald-600"
                    />
                    <span>Поставить статус «нет замера»</span>
                  </label>
                </div>

                {/* pH */}
                <div className="p-3 bg-[#0b1512] rounded-xl border border-emerald-900/60">
                  <div className="flex justify-between items-center text-xs mb-1">
                    <span className="font-semibold text-slate-200">Водородный показатель (pH):</span>
                    {activeParams.ph && ph !== "" && (
                      <span className="text-emerald-300 font-bold text-[11px]">{ph} pH</span>
                    )}
                  </div>
                  {activeParams.ph ? (
                    <input
                      type="number"
                      step="any"
                      placeholder="Введите значение pH..."
                      value={ph}
                      onChange={(e) => setPh(e.target.value)}
                      className="w-full bg-[#13261f] border border-emerald-800 text-slate-100 p-2 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500"
                    />
                  ) : (
                    <div className="text-xs text-slate-400 italic py-1">Статус: нет замера</div>
                  )}
                  <label className="flex items-center space-x-1.5 text-[11px] text-slate-400 mt-2">
                    <input
                      type="checkbox"
                      checked={!activeParams.ph}
                      onChange={() => toggleParam("ph")}
                      className="rounded text-emerald-600"
                    />
                    <span>Поставить статус «нет замера»</span>
                  </label>
                </div>

                {/* TDS */}
                <div className="p-3 bg-[#0b1512] rounded-xl border border-emerald-900/60">
                  <div className="flex justify-between items-center text-xs mb-1">
                    <span className="font-semibold text-slate-200">Минерализация TDS (мг/л / ppm):</span>
                    {activeParams.tds && tds !== "" && (
                      <span className="text-emerald-300 font-bold text-[11px]">{tds} мг/л</span>
                    )}
                  </div>
                  {activeParams.tds ? (
                    <input
                      type="number"
                      step="any"
                      placeholder="Введите солесодержание..."
                      value={tds}
                      onChange={(e) => setTds(e.target.value)}
                      className="w-full bg-[#13261f] border border-emerald-800 text-slate-100 p-2 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500"
                    />
                  ) : (
                    <div className="text-xs text-slate-400 italic py-1">Статус: нет замера</div>
                  )}
                  <label className="flex items-center space-x-1.5 text-[11px] text-slate-400 mt-2">
                    <input
                      type="checkbox"
                      checked={!activeParams.tds}
                      onChange={() => toggleParam("tds")}
                      className="rounded text-emerald-600"
                    />
                    <span>Поставить статус «нет замера»</span>
                  </label>
                </div>

              </div>
            </div>
          )}

          {/* ATMOSPHERE FORM */}
          {category === "atmosphere" && (
            <div className="bg-[#13261f]/90 border border-sky-800/60 rounded-2xl p-4 space-y-4">
              <h4 className="text-xs font-bold text-sky-400 uppercase tracking-wider flex items-center">
                <Sliders className="w-4 h-4 mr-1" />
                Метеорологические параметры (атмосфера):
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Air Temp */}
                <div className="p-3 bg-[#0b1512] rounded-xl border border-emerald-900/60">
                  <div className="flex justify-between items-center text-xs mb-1">
                    <span className="font-semibold text-slate-200">Температура воздуха (°C):</span>
                    {activeParams.airTemp && airTemp !== "" && (
                      <span className="text-amber-300 font-bold text-[11px]">{airTemp} °C</span>
                    )}
                  </div>
                  {activeParams.airTemp ? (
                    <input
                      type="number"
                      step="any"
                      placeholder="Введите температуру..."
                      value={airTemp}
                      onChange={(e) => setAirTemp(e.target.value)}
                      className="w-full bg-[#13261f] border border-emerald-800 text-slate-100 p-2 rounded-xl text-xs focus:ring-2 focus:ring-amber-500"
                    />
                  ) : (
                    <div className="text-xs text-slate-400 italic py-1">Статус: нет замера</div>
                  )}
                  <label className="flex items-center space-x-1.5 text-[11px] text-slate-400 mt-2">
                    <input
                      type="checkbox"
                      checked={!activeParams.airTemp}
                      onChange={() => toggleParam("airTemp")}
                      className="rounded text-emerald-600"
                    />
                    <span>Поставить статус «нет замера»</span>
                  </label>
                </div>

                {/* Humidity */}
                <div className="p-3 bg-[#0b1512] rounded-xl border border-emerald-900/60">
                  <div className="flex justify-between items-center text-xs mb-1">
                    <span className="font-semibold text-slate-200">Относительная влажность (%):</span>
                    {activeParams.humidity && humidity !== "" && (
                      <span className="text-sky-300 font-bold text-[11px]">{humidity} %</span>
                    )}
                  </div>
                  {activeParams.humidity ? (
                    <input
                      type="number"
                      step="any"
                      placeholder="Введите влажность..."
                      value={humidity}
                      onChange={(e) => setHumidity(e.target.value)}
                      className="w-full bg-[#13261f] border border-emerald-800 text-slate-100 p-2 rounded-xl text-xs focus:ring-2 focus:ring-sky-500"
                    />
                  ) : (
                    <div className="text-xs text-slate-400 italic py-1">Статус: нет замера</div>
                  )}
                  <label className="flex items-center space-x-1.5 text-[11px] text-slate-400 mt-2">
                    <input
                      type="checkbox"
                      checked={!activeParams.humidity}
                      onChange={() => toggleParam("humidity")}
                      className="rounded text-emerald-600"
                    />
                    <span>Поставить статус «нет замера»</span>
                  </label>
                </div>

                {/* CO2 PPM */}
                <div className="p-3 bg-[#0b1512] rounded-xl border border-emerald-900/60 sm:col-span-2">
                  <div className="flex justify-between items-center text-xs mb-1">
                    <span className="font-semibold text-emerald-400">Содержание CO2 (PPM):</span>
                    {activeParams.co2Ppm && co2Ppm !== "" && !isNaN(Number(co2Ppm)) && (
                      <span className="font-mono text-emerald-300 font-bold text-[11px]">
                        {co2Ppm} ppm = {convertPpmToPercent(Number(co2Ppm))}%
                      </span>
                    )}
                  </div>
                  {activeParams.co2Ppm ? (
                    <input
                      type="number"
                      step="any"
                      placeholder="Введите концентрацию CO2 в ppm (напр. 415)..."
                      value={co2Ppm}
                      onChange={(e) => setCo2Ppm(e.target.value)}
                      className="w-full bg-[#13261f] border border-emerald-800 text-slate-100 p-2 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500"
                    />
                  ) : (
                    <div className="text-xs text-slate-400 italic py-1">Статус: нет замера</div>
                  )}
                  <label className="flex items-center space-x-1.5 text-[11px] text-slate-400 mt-2">
                    <input
                      type="checkbox"
                      checked={!activeParams.co2Ppm}
                      onChange={() => toggleParam("co2Ppm")}
                      className="rounded text-emerald-600"
                    />
                    <span>Поставить статус «нет замера»</span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* LITHOSPHERE (PEDOSPHERE) FORM */}
          {category === "lithosphere" && (
            <div className="bg-[#13261f]/90 border border-amber-800/60 rounded-2xl p-4 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center">
                  <Sliders className="w-4 h-4 mr-1" />
                  Педосфера (Почвенный покров и профиль):
                </h4>
                <span className="text-[11px] text-amber-300/80 bg-amber-950/60 px-2 py-0.5 rounded-full border border-amber-800/50">
                  Почвенная колориметрия
                </span>
              </div>

              {/* SOIL COLOR MODULE */}
              <div className="p-3.5 bg-[#0b1512] rounded-xl border border-amber-700/60 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-amber-900/40 pb-2">
                  <div className="flex items-center space-x-1.5">
                    <Pipette className="w-4 h-4 text-amber-400" />
                    <span className="font-bold text-xs text-amber-200">
                      Цвет почвы и гумусовый горизонт:
                    </span>
                  </div>

                  {/* Mode switcher tabs */}
                  <div className="flex items-center bg-[#13261f] p-0.5 rounded-lg border border-amber-800/60 text-[11px]">
                    <button
                      type="button"
                      onClick={() => setSoilColorMode("manual")}
                      className={`px-2.5 py-1 rounded-md transition font-medium ${
                        soilColorMode === "manual"
                          ? "bg-amber-600 text-white font-bold shadow"
                          : "text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      Ручной ввод
                    </button>
                    <button
                      type="button"
                      onClick={() => setSoilColorMode("analyzer")}
                      className={`px-2.5 py-1 rounded-md transition font-medium flex items-center space-x-1 ${
                        soilColorMode === "analyzer"
                          ? "bg-amber-600 text-white font-bold shadow"
                          : "text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      <Sparkles className="w-3 h-3 text-amber-300" />
                      <span>Анализ по фото (Canvas RGB)</span>
                    </button>
                  </div>
                </div>

                {/* CURRENT APPLIED COLOR BADGE */}
                <div className="flex items-center justify-between bg-[#13261f] p-2.5 rounded-xl border border-amber-900/50">
                  <div className="flex items-center space-x-3">
                    <div
                      className="w-7 h-7 rounded-lg border-2 border-amber-300/60 shadow-inner flex-shrink-0"
                      style={{ backgroundColor: soilColorRgb?.hex || "#4B3D32" }}
                    />
                    <div>
                      <div className="text-xs font-bold text-slate-100 flex items-center space-x-1.5">
                        <span>{soilColor || "Цвет не указан"}</span>
                        {soilColorRgb && (
                          <span className="text-[10px] text-amber-400/90 font-mono bg-amber-950/80 px-1.5 py-0.5 rounded border border-amber-800/50">
                            {soilColorRgb.hex}
                          </span>
                        )}
                      </div>
                      {soilColorRgb && (
                        <div className="text-[10px] text-slate-400 font-mono">
                          RGB: ({soilColorRgb.r}, {soilColorRgb.g}, {soilColorRgb.b})
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* MODE 1: MANUAL TEXT INPUT */}
                {soilColorMode === "manual" && (
                  <div className="space-y-2 pt-1">
                    <label className="block text-[11px] text-slate-300">
                      Название оттенка (по шкале Захарова / Манселла):
                    </label>
                    <input
                      type="text"
                      value={soilColor}
                      onChange={(e) => setSoilColor(e.target.value)}
                      placeholder="Например: Темно-серый черноземный, Каштановый..."
                      className="w-full bg-[#13261f] border border-amber-800/70 text-slate-100 p-2 rounded-xl text-xs focus:ring-2 focus:ring-amber-500"
                    />

                    {/* Standard quick pick chips */}
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      <span className="text-[10px] text-slate-400 self-center">Быстрый выбор:</span>
                      {[
                        { name: "Черный гумусовый", hex: "#26211C", rgb: { r: 38, g: 33, b: 28 } },
                        { name: "Темно-серый черноземный", hex: "#3A332D", rgb: { r: 58, g: 51, b: 45 } },
                        { name: "Каштановый степной", hex: "#695241", rgb: { r: 105, g: 82, b: 65 } },
                        { name: "Светло-каштановый", hex: "#8E7660", rgb: { r: 142, g: 118, b: 96 } },
                        { name: "Серый лесной", hex: "#706B64", rgb: { r: 112, g: 107, b: 100 } },
                        { name: "Красновато-бурый", hex: "#8B452A", rgb: { r: 139, g: 69, b: 42 } },
                        { name: "Оливково-сизый глеевый", hex: "#6B7662", rgb: { r: 107, g: 118, b: 98 } }
                      ].map((chip) => (
                        <button
                          key={chip.name}
                          type="button"
                          onClick={() => {
                            setSoilColor(chip.name);
                            setSoilColorRgb({ ...chip.rgb, hex: chip.hex });
                          }}
                          className="px-2 py-1 rounded-lg text-[10px] bg-[#172d24] hover:bg-[#1f3b30] text-slate-200 border border-emerald-800/50 flex items-center space-x-1 transition"
                        >
                          <span
                            className="w-2.5 h-2.5 rounded-full inline-block"
                            style={{ backgroundColor: chip.hex }}
                          />
                          <span>{chip.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* MODE 2: CANVAS API SOIL PHOTO COLORIMETRY */}
                {soilColorMode === "analyzer" && (
                  <div className="space-y-3 pt-1">
                    <div className="border-2 border-dashed border-amber-700/60 rounded-xl p-3 bg-[#13261f]/60 hover:bg-[#13261f] transition text-center">
                      {isAnalyzingSoil ? (
                        <div className="py-4 flex flex-col items-center justify-center space-y-2">
                          <Loader2 className="w-6 h-6 text-amber-400 animate-spin" />
                          <span className="text-xs text-amber-200 font-bold">
                            Спектральный анализ пикселей почвы (Canvas API)...
                          </span>
                        </div>
                      ) : (
                        <div>
                          <input
                            type="file"
                            id="soil-analyzer-input"
                            accept="image/*"
                            onChange={handleSoilPhotoUploadAndAnalyze}
                            className="hidden"
                          />
                          <label
                            htmlFor="soil-analyzer-input"
                            className="cursor-pointer flex flex-col items-center justify-center space-y-1.5 text-xs text-slate-300"
                          >
                            <Camera className="w-6 h-6 text-amber-400" />
                            <span className="font-bold text-amber-300">
                              {soilPhotoUrl ? "Загрузить другое фото почвы" : "Загрузите фото почвенного среза / пробы"}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              Canvas API автоматически определит доминирующий цвет в RGB/HEX и тип почвы
                            </span>
                          </label>
                        </div>
                      )}
                    </div>

                    {/* Analysis Output Box */}
                    {soilAnalysisResult && (
                      <div className="bg-[#172d24] border border-amber-600/70 rounded-xl p-3 space-y-2 text-xs">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <div
                              className="w-8 h-8 rounded-lg border-2 border-amber-300 shadow-md"
                              style={{ backgroundColor: soilAnalysisResult.hex }}
                            />
                            <div>
                              <div className="font-bold text-amber-200 text-xs">
                                {soilAnalysisResult.colorName}
                              </div>
                              <div className="text-[10px] text-slate-300">
                                {soilAnalysisResult.classification}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="font-mono text-amber-300 font-bold text-xs block">
                              {soilAnalysisResult.hex}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              RGB({soilAnalysisResult.rgb.r}, {soilAnalysisResult.rgb.g}, {soilAnalysisResult.rgb.b})
                            </span>
                          </div>
                        </div>

                        <div className="p-2 bg-[#0b1512] rounded-lg text-[11px] text-slate-300 border border-emerald-900/60">
                          <strong className="text-amber-400">Оценка гумусированности:</strong> {soilAnalysisResult.humusEstimate}
                        </div>

                        <div className="flex justify-end pt-1">
                          <button
                            type="button"
                            onClick={() => {
                              setSoilColor(soilAnalysisResult.colorName);
                              setSoilColorRgb({
                                r: soilAnalysisResult.rgb.r,
                                g: soilAnalysisResult.rgb.g,
                                b: soilAnalysisResult.rgb.b,
                                hex: soilAnalysisResult.hex
                              });
                            }}
                            className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-bold transition flex items-center space-x-1 shadow"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Применить данный цвет в замер</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Standard Pedosphere Parameters */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Soil pH */}
                <div className="p-3 bg-[#0b1512] rounded-xl border border-emerald-900/60">
                  <div className="flex justify-between text-xs text-slate-200 mb-1">
                    <span>Кислотность почвы (pH водной вытяжки):</span>
                    {activeParams.soilPh && soilPh !== "" && (
                      <strong className="text-amber-400 text-[11px]">{soilPh} рН</strong>
                    )}
                  </div>
                  {activeParams.soilPh ? (
                    <input
                      type="number"
                      step="any"
                      placeholder="Введите pH почвы..."
                      value={soilPh}
                      onChange={(e) => setSoilPh(e.target.value)}
                      className="w-full bg-[#13261f] border border-emerald-800 text-slate-100 p-2 rounded-xl text-xs focus:ring-2 focus:ring-amber-500"
                    />
                  ) : (
                    <div className="text-xs text-slate-400 italic py-1">Статус: нет замера</div>
                  )}
                  <label className="flex items-center space-x-1.5 text-[11px] text-slate-400 mt-2">
                    <input
                      type="checkbox"
                      checked={!activeParams.soilPh}
                      onChange={() => toggleParam("soilPh")}
                      className="rounded text-emerald-600"
                    />
                    <span>Поставить статус «нет замера»</span>
                  </label>
                </div>

                {/* Soil Texture */}
                <div className="p-3 bg-[#0b1512] rounded-xl border border-emerald-900/60">
                  <label className="block text-xs text-slate-300 mb-1 font-semibold">Механический состав:</label>
                  {activeParams.soilTexture ? (
                    <select
                      value={soilTexture}
                      onChange={(e) => setSoilTexture(e.target.value)}
                      className="w-full bg-[#13261f] border border-emerald-800 text-slate-100 p-2 rounded-xl text-xs"
                    >
                      <option value="Песчаный">Песчаный</option>
                      <option value="Супесчаный">Супесчаный</option>
                      <option value="Суглинок легкий">Суглинок лёгкий</option>
                      <option value="Суглинок средний">Суглинок средний</option>
                      <option value="Глинистый">Глинистый</option>
                    </select>
                  ) : (
                    <div className="text-xs text-slate-400 italic py-1">Статус: нет замера</div>
                  )}
                  <label className="flex items-center space-x-1.5 text-[11px] text-slate-400 mt-2">
                    <input
                      type="checkbox"
                      checked={!activeParams.soilTexture}
                      onChange={() => toggleParam("soilTexture")}
                      className="rounded text-emerald-600"
                    />
                    <span>Поставить статус «нет замера»</span>
                  </label>
                </div>
              </div>

              {/* Soil Section Photo Attachment */}
              <div className="p-3 bg-[#0b1512] rounded-xl border border-amber-900/60">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-amber-200 flex items-center">
                    <Camera className="w-3.5 h-3.5 mr-1 text-amber-400" />
                    Фотография почвенного разреза / монолита:
                  </span>
                  {soilPhotoUrl && (
                    <button
                      type="button"
                      onClick={() => setSoilPhotoUrl("")}
                      className="text-[11px] text-rose-400 hover:text-rose-300 flex items-center space-x-1"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Удалить фото</span>
                    </button>
                  )}
                </div>

                {soilPhotoUrl ? (
                  <div className="relative rounded-xl overflow-hidden border border-amber-700/50 max-h-40 bg-black/40">
                    <img src={soilPhotoUrl} alt="Почвенный образец" className="w-full h-36 object-cover" />
                    <div className="absolute bottom-2 left-2 bg-black/70 px-2 py-0.5 rounded text-[10px] text-amber-300 font-mono">
                      Фото прикреплено (будет сохранено в полевой архив)
                    </div>
                  </div>
                ) : (
                  <label className="border-2 border-dashed border-emerald-800/80 rounded-xl p-3 flex items-center justify-center space-x-2 cursor-pointer hover:bg-[#13261f] transition text-xs text-slate-300">
                    <Upload className="w-4 h-4 text-amber-400" />
                    <span>Прикрепить фотографию разреза</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handlePhotoUpload(e, setSoilPhotoUrl)}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
            </div>
          )}

          {/* BIOSPHERE FORM */}
          {category === "biosphere" && (
            <div className="bg-[#13261f]/90 border border-emerald-800/60 rounded-2xl p-4 space-y-4">
              <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center">
                <Sliders className="w-4 h-4 mr-1" />
                Биомониторинг и биоразнообразие:
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-[#0b1512] rounded-xl border border-emerald-900/60">
                  <label className="block text-slate-300 mb-1 font-semibold">Виды флоры:</label>
                  {activeParams.floraSpecies ? (
                    <input
                      type="text"
                      placeholder="Например: Ковыль, Полынь..."
                      value={floraSpecies}
                      onChange={(e) => setFloraSpecies(e.target.value)}
                      className="w-full bg-[#13261f] border border-emerald-800 text-slate-100 p-2 rounded-xl"
                    />
                  ) : (
                    <div className="text-xs text-slate-400 italic py-1">Статус: нет замера</div>
                  )}
                  <label className="flex items-center space-x-1.5 text-[11px] text-slate-400 mt-2">
                    <input
                      type="checkbox"
                      checked={!activeParams.floraSpecies}
                      onChange={() => toggleParam("floraSpecies")}
                      className="rounded text-emerald-600"
                    />
                    <span>Поставить статус «нет замера»</span>
                  </label>
                </div>

                <div className="p-3 bg-[#0b1512] rounded-xl border border-emerald-900/60">
                  <label className="block text-slate-300 mb-1 font-semibold">Виды фауны:</label>
                  {activeParams.faunaSpecies ? (
                    <input
                      type="text"
                      placeholder="Например: Суслик, Лунь..."
                      value={faunaSpecies}
                      onChange={(e) => setFaunaSpecies(e.target.value)}
                      className="w-full bg-[#13261f] border border-emerald-800 text-slate-100 p-2 rounded-xl"
                    />
                  ) : (
                    <div className="text-xs text-slate-400 italic py-1">Статус: нет замера</div>
                  )}
                  <label className="flex items-center space-x-1.5 text-[11px] text-slate-400 mt-2">
                    <input
                      type="checkbox"
                      checked={!activeParams.faunaSpecies}
                      onChange={() => toggleParam("faunaSpecies")}
                      className="rounded text-emerald-600"
                    />
                    <span>Поставить статус «нет замера»</span>
                  </label>
                </div>
              </div>

              {/* Shannon Calculator Box */}
              <div className="p-3 bg-[#0b1512] rounded-xl border border-emerald-700/80 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <span className="font-bold text-emerald-300 text-xs">
                    Индекс биоразнообразия Шеннона:
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      alert(`Индекс Шеннона рассчитан: H' = ${computedShannon}`);
                    }}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition flex items-center space-x-1 shadow"
                  >
                    <Calculator className="w-3.5 h-3.5" />
                    <span>Рассчитать H'</span>
                  </button>
                </div>

                <div className="bg-[#13261f] p-2.5 rounded-lg border border-emerald-800 flex items-center justify-between text-xs">
                  <span className="text-slate-300">Значение индекса Шеннона:</span>
                  <span className="font-mono text-emerald-400 font-extrabold text-sm">
                    {activeParams.shannonIndex ? `H' = ${computedShannon}` : "нет замера"}
                  </span>
                </div>

                <label className="flex items-center space-x-1.5 text-[11px] text-slate-400 mt-1">
                  <input
                    type="checkbox"
                    checked={!activeParams.shannonIndex}
                    onChange={() => toggleParam("shannonIndex")}
                    className="rounded text-emerald-600"
                  />
                  <span>Поставить статус «нет замера» для биоиндекса</span>
                </label>
              </div>

              {/* Biosphere Photo Upload */}
              <div className="p-3 bg-[#0b1512] rounded-xl border border-emerald-900/60">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-emerald-300 flex items-center">
                    <Camera className="w-3.5 h-3.5 mr-1 text-emerald-400" />
                    Фотография биообъекта / биотопа:
                  </span>
                  {bioPhotoUrl && (
                    <button
                      type="button"
                      onClick={() => setBioPhotoUrl("")}
                      className="text-[11px] text-rose-400 hover:text-rose-300 flex items-center space-x-1"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Удалить фото</span>
                    </button>
                  )}
                </div>

                {bioPhotoUrl ? (
                  <div className="relative rounded-xl overflow-hidden border border-emerald-700/50 max-h-40 bg-black/40">
                    <img src={bioPhotoUrl} alt="Биообъект" className="w-full h-36 object-cover" />
                    <div className="absolute bottom-2 left-2 bg-black/70 px-2 py-0.5 rounded text-[10px] text-emerald-300">
                      Фотография прикреплена к биомониторингу
                    </div>
                  </div>
                ) : (
                  <label className="border-2 border-dashed border-emerald-800/80 rounded-xl p-3 flex items-center justify-center space-x-2 cursor-pointer hover:bg-[#13261f] transition text-xs text-slate-300">
                    <Upload className="w-4 h-4 text-emerald-400" />
                    <span>Прикрепить фото флоры/фауны</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handlePhotoUpload(e, setBioPhotoUrl)}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
            </div>
          )}

          {/* ANTHROPOGENIC FORM */}
          {category === "anthropogenic" && (
            <div className="bg-[#13261f]/90 border border-orange-800/60 rounded-2xl p-4 space-y-4">
              <h4 className="text-xs font-bold text-orange-400 uppercase tracking-wider flex items-center">
                <Sliders className="w-4 h-4 mr-1" />
                Антропогенная нагрузка:
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-3 bg-[#0b1512] rounded-xl border border-orange-900/60">
                  <div className="flex justify-between text-xs text-slate-200 mb-1">
                    <span className="font-bold text-orange-300 flex items-center">
                      <HelpCircle className="w-3.5 h-3.5 mr-1 text-amber-400" />
                      Замусоренность (1-5 баллов):
                    </span>
                    {activeParams.litterLevel && litterLevel !== "" && (
                      <strong className="text-orange-400 text-[11px]">{litterLevel} балл</strong>
                    )}
                  </div>

                  {activeParams.litterLevel ? (
                    <>
                      <input
                        type="number"
                        step="any"
                        placeholder="Введите балл замусоренности (1-5)..."
                        value={litterLevel}
                        onChange={(e) => setLitterLevel(e.target.value)}
                        className="w-full bg-[#13261f] border border-orange-900/80 text-slate-100 p-2 rounded-xl text-xs focus:ring-2 focus:ring-orange-500"
                      />
                      {litterLevel !== "" && LITTER_DESCRIPTIONS[Number(litterLevel)] && (
                        <div className="p-2 bg-[#13261f] rounded-lg text-xs font-medium text-amber-200 border border-orange-900/60 mt-1.5">
                          {LITTER_DESCRIPTIONS[Number(litterLevel)]}
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-xs text-slate-400 italic py-1">Статус: нет замера</div>
                  )}

                  <label className="flex items-center space-x-1.5 text-[11px] text-slate-400 mt-2">
                    <input
                      type="checkbox"
                      checked={!activeParams.litterLevel}
                      onChange={() => toggleParam("litterLevel")}
                      className="rounded text-emerald-600"
                    />
                    <span>Поставить статус «нет замера»</span>
                  </label>
                </div>

                <div className="p-3 bg-[#0b1512] rounded-xl border border-orange-900/60">
                  <div className="flex justify-between text-xs text-slate-200 mb-1">
                    <span>Шумовое загрязнение (дБА):</span>
                    {activeParams.noiseLevel && noiseLevel !== "" && (
                      <strong className="text-orange-400 text-[11px]">{noiseLevel} дБА</strong>
                    )}
                  </div>

                  {activeParams.noiseLevel ? (
                    <input
                      type="number"
                      step="any"
                      placeholder="Введите уровень шума..."
                      value={noiseLevel}
                      onChange={(e) => setNoiseLevel(e.target.value)}
                      className="w-full bg-[#13261f] border border-orange-900/80 text-slate-100 p-2 rounded-xl text-xs focus:ring-2 focus:ring-orange-500"
                    />
                  ) : (
                    <div className="text-xs text-slate-400 italic py-1">Статус: нет замера</div>
                  )}

                  <label className="flex items-center space-x-1.5 text-[11px] text-slate-400 mt-2">
                    <input
                      type="checkbox"
                      checked={!activeParams.noiseLevel}
                      onChange={() => toggleParam("noiseLevel")}
                      className="rounded text-emerald-600"
                    />
                    <span>Поставить статус «нет замера»</span>
                  </label>
                </div>
              </div>

              {/* Anthropogenic Photo Upload */}
              <div className="p-3 bg-[#0b1512] rounded-xl border border-orange-900/60">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-orange-300 flex items-center">
                    <Camera className="w-3.5 h-3.5 mr-1 text-orange-400" />
                    Фотофиксация антропогенного фактора / нарушений:
                  </span>
                  {antPhotoUrl && (
                    <button
                      type="button"
                      onClick={() => setAntPhotoUrl("")}
                      className="text-[11px] text-rose-400 hover:text-rose-300 flex items-center space-x-1"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Удалить фото</span>
                    </button>
                  )}
                </div>

                {antPhotoUrl ? (
                  <div className="relative rounded-xl overflow-hidden border border-orange-700/50 max-h-40 bg-black/40">
                    <img src={antPhotoUrl} alt="Антропогенное воздействие" className="w-full h-36 object-cover" />
                  </div>
                ) : (
                  <label className="border-2 border-dashed border-orange-800/80 rounded-xl p-3 flex items-center justify-center space-x-2 cursor-pointer hover:bg-[#13261f] transition text-xs text-slate-300">
                    <Upload className="w-4 h-4 text-orange-400" />
                    <span>Прикрепить фото кострищ/свалок/эрозии</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handlePhotoUpload(e, setAntPhotoUrl)}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
            </div>
          )}

          {/* GEOLOGY (MINERALOGY) FORM */}
          {category === "geology" && (
            <div className="bg-[#13261f]/90 border border-purple-800/60 rounded-2xl p-4 space-y-4">
              <h4 className="text-xs font-bold text-purple-400 uppercase tracking-wider flex items-center">
                <Sliders className="w-4 h-4 mr-1" />
                Геологическая летопись (Минералы и горные породы):
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-[#0b1512] rounded-xl border border-purple-900/60">
                  <label className="block text-slate-300 mb-1 font-semibold">Название минерала / породы:</label>
                  {activeParams.mineralName ? (
                    <input
                      type="text"
                      placeholder="Например: Кварц, Кальцит..."
                      value={mineralName}
                      onChange={(e) => setMineralName(e.target.value)}
                      className="w-full bg-[#13261f] border border-emerald-800 text-slate-100 p-2 rounded-xl"
                    />
                  ) : (
                    <div className="text-xs text-slate-400 italic py-1">Статус: нет замера</div>
                  )}
                  <label className="flex items-center space-x-1.5 text-[11px] text-slate-400 mt-2">
                    <input
                      type="checkbox"
                      checked={!activeParams.mineralName}
                      onChange={() => toggleParam("mineralName")}
                      className="rounded text-emerald-600"
                    />
                    <span>Поставить статус «нет замера»</span>
                  </label>
                </div>

                <div className="p-3 bg-[#0b1512] rounded-xl border border-purple-900/60">
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-slate-300 font-semibold">Твёрдость по шкале Мооса:</label>
                    {activeParams.mohsHardness && mohsHardness !== "" && (
                      <span className="text-purple-300 font-bold text-[11px]">{mohsHardness}</span>
                    )}
                  </div>
                  {activeParams.mohsHardness ? (
                    <input
                      type="number"
                      step="any"
                      placeholder="Введите твёрдость (напр. 6.5)..."
                      value={mohsHardness}
                      onChange={(e) => setMohsHardness(e.target.value)}
                      className="w-full bg-[#13261f] border border-emerald-800 text-slate-100 p-2 rounded-xl text-xs focus:ring-2 focus:ring-purple-500"
                    />
                  ) : (
                    <div className="text-xs text-slate-400 italic py-1">Статус: нет замера</div>
                  )}
                  <label className="flex items-center space-x-1.5 text-[11px] text-slate-400 mt-2">
                    <input
                      type="checkbox"
                      checked={!activeParams.mohsHardness}
                      onChange={() => toggleParam("mohsHardness")}
                      className="rounded text-emerald-600"
                    />
                    <span>Поставить статус «нет замера»</span>
                  </label>
                </div>
              </div>

              {/* Geology Photo Upload */}
              <div className="p-3 bg-[#0b1512] rounded-xl border border-purple-900/60">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-purple-300 flex items-center">
                    <Camera className="w-3.5 h-3.5 mr-1 text-purple-400" />
                    Фотография минерала / образца керна:
                  </span>
                  {minPhotoUrl && (
                    <button
                      type="button"
                      onClick={() => setMinPhotoUrl("")}
                      className="text-[11px] text-rose-400 hover:text-rose-300 flex items-center space-x-1"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Удалить фото</span>
                    </button>
                  )}
                </div>

                {minPhotoUrl ? (
                  <div className="relative rounded-xl overflow-hidden border border-purple-700/50 max-h-40 bg-black/40">
                    <img src={minPhotoUrl} alt="Минерал" className="w-full h-36 object-cover" />
                  </div>
                ) : (
                  <label className="border-2 border-dashed border-purple-800/80 rounded-xl p-3 flex items-center justify-center space-x-2 cursor-pointer hover:bg-[#13261f] transition text-xs text-slate-300">
                    <Upload className="w-4 h-4 text-purple-400" />
                    <span>Прикрепить макроснимок образца</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handlePhotoUpload(e, setMinPhotoUrl)}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
            </div>
          )}

          {/* FOSSILS (PALEONTOLOGY) FORM */}
          {category === "fossils" && (
            <div className="bg-[#13261f]/90 border border-amber-900/60 rounded-2xl p-4 space-y-4">
              
              {/* QR Passport Header for Fossils */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3 bg-gradient-to-r from-amber-950/80 via-[#18281f] to-emerald-950/80 border border-amber-500/50 rounded-xl shadow-lg">
                <div className="space-y-0.5">
                  <div className="flex items-center space-x-1.5 text-amber-400 font-bold text-xs uppercase tracking-wider">
                    <QrCode className="w-4 h-4 text-amber-300" />
                    <span>QR-Паспорт палеонтологической станции</span>
                  </div>
                  <p className="text-[11px] text-slate-300">
                    Сгенерируйте печатный палеонтологический QR-паспорт поста «{presetStation?.name || customStationName}»
                  </p>
                </div>

                {onOpenPassportModal && (
                  <button
                    type="button"
                    onClick={() => onOpenPassportModal(presetStation)}
                    className="px-3.5 py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center space-x-1.5 shrink-0 border border-amber-400/50 hover:scale-105"
                  >
                    <QrCode className="w-4 h-4 text-amber-200" />
                    <span>Открыть QR Паспорт</span>
                  </button>
                )}
              </div>

              <h4 className="text-xs font-bold text-amber-500 uppercase tracking-wider flex items-center pt-1">
                <Sliders className="w-4 h-4 mr-1" />
                Палеонтологическая находка (Фоссилии / Затерянный мир):
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-[#0b1512] rounded-xl border border-amber-900/60">
                  <label className="block text-slate-300 mb-1 font-semibold">Таксон / Описание находки:</label>
                  {activeParams.organismGroup ? (
                    <input
                      type="text"
                      placeholder="Например: Аммонит, Отпечаток листа..."
                      value={organismGroup}
                      onChange={(e) => setOrganismGroup(e.target.value)}
                      className="w-full bg-[#13261f] border border-emerald-800 text-slate-100 p-2 rounded-xl"
                    />
                  ) : (
                    <div className="text-xs text-slate-400 italic py-1">Статус: нет замера</div>
                  )}
                  <label className="flex items-center space-x-1.5 text-[11px] text-slate-400 mt-2">
                    <input
                      type="checkbox"
                      checked={!activeParams.organismGroup}
                      onChange={() => toggleParam("organismGroup")}
                      className="rounded text-emerald-600"
                    />
                    <span>Поставить статус «нет замера»</span>
                  </label>
                </div>

                <div className="p-3 bg-[#0b1512] rounded-xl border border-amber-900/60">
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-slate-300 font-semibold">Длина образца (мм):</label>
                    {activeParams.lengthMm && lengthMm !== "" && (
                      <span className="text-amber-300 font-bold text-[11px]">{lengthMm} мм</span>
                    )}
                  </div>
                  {activeParams.lengthMm ? (
                    <input
                      type="number"
                      step="any"
                      placeholder="Введите длину..."
                      value={lengthMm}
                      onChange={(e) => setLengthMm(e.target.value)}
                      className="w-full bg-[#13261f] border border-emerald-800 text-slate-100 p-2 rounded-xl text-xs focus:ring-2 focus:ring-amber-500"
                    />
                  ) : (
                    <div className="text-xs text-slate-400 italic py-1">Статус: нет замера</div>
                  )}
                  <label className="flex items-center space-x-1.5 text-[11px] text-slate-400 mt-2">
                    <input
                      type="checkbox"
                      checked={!activeParams.lengthMm}
                      onChange={() => toggleParam("lengthMm")}
                      className="rounded text-emerald-600"
                    />
                    <span>Поставить статус «нет замера»</span>
                  </label>
                </div>
              </div>

              {/* Fossils Photo Upload */}
              <div className="p-3 bg-[#0b1512] rounded-xl border border-amber-900/60">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-amber-300 flex items-center">
                    <Camera className="w-3.5 h-3.5 mr-1 text-amber-400" />
                    Фотография фоссилии / отпечатка:
                  </span>
                  {fosPhotoUrl && (
                    <button
                      type="button"
                      onClick={() => setFosPhotoUrl("")}
                      className="text-[11px] text-rose-400 hover:text-rose-300 flex items-center space-x-1"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Удалить фото</span>
                    </button>
                  )}
                </div>

                {fosPhotoUrl ? (
                  <div className="relative rounded-xl overflow-hidden border border-amber-700/50 max-h-40 bg-black/40">
                    <img src={fosPhotoUrl} alt="Окаменелость" className="w-full h-36 object-cover" />
                  </div>
                ) : (
                  <label className="border-2 border-dashed border-amber-800/80 rounded-xl p-3 flex items-center justify-center space-x-2 cursor-pointer hover:bg-[#13261f] transition text-xs text-slate-300">
                    <Upload className="w-4 h-4 text-amber-400" />
                    <span>Прикрепить фото окаменелости/следа</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handlePhotoUpload(e, setFosPhotoUrl)}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
            </div>
          )}

          {/* 5. CUSTOM USER-DEFINED METRICS BLOCK */}
          <div className="bg-[#13261f]/90 border border-teal-700/70 rounded-2xl p-4 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-teal-800/50 pb-2">
              <div className="flex items-center space-x-2">
                <div className="p-1.5 bg-teal-500/20 rounded-lg text-teal-300 border border-teal-500/40">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-teal-300 uppercase tracking-wider">
                    Пользовательские параметры замера
                  </h4>
                  <p className="text-[11px] text-slate-300">
                    Добавьте любые специфические или новые параметры (радиация, микропластик, хлорофилл и др.)
                  </p>
                </div>
              </div>
            </div>

            {/* List of active custom metrics */}
            {customMetrics.length > 0 && (
              <div className="space-y-2 pt-1">
                {customMetrics.map((cm) => (
                  <div
                    key={cm.id}
                    className="p-2.5 bg-[#0b1512] rounded-xl border border-teal-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 flex-1">
                      <div>
                        <span className="block text-[10px] text-teal-400 font-semibold mb-0.5">Параметр:</span>
                        <input
                          type="text"
                          value={cm.name}
                          onChange={(e) => handleUpdateCustomMetric(cm.id, "name", e.target.value)}
                          className="w-full bg-[#13261f] border border-teal-700 text-slate-100 px-2 py-1 rounded-lg text-xs"
                        />
                      </div>
                      <div>
                        <span className="block text-[10px] text-teal-400 font-semibold mb-0.5">Значение:</span>
                        <input
                          type="text"
                          value={String(cm.value)}
                          onChange={(e) => handleUpdateCustomMetric(cm.id, "value", e.target.value)}
                          className="w-full bg-[#13261f] border border-teal-700 text-slate-100 px-2 py-1 rounded-lg text-xs font-mono font-bold text-amber-300"
                        />
                      </div>
                      <div>
                        <span className="block text-[10px] text-teal-400 font-semibold mb-0.5">Ед. изм.:</span>
                        <input
                          type="text"
                          value={cm.unit}
                          placeholder="мкЗв/ч, мг/дм³, шт..."
                          onChange={(e) => handleUpdateCustomMetric(cm.id, "unit", e.target.value)}
                          className="w-full bg-[#13261f] border border-teal-700 text-slate-100 px-2 py-1 rounded-lg text-xs"
                        />
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveCustomMetric(cm.id)}
                      title="Удалить параметр"
                      className="self-end sm:self-center p-1.5 bg-rose-950/60 hover:bg-rose-900 border border-rose-800/60 text-rose-300 rounded-lg transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Form to add a new custom metric */}
            <div className="p-3 bg-[#0b1512] rounded-xl border border-teal-800/40 space-y-2">
              <span className="text-[11px] font-bold text-teal-200 block">
                + Добавить новое поле замера:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                <input
                  type="text"
                  placeholder="Название (напр. Радиационный фон)"
                  value={newMetricName}
                  onChange={(e) => setNewMetricName(e.target.value)}
                  className="sm:col-span-5 bg-[#13261f] border border-emerald-800 text-slate-100 px-2.5 py-1.5 rounded-xl text-xs focus:ring-2 focus:ring-teal-500"
                />
                <input
                  type="text"
                  placeholder="Значение (напр. 0.12)"
                  value={newMetricValue}
                  onChange={(e) => setNewMetricValue(e.target.value)}
                  className="sm:col-span-3 bg-[#13261f] border border-emerald-800 text-slate-100 px-2.5 py-1.5 rounded-xl text-xs focus:ring-2 focus:ring-teal-500"
                />
                <input
                  type="text"
                  placeholder="Ед. (мкЗв/ч)"
                  value={newMetricUnit}
                  onChange={(e) => setNewMetricUnit(e.target.value)}
                  className="sm:col-span-2 bg-[#13261f] border border-emerald-800 text-slate-100 px-2.5 py-1.5 rounded-xl text-xs focus:ring-2 focus:ring-teal-500"
                />
                <button
                  type="button"
                  onClick={handleAddCustomMetric}
                  disabled={!newMetricName.trim()}
                  className={`sm:col-span-2 py-1.5 px-2 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1 ${
                    newMetricName.trim()
                      ? "bg-teal-600 hover:bg-teal-500 text-white shadow-md cursor-pointer active:scale-95"
                      : "bg-slate-800 text-slate-500 cursor-not-allowed"
                  }`}
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Добавить</span>
                </button>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Полевые примечания и условия:</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Укажите погодные особенности или визуальные примечания..."
              className="w-full bg-[#13261f] border border-emerald-800 text-slate-100 text-xs p-2.5 rounded-xl focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Submit Action Buttons */}
          <div className="pt-3 border-t border-emerald-800/60 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold text-xs transition"
            >
              Отмена
            </button>
            <button
              type="submit"
              className={`px-5 py-2 rounded-xl font-bold text-xs shadow-lg transition flex items-center space-x-1.5 active:scale-95 ${
                isEditing
                  ? "bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-950/40"
                  : "bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-950/40"
              }`}
            >
              {isEditing ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-slate-950" />
                  <span>Сохранить изменения</span>
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  <span>Сохранить замер в журнал</span>
                </>
              )}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
