import React, { useEffect, useRef, useState } from "react";
import L from "leaflet";
import { MonitoringStation, MonitoringRecord, ResearchCategory } from "../types";
import { CATEGORIES } from "../data/mockData";
import { 
  MapPin, 
  Filter, 
  Layers as LayersIcon, 
  LocateFixed, 
  Loader2, 
  Plus, 
  Info, 
  Check, 
  X,
  Compass,
  RotateCcw
} from "lucide-react";

interface MapViewProps {
  stations: MonitoringStation[];
  records: MonitoringRecord[];
  selectedStationCode?: string;
  selectedCategory?: ResearchCategory | "ALL";
  onSelectCategory?: (category: ResearchCategory | "ALL") => void;
  clickedCoords?: { lat: number; lng: number } | null;
  onSelectStation: (code: string) => void;
  onMapClickCoordinates?: (lat: number, lng: number) => void;
  onClearClickedCoords?: () => void;
  onOpenDataEntryForStation?: (station: MonitoringStation) => void;
  onOpenDataEntryWithCoords?: (coords: { lat: number; lng: number }) => void;
  canCreateRecords?: boolean;
}

const CATEGORY_COLORS: Record<ResearchCategory, string> = {
  atmosphere: "#0284c7",   // Sky blue
  hydrosphere: "#2563eb",  // Deep blue
  lithosphere: "#b45309",  // Amber/brown
  biosphere: "#16a34a",    // Emerald green
  anthropogenic: "#ea580c",// Orange
  geology: "#7e22ce",      // Purple
  fossils: "#92400e",      // Ochre
};

/**
 * Format parameter value with unit.
 * If value is missing/null/undefined/empty, returns "нет замера".
 */
function formatParamVal(val: any, unit: string = ""): string {
  if (val === undefined || val === null || val === "" || Number.isNaN(val)) {
    return `<span style="color: #94a3b8; font-style: italic; font-weight: normal;">нет замера</span>`;
  }
  return `<strong style="color: #f8fafc; font-weight: 700;">${val}${unit}</strong>`;
}

/**
 * Build HTML for key parameters in popup
 */
