import React, { useEffect } from 'react';
import { MapContainer, TileLayer, CircleMarker, Tooltip, Popup, useMap } from 'react-leaflet';
import { useSimulation } from '../../hooks/useSimulation';
import { getVariableMeta } from '../../utils/formatters';
import { Maximize2, Compass } from 'lucide-react';

// Controller to smoothly pan to selected station or reset view
const MapController = ({ selectedRegionData }) => {
  const map = useMap();

  useEffect(() => {
    if (selectedRegionData?.lat && selectedRegionData?.lng) {
      map.flyTo([selectedRegionData.lat, selectedRegionData.lng], Math.max(map.getZoom(), 6), {
        duration: 0.6
      });
    }
  }, [selectedRegionData?.id, map]);

  return null;
};

// Reset camera button inside map container
const ResetButton = ({ defaultCenter, defaultZoom }) => {
  const map = useMap();
  return (
    <button
      onClick={() => map.flyTo(defaultCenter, defaultZoom, { duration: 0.6 })}
      className="leaflet-bar bg-white hover:bg-slate-50 text-slate-700 px-2.5 py-1.5 rounded-md shadow-md text-xs font-semibold flex items-center gap-1.5 border border-slate-200 transition"
      title="Reset Map to All-India View"
    >
      <Maximize2 className="w-3.5 h-3.5 text-sky-600" />
      <span>Reset View</span>
    </button>
  );
};

export const IndiaMap = () => {
  const { 
    currentDayData, 
    selectedVariable, 
    selectedRegionId, 
    setSelectedRegionId,
    selectedRegionData 
  } = useSimulation();

  const meta = getVariableMeta(selectedVariable);

  // India geographic center & default zoom
  const defaultCenter = [22.8, 80.5];
  const defaultZoom = 5;

  // Determine marker color and radius dynamically based on current layer
  const getMarkerStyle = (val) => {
    let fillColor = '#0284c7';
    let radius = 10;

    switch (selectedVariable) {
      case 'temperature':
        if (val < 18) fillColor = '#06b6d4'; // cold
        else if (val < 26) fillColor = '#10b981'; // temperate
        else if (val < 32) fillColor = '#f59e0b'; // warm
        else if (val < 36) fillColor = '#ea580c'; // hot
        else fillColor = '#dc2626'; // extreme
        radius = Math.max(8, Math.min(18, (val - 10) * 0.5 + 8));
        break;

      case 'rainfall':
        if (val < 2) fillColor = '#94a3b8';
        else if (val < 10) fillColor = '#38bdf8';
        else if (val < 25) fillColor = '#0284c7';
        else fillColor = '#1e3a8a';
        radius = Math.max(8, Math.min(20, Math.sqrt(val) * 3 + 6));
        break;

      case 'humidity':
        if (val < 45) fillColor = '#f59e0b'; // dry
        else if (val < 70) fillColor = '#0d9488'; // comfortable
        else fillColor = '#0891b2'; // humid
        radius = Math.max(8, Math.min(16, val * 0.16 + 4));
        break;

      case 'windSpeed':
        if (val < 12) fillColor = '#94a3b8';
        else if (val < 20) fillColor = '#6366f1';
        else fillColor = '#4338ca';
        radius = Math.max(8, Math.min(18, val * 0.5 + 6));
        break;

      case 'pressure':
        if (val < 1005) fillColor = '#d946ef'; // low
        else if (val < 1013) fillColor = '#8b5cf6'; // normal
        else fillColor = '#6b21a8'; // high
        radius = 10;
        break;

      default:
        fillColor = meta.color;
    }

    return { fillColor, radius };
  };

  const regionalPoints = currentDayData?.regionalData || [];

  return (
    <div className="relative w-full h-[520px] rounded-xl overflow-hidden border border-slate-200 shadow-sm bg-slate-100">
      <MapContainer
        center={defaultCenter}
        zoom={defaultZoom}
        minZoom={4}
        maxZoom={9}
        scrollWheelZoom={true}
        className="w-full h-full z-10"
      >
        <MapController selectedRegionData={selectedRegionData} />

        {/* Clean, high-performance light geospatial basemap */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        />

        {/* Stations / Regional Nodes */}
        {regionalPoints.map((reg) => {
          const val = reg[selectedVariable];
          const isSelected = reg.id === selectedRegionId;
          const { fillColor, radius } = getMarkerStyle(val);

          return (
            <CircleMarker
              key={`${reg.id}-${selectedVariable}-${isSelected}-${val}`}
              center={[reg.lat, reg.lng]}
              radius={isSelected ? radius + 5 : radius}
              pathOptions={{
                color: isSelected ? '#0f172a' : '#ffffff',
                weight: isSelected ? 3.5 : 1.5,
                fillColor: fillColor,
                fillOpacity: isSelected ? 0.95 : 0.85,
              }}
              eventHandlers={{
                click: () => {
                  setSelectedRegionId(reg.id);
                },
              }}
            >
              <Tooltip direction="top" offset={[0, -10]} opacity={0.95}>
                <div className="p-1 font-sans text-xs">
                  <div className="font-bold text-slate-900">{reg.name}</div>
                  <div className="text-[11px] text-slate-500">{reg.state}</div>
                  <div className="mt-1 font-mono font-semibold" style={{ color: fillColor }}>
                    {meta.shortName}: {val} {meta.unit}
                  </div>
                </div>
              </Tooltip>

              <Popup>
                <div className="p-3 text-xs font-sans min-w-[190px]">
                  <div className="font-bold text-slate-900 text-sm">{reg.name}</div>
                  <div className="text-[11px] text-slate-500 mb-2">{reg.zone}</div>
                  <div className="space-y-1 font-mono border-t border-slate-100 pt-1.5 text-slate-700">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Temp:</span>
                      <span className="font-semibold">{reg.temperature}°C</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Rainfall:</span>
                      <span className="font-semibold">{reg.rainfall} mm</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Humidity:</span>
                      <span className="font-semibold">{reg.humidity}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Wind:</span>
                      <span className="font-semibold">{reg.windSpeed} km/h</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Pressure:</span>
                      <span className="font-semibold">{reg.pressure} hPa</span>
                    </div>
                  </div>
                </div>
              </Popup>
            </CircleMarker>
          );
        })}
      </MapContainer>

      {/* Floating Map Legend */}
      <div className="absolute bottom-3 left-3 z-20 bg-white/95 backdrop-blur-xs p-3 rounded-lg border border-slate-200 shadow-md text-xs pointer-events-auto">
        <div className="font-semibold text-slate-800 flex items-center justify-between gap-3 mb-1.5">
          <span>{meta.name}</span>
          <span className="font-mono text-[10px] text-slate-500">({meta.unit})</span>
        </div>
        <div className="flex items-center space-x-1.5 text-[10px] text-slate-600 font-mono">
          <span>Low</span>
          <div className="w-24 h-2 rounded-full bg-gradient-to-r from-sky-400 via-emerald-400 to-rose-500"></div>
          <span>High</span>
        </div>
      </div>

      {/* Coordinate & Reset View Button */}
      <div className="absolute top-3 right-3 z-20 flex items-center gap-2 pointer-events-auto">
        <div className="bg-white/90 backdrop-blur-xs px-2.5 py-1.5 rounded-md border border-slate-200 text-[10px] font-mono text-slate-600 shadow-xs">
          EPSG:4326 • India Subcontinent
        </div>
      </div>
    </div>
  );
};
