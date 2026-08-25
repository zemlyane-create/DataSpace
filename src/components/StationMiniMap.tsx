import React, { useEffect, useRef, useState } from "react";
import L from "leaflet";
import { ZoomIn, ZoomOut, Layers, MapPin } from "lucide-react";

interface StationMiniMapProps {
  lat?: number;
  lng?: number;
  stationName: string;
  stationCode: string;
}

export const StationMiniMap: React.FC<StationMiniMapProps> = ({
  lat = 54.9123,
  lng = 69.1234,
  stationName,
  stationCode
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const [mapError, setMapError] = useState(false);
  const [isSatellite, setIsSatellite] = useState(true);

  const validLat = typeof lat === "number" && !isNaN(lat) ? lat : 54.9123;
  const validLng = typeof lng === "number" && !isNaN(lng) ? lng : 69.1234;

  // Esri World Imagery (Satellite) & CartoDB Voyager (Street)
  const SATELLITE_URL = "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";
  const STREET_URL = "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png";

  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (mapInstanceRef.current) {
      try {
        mapInstanceRef.current.remove();
      } catch {
        // ignore
      }
      mapInstanceRef.current = null;
    }

    if ((mapContainerRef.current as any)._leaflet_id) {
      delete (mapContainerRef.current as any)._leaflet_id;
    }

    try {
      const map = L.map(mapContainerRef.current, {
        center: [validLat, validLng],
        zoom: 11,
        zoomControl: false,
        attributionControl: false,
        dragging: true,
        touchZoom: true,
        scrollWheelZoom: true,
        doubleClickZoom: true,
        boxZoom: false,
        keyboard: false
      });

      const currentUrl = isSatellite ? SATELLITE_URL : STREET_URL;
      L.tileLayer(currentUrl, {
        maxZoom: 19,
        crossOrigin: "anonymous",
        subdomains: isSatellite ? [] : "abcd"
      }).addTo(map);

      // If satellite, also add transparent boundary & place labels overlay
      if (isSatellite) {
        L.tileLayer("https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}", {
          maxZoom: 19,
          crossOrigin: "anonymous",
          opacity: 0.9
        }).addTo(map);
      }

      // Metric scale control in km
      L.control.scale({
        imperial: false,
        metric: true,
        position: "bottomleft"
      }).addTo(map);

      // Pixel-precise Station Center Marker Pin touching exact coordinates at (16, 38)
      const pinIcon = L.divIcon({
        className: "custom-station-pin",
        html: `
          <div style="position: relative; width: 32px; height: 38px; display: flex; flex-direction: column; align-items: center; filter: drop-shadow(0 3px 6px rgba(0,0,0,0.7));">
            <svg width="32" height="38" viewBox="0 0 32 38" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M16 0C7.16344 0 0 7.16344 0 16C0 26.5 16 38 16 38C16 38 32 26.5 32 16C32 7.16344 24.8366 0 16 0Z" fill="#dc2626"/>
              <circle cx="16" cy="15" r="7" fill="#ffffff"/>
              <circle cx="16" cy="15" r="4.5" fill="#dc2626"/>
            </svg>
          </div>
        `,
        iconSize: [32, 38],
        iconAnchor: [16, 38]
      });

      L.marker([validLat, validLng], { icon: pinIcon }).addTo(map);

      mapInstanceRef.current = map;

      // Invalidate map size multiple times to ensure full tile rendering
      const t1 = setTimeout(() => map.invalidateSize(), 50);
      const t2 = setTimeout(() => map.invalidateSize(), 200);
      const t3 = setTimeout(() => map.invalidateSize(), 500);

      // ResizeObserver
      let ro: ResizeObserver | null = null;
      if (typeof ResizeObserver !== "undefined" && mapContainerRef.current) {
        ro = new ResizeObserver(() => {
          if (mapInstanceRef.current) {
            mapInstanceRef.current.invalidateSize();
          }
        });
        ro.observe(mapContainerRef.current);
      }

      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
        clearTimeout(t3);
        if (ro) ro.disconnect();
        if (mapInstanceRef.current) {
          try {
            mapInstanceRef.current.remove();
          } catch {
            // ignore
          }
          mapInstanceRef.current = null;
        }
      };
    } catch (err) {
      console.warn("StationMiniMap initialization notice:", err);
      setMapError(true);
    }
  }, [validLat, validLng, stationName, stationCode, isSatellite]);

  const handleZoomIn = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (mapInstanceRef.current) {
      mapInstanceRef.current.zoomIn();
    }
  };

  const handleZoomOut = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (mapInstanceRef.current) {
      mapInstanceRef.current.zoomOut();
    }
  };

  const handleToggleLayer = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsSatellite(prev => !prev);
  };

  if (mapError) {
    return (
      <div className="w-full h-full min-h-[170px] relative rounded-xl overflow-hidden border border-[#ded5c2] p-4 bg-[#f0ebd9] flex flex-col justify-center items-center text-center">
        <div className="text-2xl mb-1">🗺️</div>
        <div className="text-xs font-bold text-[#1b3824]">Географическая привязка стационара</div>
        <div className="text-[11px] font-mono text-[#5c5346] mt-1">
          {stationCode} • {validLat.toFixed(5)}°N, {validLng.toFixed(5)}°E
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full min-h-[220px] relative rounded-xl overflow-hidden border border-[#ded5c2] shadow-inner bg-slate-900 group">
      <div ref={mapContainerRef} className="w-full h-full min-h-[220px] z-0" />
      
      {/* Top Station Badge */}
      <div className="absolute top-2 left-2 z-[400] bg-slate-950/85 backdrop-blur-xs text-white px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold border border-white/20 shadow-md flex items-center space-x-1.5 pointer-events-none">
        <MapPin className="w-3.5 h-3.5 text-rose-400 shrink-0" />
        <span>{stationCode}</span>
        <span className="text-slate-400">•</span>
        <span className="text-emerald-300 font-sans truncate max-w-[130px]">{stationName}</span>
      </div>

      {/* Interactive Controls (Zoom In, Zoom Out, Satellite Switcher) */}
      <div className="absolute top-2 right-2 z-[400] flex flex-col space-y-1.5 no-export-pdf">
        <button
          type="button"
          onClick={handleZoomIn}
          className="p-1.5 bg-slate-900/90 hover:bg-slate-800 text-white rounded-lg border border-white/25 shadow-md transition text-xs flex items-center justify-center cursor-pointer active:scale-95"
          title="Приблизить карту (+)"
        >
          <ZoomIn className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={handleZoomOut}
          className="p-1.5 bg-slate-900/90 hover:bg-slate-800 text-white rounded-lg border border-white/25 shadow-md transition text-xs flex items-center justify-center cursor-pointer active:scale-95"
          title="Отдалить карту (-)"
        >
          <ZoomOut className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={handleToggleLayer}
          className={`p-1.5 rounded-lg border shadow-md transition text-xs flex items-center justify-center cursor-pointer active:scale-95 ${
            isSatellite 
              ? "bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-300" 
              : "bg-slate-900/90 hover:bg-slate-800 text-slate-200 border-white/25"
          }`}
          title={isSatellite ? "Переключить на схему" : "Переключить на спутник"}
        >
          <Layers className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Attribution & Layer indicator */}
      <div className="absolute bottom-1 right-2 z-[400] text-[9px] text-white/90 bg-slate-900/80 px-1.5 py-0.5 rounded font-sans border border-white/10 pointer-events-none">
        {isSatellite ? "🛰️ Спутниковая карта (Esri)" : "🗺️ Схема (CartoDB)"}
      </div>
    </div>
  );
};