function buildRecordParamsHTML(rec: MonitoringRecord): string {
  if (rec.hydrosphere) {
    const h = rec.hydrosphere;
    return `
      <div style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 4px; font-size: 11px; margin-top: 8px; padding-top: 8px; border-top: 1px solid #1e3a2f; color: #cbd5e1;">
        <div>Вода: ${formatParamVal(h.waterTemp, "°C")}</div>
        <div>pH: ${formatParamVal(h.ph)}</div>
        <div>Прозрачность: ${formatParamVal(h.transparency, " см")}</div>
        <div>TDS: ${formatParamVal(h.tds, " мг/л")}</div>
        <div>O₂: ${formatParamVal(h.dissolvedOxygen, " мг/л")}</div>
        <div>Нитраты: ${formatParamVal(h.nitrates, " мг/л")}</div>
      </div>
    `;
  }
  if (rec.atmosphere) {
    const a = rec.atmosphere;
    return `
      <div style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 4px; font-size: 11px; margin-top: 8px; padding-top: 8px; border-top: 1px solid #1e3a2f; color: #cbd5e1;">
        <div>Воздух: ${formatParamVal(a.airTemp, "°C")}</div>
        <div>Влажность: ${formatParamVal(a.humidity, "%")}</div>
        <div>Давление: ${formatParamVal(a.pressure, " мм")}</div>
        <div>Ветер: ${formatParamVal(a.windSpeed, " м/с")}</div>
        <div>CO₂: ${formatParamVal(a.co2Ppm, " ppm")}</div>
      </div>
    `;
  }
  if (rec.lithosphere) {
    const l = rec.lithosphere;
    return `
      <div style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 4px; font-size: 11px; margin-top: 8px; padding-top: 8px; border-top: 1px solid #1e3a2f; color: #cbd5e1;">
        <div>pH почвы: ${formatParamVal(l.soilPh)}</div>
        <div>Состав: ${formatParamVal(l.texture)}</div>
        <div>Плотность: ${formatParamVal(l.density, " г/см³")}</div>
        <div>Металлы: ${formatParamVal(l.heavyMetals)}</div>
      </div>
    `;
  }
  if (rec.biosphere) {
    const b = rec.biosphere;
    return `
      <div style="font-size: 11px; margin-top: 8px; padding-top: 8px; border-top: 1px solid #1e3a2f; color: #cbd5e1; display: flex; flex-direction: column; gap: 2px;">
        <div>Флора: ${formatParamVal(b.floraSpecies)}</div>
        <div>Фауна: ${formatParamVal(b.faunaSpecies)}</div>
        <div>Индекс Шеннона H': ${formatParamVal(b.shannonIndex)}</div>
      </div>
    `;
  }
  if (rec.anthropogenic) {
    const ant = rec.anthropogenic;
    return `
      <div style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 4px; font-size: 11px; margin-top: 8px; padding-top: 8px; border-top: 1px solid #1e3a2f; color: #cbd5e1;">
        <div>Мусор: ${formatParamVal(ant.litterLevel, "/5")}</div>
        <div>Шум: ${formatParamVal(ant.noiseLevel, " дБА")}</div>
        <div>Свалка: ${ant.illegalDumps ? "Обнаружена" : "Нет"}</div>
      </div>
    `;
  }
  if (rec.geology) {
    const g = rec.geology;
    return `
      <div style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 4px; font-size: 11px; margin-top: 8px; padding-top: 8px; border-top: 1px solid #1e3a2f; color: #cbd5e1;">
        <div>Минерал: ${formatParamVal(g.mineralName)}</div>
        <div>Твердость: ${formatParamVal(g.mohsHardness)}</div>
      </div>
    `;
  }
  if (rec.fossils) {
    const f = rec.fossils;
    return `
      <div style="font-size: 11px; margin-top: 8px; padding-top: 8px; border-top: 1px solid #1e3a2f; color: #cbd5e1;">
        <div>Таксон: ${formatParamVal(f.organismGroup)}</div>
        <div>Размеры: ${formatParamVal(f.lengthMm, "x")}${formatParamVal(f.widthMm, " мм")}</div>
      </div>
    `;
  }
  return `<div style="font-size: 11px; color: #94a3b8; font-style: italic; margin-top: 8px; padding-top: 8px; border-top: 1px solid #1e3a2f;">Показатели: нет замера</div>`;
}

export const MapView: React.FC<MapViewProps> = ({
  stations,
  records,
  selectedStationCode,
  selectedCategory = "ALL",
  onSelectCategory,
  clickedCoords,
  onSelectStation,
  onMapClickCoordinates,
  onClearClickedCoords,
  onOpenDataEntryForStation,
  onOpenDataEntryWithCoords,
  canCreateRecords = false
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersGroupRef = useRef<L.LayerGroup | null>(null);
  const tempMarkerRef = useRef<L.Marker | null>(null);
  const gpsMarkerRef = useRef<L.Marker | null>(null);

  // Local category filter state (allows direct interactive filtering in MapView)
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<ResearchCategory | "ALL">(selectedCategory);
  const [isLocating, setIsLocating] = useState(false);
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);

  // Synchronize local filter if parent changes selectedCategory
  useEffect(() => {
    if (selectedCategory) {
      setActiveCategoryFilter(selectedCategory);
    }
  }, [selectedCategory]);

  const handleCategoryChange = (cat: ResearchCategory | "ALL") => {
    setActiveCategoryFilter(cat);
    if (onSelectCategory) {
      onSelectCategory(cat);
    }
    // Also reset station code selection to show all matching category markers
    onSelectStation("ALL");
  };

  // Initialize GIS Map with Esri World Imagery Satellite Tiles
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [53.2167, 63.6333],
        zoom: 9,
        zoomControl: true,
        scrollWheelZoom: true,
      });

      // 1. Esri World Imagery Satellite Tile Layer (High-definition)
      L.tileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        {
          attribution: "Esri Satellite HD, Maxar, Earthstar Geographics",
          maxZoom: 18,
        }
      ).addTo(map);

      // 2. Reference Labels Overlay Layer
      L.tileLayer(
        "https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}",
        {
          maxZoom: 18,
          opacity: 0.8,
        }
      ).addTo(map);

      markersGroupRef.current = L.layerGroup().addTo(map);

      // Map click handler to place custom temporary pin without forced saving
      map.on("click", (e: L.LeafletMouseEvent) => {
        const { lat, lng } = e.latlng;
        if (onMapClickCoordinates) {
          onMapClickCoordinates(Number(lat.toFixed(6)), Number(lng.toFixed(6)));
        }
      });

      mapInstanceRef.current = map;
    }

    const timer = setTimeout(() => {
      mapInstanceRef.current?.invalidateSize();
    }, 200);

    return () => {
      clearTimeout(timer);
    };
  }, [onMapClickCoordinates]);

  // Locate User GPS Position
  const handleLocateUser = () => {
    if (!("geolocation" in navigator)) {
      alert("Геолокация не поддерживается вашим браузером или устройством");
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocating(false);
        const { latitude, longitude, accuracy } = pos.coords;
        setGpsAccuracy(Math.round(accuracy));
        const map = mapInstanceRef.current;
        if (!map) return;

        map.flyTo([latitude, longitude], 15, { duration: 1.2 });

        if (gpsMarkerRef.current) {
          gpsMarkerRef.current.remove();
        }

        const gpsIcon = L.divIcon({
          className: "user-gps-pin",
          html: `
            <div style="
              background-color: #0284c7;
              width: 36px;
              height: 36px;
              border-radius: 50%;
              border: 3px solid #ffffff;
              box-shadow: 0 0 25px #38bdf8;
              display: flex;
              align-items: center;
              justify-content: center;
              color: white;
              font-size: 16px;
              transform: translate(-50%, -50%);
            ">
              🎯
            </div>
          `,
          iconSize: [36, 36],
          iconAnchor: [18, 18],
        });

        const marker = L.marker([latitude, longitude], { icon: gpsIcon }).addTo(map);

        const popupContent = document.createElement("div");
        popupContent.className = "p-2.5 font-sans text-xs text-slate-100 min-w-[210px]";
        popupContent.innerHTML = `
          <div style="font-weight: bold; color: #38bdf8; font-size: 12px; margin-bottom: 4px;">🎯 Ваше текущее GPS-положение:</div>
          <div style="color: #e2e8f0; font-size: 11px;">Широта: <strong>${latitude.toFixed(6)}°N</strong></div>
          <div style="color: #e2e8f0; font-size: 11px;">Долгота: <strong>${longitude.toFixed(6)}°E</strong></div>
          <div style="color: #94a3b8; font-size: 10px; margin-top: 2px;">Точность позиционирования: ±${Math.round(accuracy)} м</div>
        `;

        const btnRow = document.createElement("div");
        btnRow.style.display = "flex";
        btnRow.style.gap = "6px";
        btnRow.style.marginTop = "8px";

        if (canCreateRecords) {
          const setCoordsBtn = document.createElement("button");
          setCoordsBtn.className = "flex-1 py-1.5 px-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg shadow text-[11px] whitespace-nowrap";
          setCoordsBtn.innerText = "+ Внести замер здесь";
          setCoordsBtn.onclick = () => {
            if (onMapClickCoordinates) {
              onMapClickCoordinates(Number(latitude.toFixed(6)), Number(longitude.toFixed(6)));
            }
            if (onOpenDataEntryWithCoords) {
              onOpenDataEntryWithCoords({ lat: Number(latitude.toFixed(6)), lng: Number(longitude.toFixed(6)) });
            }
            map.closePopup();
          };
          btnRow.appendChild(setCoordsBtn);
        }

        const closeBtn = document.createElement("button");
        closeBtn.className = "py-1.5 px-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-[11px] font-medium border border-slate-700";
        closeBtn.innerText = "✖ Закрыть";
        closeBtn.title = "Закрыть";
        closeBtn.onclick = () => {
          map.closePopup();
        };

        btnRow.appendChild(closeBtn);
        popupContent.appendChild(btnRow);

        marker.bindPopup(popupContent).openPopup();
        gpsMarkerRef.current = marker;
      },
      (err) => {
        setIsLocating(false);
        alert("Не удалось определить координаты: " + err.message + ". Убедитесь, что в браузере предоставлен доступ к геолокации.");
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  // Render Filtered Points (Records & Stations) on Map Layer
  useEffect(() => {
    const map = mapInstanceRef.current;
    const markersGroup = markersGroupRef.current;
    if (!map || !markersGroup) return;

    markersGroup.clearLayers();

    // 1. Filter records by active category and optional station code
    const filteredRecords = records.filter(r => {
      if (activeCategoryFilter !== "ALL" && r.category !== activeCategoryFilter) return false;
      if (selectedStationCode && selectedStationCode !== "ALL" && r.stationCode !== selectedStationCode) return false;
      return true;
    });

    const recordedStationCodes = new Set(records.map(r => r.stationCode));
    const emptyStations = stations.filter(st => {
      if (activeCategoryFilter !== "ALL" && st.category !== activeCategoryFilter) return false;
      if (selectedStationCode && selectedStationCode !== "ALL" && st.code !== selectedStationCode) return false;
      return !recordedStationCodes.has(st.code);
    });

    const markerBounds = L.latLngBounds([]);

    // 2. Draw Record Markers
    filteredRecords.forEach(rec => {
      const isSelected = selectedStationCode === rec.stationCode;
      const catInfo = CATEGORIES.find(c => c.id === rec.category);
      const color = CATEGORY_COLORS[rec.category] || "#10b981";

      const customIcon = L.divIcon({
        className: "custom-map-pin",
        html: `
          <div style="
            background-color: ${color};
            width: ${isSelected ? "38px" : "30px"};
            height: ${isSelected ? "38px" : "30px"};
            border-radius: 50%;
            border: ${isSelected ? "3px solid #f59e0b" : "2px solid #ffffff"};
            box-shadow: ${isSelected ? "0 0 16px #f59e0b, 0 4px 12px rgba(0,0,0,0.8)" : "0 4px 12px rgba(0,0,0,0.7)"};
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: 800;
            font-size: 11px;
            transform: translate(-50%, -50%);
            transition: all 0.2s ease;
          ">
            <span>${rec.stationCode}</span>
          </div>
        `,
        iconSize: [38, 38],
        iconAnchor: [19, 19],
      });

      const marker = L.marker([rec.lat, rec.lng], { icon: customIcon });

      const popupContent = document.createElement("div");
      popupContent.className = "p-2 font-sans text-slate-100 text-xs leading-relaxed max-w-xs";
      popupContent.innerHTML = `
        <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px;">
          <span style="font-family: monospace; font-weight: bold; color: #34d399; background: #064e3b; padding: 2px 6px; border-radius: 4px; border: 1px solid #059669;">
            ${rec.stationCode}
          </span>
          <span style="font-size: 10px; font-weight: bold; text-transform: uppercase; color: #f59e0b;">
            ${catInfo?.name || rec.category}
          </span>
        </div>
        <div style="font-size: 13px; font-weight: bold; color: #ffffff; margin-top: 4px;">
          ${rec.stationName}
        </div>
        <div style="color: #cbd5e1; font-size: 11px; margin-top: 2px;">
          📅 Дата: <strong>${rec.date}</strong> | 👤 ${rec.researcherName}
        </div>
        <div style="color: #94a3b8; font-size: 11px; font-family: monospace; margin-top: 2px;">
          📍 Координаты: ${rec.lat.toFixed(5)}°, ${rec.lng.toFixed(5)}°
        </div>
        ${buildRecordParamsHTML(rec)}
        ${rec.notes ? `<div style="margin-top: 6px; font-size: 11px; color: #cbd5e1; font-style: italic; background: #13261f; padding: 4px; border-radius: 4px; border: 1px solid #1e3a2f;">📝 ${rec.notes}</div>` : ""}
      `;

      const selectBtn = document.createElement("button");
      selectBtn.className = "mt-2.5 w-full py-1.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-bold text-xs shadow transition text-center";
      selectBtn.innerText = isSelected ? "✓ Станция выбрана" : "Выбрать станцию";
      selectBtn.onclick = () => {
        onSelectStation(rec.stationCode);
        map.closePopup();
      };
      popupContent.appendChild(selectBtn);

      marker.bindPopup(popupContent);
      marker.on("click", () => {
        onSelectStation(rec.stationCode);
      });

      markersGroup.addLayer(marker);
      markerBounds.extend([rec.lat, rec.lng]);

      if (isSelected) {
        map.panTo([rec.lat, rec.lng], { animate: true });
      }
    });

    // 3. Draw Station Markers (without records)
    emptyStations.forEach(st => {
      const isSelected = selectedStationCode === st.code;
      const catInfo = CATEGORIES.find(c => c.id === st.category);
      const color = CATEGORY_COLORS[st.category] || "#10b981";

      const customIcon = L.divIcon({
        className: "custom-map-pin",
        html: `
          <div style="
            background-color: ${color};
            width: 28px;
            height: 28px;
            border-radius: 50%;
            border: 2px solid #ffffff;
            box-shadow: 0 4px 10px rgba(0,0,0,0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: bold;
            font-size: 10px;
            transform: translate(-50%, -50%);
          ">
            <span>${st.code}</span>
          </div>
        `,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });

      const marker = L.marker([st.lat, st.lng], { icon: customIcon });
      const popupContent = document.createElement("div");
      popupContent.className = "p-2 font-sans text-slate-100 text-xs leading-relaxed max-w-xs";
      popupContent.innerHTML = `
        <div style="font-size: 10px; font-weight: bold; color: ${color}; text-transform: uppercase;">
          ${catInfo?.name || st.category}
        </div>
        <div style="font-size: 13px; font-weight: bold; color: #ffffff; margin-top: 2px;">
          ${st.code} — ${st.name}
        </div>
        <div style="color: #cbd5e1; font-size: 11px; margin-top: 4px;">
          📍 Координаты: <strong>${st.lat.toFixed(4)}, ${st.lng.toFixed(4)}</strong>
        </div>
        <div style="color: #94a3b8; font-size: 11px; margin-top: 2px;">
          ${st.description}
        </div>
        <div style="margin-top: 6px; padding-top: 6px; border-top: 1px solid #1e3a2f; font-size: 11px; color: #94a3b8; font-style: italic;">
          Показатели: <span style="color: #94a3b8;">нет замера</span>
        </div>
      `;

      marker.bindPopup(popupContent);
      markersGroup.addLayer(marker);
      markerBounds.extend([st.lat, st.lng]);
    });

    // 4. Temporary Click Marker with option to cancel / not save
    if (clickedCoords) {
      if (tempMarkerRef.current) {
        tempMarkerRef.current.remove();
      }

      const tempIcon = L.divIcon({
        className: "temp-click-pin",
        html: `
          <div style="
            background-color: #f59e0b;
            width: 34px;
            height: 34px;
            border-radius: 50%;
            border: 3px solid #ffffff;
            box-shadow: 0 0 20px #f59e0b;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: bold;
            font-size: 16px;
            transform: translate(-50%, -50%);
            animation: pulse 1.5s infinite;
          ">
            +
          </div>
        `,
        iconSize: [34, 34],
        iconAnchor: [17, 17],
      });

      const tempMarker = L.marker([clickedCoords.lat, clickedCoords.lng], { icon: tempIcon }).addTo(map);
      
      const popupContent = document.createElement("div");
      popupContent.className = "p-2.5 text-xs font-sans text-slate-100 min-w-[200px]";
      popupContent.innerHTML = `
        <div style="font-weight: bold; color: #f59e0b; font-size: 12px; margin-bottom: 2px;">📍 Выбрана точка на карте:</div>
        <div style="color: #e2e8f0; font-size: 11px;">Координаты: <strong>${clickedCoords.lat.toFixed(5)}°N, ${clickedCoords.lng.toFixed(5)}°E</strong></div>
        <div style="color: #94a3b8; font-size: 10px; margin-top: 3px; line-height: 1.2;">${canCreateRecords ? 'Нажмите «+ Внести замер» или «✖ Убрать точку»' : 'Точка для географического ориентирования'}</div>
      `;

      const btnRow = document.createElement("div");
      btnRow.style.display = "flex";
      btnRow.style.gap = "6px";
      btnRow.style.marginTop = "8px";

      if (canCreateRecords) {
        const addBtn = document.createElement("button");
        addBtn.className = "flex-1 py-1 px-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg shadow text-[11px] whitespace-nowrap";
        addBtn.innerText = "+ Внести замер";
        addBtn.onclick = () => {
          if (onOpenDataEntryWithCoords) {
            onOpenDataEntryWithCoords(clickedCoords);
          } else if (onMapClickCoordinates) {
            onMapClickCoordinates(clickedCoords.lat, clickedCoords.lng);
          }
        };
        btnRow.appendChild(addBtn);
      }

      const cancelBtn = document.createElement("button");
      cancelBtn.className = "py-1 px-2.5 bg-slate-800 hover:bg-rose-900 text-slate-300 hover:text-rose-200 rounded-lg text-[11px] font-medium border border-slate-700 whitespace-nowrap transition";
      cancelBtn.innerText = "✖ Убрать точку";
      cancelBtn.title = "Не сохранять и убрать маркер";
      cancelBtn.onclick = () => {
        if (onClearClickedCoords) {
          onClearClickedCoords();
        }
        tempMarker.remove();
        tempMarkerRef.current = null;
      };

      btnRow.appendChild(cancelBtn);
      popupContent.appendChild(btnRow);

      tempMarker.bindPopup(popupContent).openPopup();
      tempMarkerRef.current = tempMarker;
    } else if (tempMarkerRef.current) {
      tempMarkerRef.current.remove();
      tempMarkerRef.current = null;
    }

    map.invalidateSize();

  }, [stations, records, selectedStationCode, activeCategoryFilter, clickedCoords, onSelectStation, canCreateRecords]);

  const activeStation = stations.find(s => s.code === selectedStationCode);
  const activeStationCat = CATEGORIES.find(c => c.id === activeStation?.category);
  const activeStationRecords = records.filter(r => r.stationCode === selectedStationCode);

  return (
    <div className="bg-[#0f1d18]/90 border border-emerald-800/60 rounded-3xl shadow-2xl overflow-hidden backdrop-blur-md">
      
      {/* Top Header Bar: Title, GPS locate button, Category Filter Pills */}
      <div className="p-2.5 sm:p-3.5 bg-[#13261f]/95 border-b border-emerald-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        
        {/* Title in single clean line */}
        <div className="flex items-center space-x-2 shrink-0">
          <MapPin className="w-4 h-4 text-emerald-400 shrink-0" />
          <h2 className="text-xs sm:text-sm font-bold text-slate-100 font-serif flex items-center space-x-1.5 whitespace-nowrap truncate">
            <span>ГИС-Карта постов эко-мониторинга</span>
            <span className="text-[9px] sm:text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-600/40 font-mono font-bold shrink-0">
              Esri HD
            </span>
          </h2>
        </div>

        {/* Action Controls: GPS Locate & Category Filter Buttons */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
          
          {/* GPS Locate Button */}
          <button
            onClick={handleLocateUser}
            disabled={isLocating}
            className="px-2.5 py-1 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white rounded-xl text-xs font-bold shadow transition flex items-center space-x-1.5 shrink-0 border border-teal-400/40 active:scale-95"
            title="Определить моё текущее местоположение (GPS)"
          >
            {isLocating ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-300" />
            ) : (
              <LocateFixed className="w-3.5 h-3.5 text-amber-300" />
            )}
            <span className="text-[11px] font-bold whitespace-nowrap">Моё положение</span>
          </button>

          {/* "Все" Filter Button */}
          <button
            onClick={() => handleCategoryChange("ALL")}
            className={`px-2.5 py-1 rounded-xl text-[10px] sm:text-xs font-medium transition whitespace-nowrap shrink-0 flex items-center space-x-1 ${
              activeCategoryFilter === "ALL"
                ? "bg-emerald-600 text-white shadow font-bold border border-emerald-400/60"
                : "bg-slate-800/90 text-slate-300 hover:bg-slate-700 border border-slate-700"
            }`}
          >
            <span>Все</span>
            <span className="font-mono text-[10px] opacity-80">({records.length})</span>
          </button>

          {/* Category Filter Buttons */}
          {CATEGORIES.map(cat => {
            const catRecordsCount = records.filter(r => r.category === cat.id).length;
            const isActive = activeCategoryFilter === cat.id;

            return (
              <button
                key={cat.id}
                onClick={() => handleCategoryChange(cat.id as ResearchCategory)}
                className={`px-2 py-1 rounded-xl text-[10px] sm:text-xs font-medium transition whitespace-nowrap flex items-center space-x-1.5 shrink-0 ${
                  isActive
                    ? "bg-slate-100 text-slate-900 font-bold shadow-md ring-2 ring-emerald-400"
                    : "bg-slate-800/90 text-slate-300 hover:bg-slate-700 border border-slate-700"
                }`}
                title={`${cat.name} (${cat.prefix}): ${catRecordsCount} замеров`}
              >
                <span
                  className="w-2 h-2 rounded-full inline-block shrink-0"
                  style={{ backgroundColor: CATEGORY_COLORS[cat.id as ResearchCategory] }}
                />
                <span>{cat.prefix}</span>
                <span className="text-[10px] opacity-80">({catRecordsCount})</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* TWO-COLUMN LAYOUT: Left = Legend & Category Deciphering, Right = GIS Map */}
      <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-emerald-800/60 items-stretch">
        
        {/* LEFT COLUMN: Map Legend & Category Explanations */}
        <div className="lg:col-span-4 p-3.5 sm:p-4 bg-[#0d1c16]/95 flex flex-col justify-between space-y-3.5 overflow-y-auto max-h-[480px] sm:max-h-[500px]">
          
          <div className="space-y-2.5">
            <div className="flex items-center justify-between border-b border-emerald-800/60 pb-2">
              <div className="flex items-center space-x-1.5 text-xs font-bold text-emerald-400 font-serif">
                <Filter className="w-3.5 h-3.5 text-emerald-400" />
                <span>Легенда категорий и фильтр</span>
              </div>
              {activeCategoryFilter !== "ALL" && (
                <button
                  onClick={() => handleCategoryChange("ALL")}
                  className="text-[10px] font-bold text-amber-300 hover:text-amber-200 flex items-center space-x-0.5 bg-amber-950/70 px-1.5 py-0.5 rounded border border-amber-700/50 transition"
                  title="Сбросить фильтр и показать все маркеры"
                >
                  <RotateCcw className="w-2.5 h-2.5" />
                  <span>Показать все</span>
                </button>
              )}
            </div>

            <p className="text-[11px] text-slate-300 leading-tight">
              Нажмите на категорию ниже, чтобы отфильтровать точки на карте:
            </p>

            {/* Interactive Category List */}
            <div className="space-y-1.5">
              {CATEGORIES.map(cat => {
                const count = records.filter(r => r.category === cat.id).length;
                const isSelected = activeCategoryFilter === cat.id;
                const color = CATEGORY_COLORS[cat.id as ResearchCategory] || "#10b981";

                return (
                  <div
                    key={cat.id}
                    onClick={() => handleCategoryChange(cat.id as ResearchCategory)}
                    className={`p-2 rounded-xl border text-xs cursor-pointer transition-all flex items-start justify-between gap-2 ${
                      isSelected
                        ? "bg-[#163327] border-emerald-400 text-white shadow-md ring-1 ring-emerald-400"
                        : "bg-[#11241d]/70 hover:bg-[#142b22] border-emerald-900/60 text-slate-300 hover:border-emerald-700"
                    }`}
                  >
                    <div className="flex items-start space-x-2 min-w-0">
                      <div
                        className="w-3 h-3 rounded-full shrink-0 mt-0.5 border border-white/60 shadow-sm"
                        style={{ backgroundColor: color }}
                      />
                      <div className="min-w-0">
                        <div className="flex items-center space-x-1.5">
                          <span className="font-mono font-bold text-[10px] text-amber-300 bg-emerald-950 px-1 rounded border border-emerald-800">
                            {cat.prefix}
                          </span>
                          <span className="font-bold text-[11px] text-slate-100 truncate">
                            {cat.name}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-400 leading-tight line-clamp-1 mt-0.5">
                          {cat.description}
                        </p>
                      </div>
                    </div>

                    <div className="shrink-0 text-right">
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                        isSelected 
                          ? "bg-emerald-500 text-slate-950 font-mono" 
                          : "bg-slate-800 text-slate-300 font-mono"
                      }`}>
                        {count}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Conventional Symbols / Условные обозначения */}
          <div className="pt-2 border-t border-emerald-800/60 space-y-1.5 text-[10px] text-slate-400">
            <div className="font-bold text-slate-200 uppercase tracking-wider text-[9px] flex items-center space-x-1">
              <Info className="w-3 h-3 text-emerald-400" />
              <span>Условные обозначения:</span>
            </div>
            <div className="grid grid-cols-2 gap-1.5 pt-0.5">
              <div className="flex items-center space-x-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500 border border-white shrink-0" />
                <span className="truncate">Точка с замером</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-sky-500 border border-white shadow-sm shrink-0">🎯</span>
                <span className="truncate">GPS-позиция</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 border border-white shrink-0" />
                <span className="truncate">Выбранная точка</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 border-2 border-amber-400 shrink-0" />
                <span className="truncate">Активный пост</span>
              </div>
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: Interactive GIS Map Container (Strictly bounded height) */}
        <div className="lg:col-span-8 relative">
          <div
            ref={mapContainerRef}
            className="w-full h-[450px] sm:h-[480px] lg:h-[500px] z-10 bg-[#09120e]"
          />

          {/* Temporary Point Floating Dismiss Bar */}
          {clickedCoords && (
            <div className="absolute top-3 left-3 right-3 sm:right-auto z-20 bg-[#0d1c16]/95 backdrop-blur-md border border-amber-500/80 rounded-2xl p-2 sm:p-2.5 shadow-2xl flex items-center justify-between gap-2.5 animate-fadeIn">
              <div className="flex items-center space-x-2 text-xs">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping shrink-0" />
                <div className="text-slate-100">
                  <span className="text-amber-300 font-bold text-[11px] sm:text-xs">Выбрана точка: </span>
                  <span className="font-mono text-[11px]">{clickedCoords.lat.toFixed(4)}°, {clickedCoords.lng.toFixed(4)}°</span>
                </div>
              </div>
              <div className="flex items-center space-x-1.5 shrink-0">
                {canCreateRecords && (
                  <button
                    onClick={() => {
                      if (onOpenDataEntryWithCoords) {
                        onOpenDataEntryWithCoords(clickedCoords);
                      } else if (onMapClickCoordinates) {
                        onMapClickCoordinates(clickedCoords.lat, clickedCoords.lng);
                      }
                    }}
                    className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[11px] font-bold shadow flex items-center space-x-1 transition"
                  >
                    <Plus className="w-3 h-3" />
                    <span>+ Замер</span>
                  </button>
                )}
                {onClearClickedCoords && (
                  <button
                    onClick={onClearClickedCoords}
                    className="px-2 py-1 bg-slate-800 hover:bg-rose-950 hover:border-rose-700 text-slate-300 hover:text-rose-200 rounded-lg text-[11px] font-medium border border-slate-700 transition"
                    title="Убрать точку (не сохранять)"
                  >
                    ✖ Убрать
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Selected Station Card Banner at Bottom of Map */}
          {activeStation && (
            <div className="absolute bottom-3 left-3 right-3 z-20 bg-[#0d1c16]/95 backdrop-blur-md border border-emerald-500/60 rounded-2xl p-3 shadow-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-start space-x-3">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-white text-xs shrink-0 shadow-md border border-white/20"
                  style={{ backgroundColor: CATEGORY_COLORS[activeStation.category] }}
                >
                  {activeStation.code}
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-mono font-bold text-emerald-400 text-xs sm:text-sm">
                      {activeStation.code}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                      {activeStationCat?.name}
                    </span>
                  </div>
                  <h3 className="text-xs sm:text-sm font-bold text-white font-serif mt-0.5">
                    {activeStation.name}
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Координаты: {activeStation.lat.toFixed(5)}°N, {activeStation.lng.toFixed(5)}°E | Записей: {activeStationRecords.length}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
                <button
                  onClick={() => onSelectStation("ALL")}
                  className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium border border-slate-700 transition"
                >
                  Сбросить
                </button>

                {canCreateRecords && onOpenDataEntryForStation && (
                  <button
                    onClick={() => onOpenDataEntryForStation(activeStation)}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow transition flex items-center space-x-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Внести замер</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

      </div>

    </div>
  );
};
