import React from 'react';
import { 
  MapPin, 
  Thermometer, 
  CloudRain, 
  Droplets, 
  Wind, 
  Gauge, 
  Mountain, 
  Compass, 
  TrendingUp, 
  TrendingDown, 
  Minus,
  Info
} from 'lucide-react';
import { useSimulation } from '../../hooks/useSimulation';
import { formatTemperature, formatRainfall, formatHumidity, formatWindSpeed, formatPressure } from '../../utils/formatters';

export const LocationPanel = () => {
  const { 
    selectedRegionData, 
    baselineDayData, 
    selectedDayIndex,
    activeSimulation,
    setSelectedRegionId,
    regions 
  } = useSimulation();

  if (!selectedRegionData) {
    return (
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm text-center text-xs text-slate-500">
        Select a monitoring station on the map to inspect micro-climatic readings.
      </div>
    );
  }

  // Get matching baseline station data for delta calculation
  const baselineStation = baselineDayData?.regionalData?.find(r => r.id === selectedRegionData.id);

  const getDeltaBadge = (current, baseline, unit) => {
    if (baseline === undefined || baseline === null) return null;
    const diff = current - baseline;
    const isZero = Math.abs(diff) < 0.05;
    return (
      <span className={`inline-flex items-center text-[10px] font-mono px-1.5 py-0.5 rounded font-semibold ${
        isZero ? 'bg-slate-100 text-slate-600' :
        diff > 0 ? 'bg-orange-50 text-orange-700 border border-orange-200' :
        'bg-blue-50 text-blue-700 border border-blue-200'
      }`}>
        {diff > 0 ? '+' : ''}{diff.toFixed(1)} {unit}
      </span>
    );
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 lg:p-5 space-y-4">
      {/* Header */}
      <div className="border-b border-slate-100 pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-1.5 text-xs text-sky-700 font-semibold uppercase tracking-wider">
            <MapPin className="w-4 h-4 text-sky-600" />
            <span>Station Telemetry & Projection</span>
          </div>
          {activeSimulation.isDemo && (
            <span className="text-[9px] font-mono bg-slate-100 text-slate-700 font-semibold px-1.5 py-0.5 rounded border border-slate-200">
              DEMO DATA
            </span>
          )}
        </div>

        <h3 className="text-lg font-bold text-slate-900 mt-1">
          {selectedRegionData.name}
        </h3>
        <p className="text-xs text-slate-700 font-medium">
          {selectedRegionData.state} • {selectedRegionData.zone}
        </p>

        <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-slate-700">
          <span className="inline-flex items-center gap-1 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
            <Mountain className="w-3 h-3 text-slate-600" />
            {selectedRegionData.elevation || 50}m AMSL
          </span>
          <span className="inline-flex items-center gap-1 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
            <Compass className="w-3 h-3 text-slate-600" />
            {selectedRegionData.lat.toFixed(2)}°N, {selectedRegionData.lng.toFixed(2)}°E
          </span>
        </div>
      </div>

      {/* Grid of 5 Weather Variables */}
      <div className="space-y-2.5">
        {/* Temperature */}
        <div className="flex items-center justify-between p-2.5 rounded-lg bg-orange-50/60 border border-orange-100">
          <div className="flex items-center space-x-2.5">
            <div className="w-7 h-7 rounded-md bg-orange-100 text-orange-600 flex items-center justify-center">
              <Thermometer className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-semibold text-slate-700 block">Temperature</span>
              <span className="text-[11px] text-slate-600">Surface Air</span>
            </div>
          </div>
          <div className="text-right">
            <span className="text-sm font-bold font-mono text-slate-900">
              {formatTemperature(selectedRegionData.temperature)}
            </span>
            <div className="mt-0.5">
              {getDeltaBadge(selectedRegionData.temperature, baselineStation?.temperature, '°C')}
            </div>
          </div>
        </div>

        {/* Rainfall */}
        <div className="flex items-center justify-between p-2.5 rounded-lg bg-sky-50/60 border border-sky-100">
          <div className="flex items-center space-x-2.5">
            <div className="w-7 h-7 rounded-md bg-sky-100 text-sky-600 flex items-center justify-center">
              <CloudRain className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-semibold text-slate-700 block">Rainfall</span>
              <span className="text-[11px] text-slate-600">Daily Accumulated</span>
            </div>
          </div>
          <div className="text-right">
            <span className="text-sm font-bold font-mono text-slate-900">
              {formatRainfall(selectedRegionData.rainfall)}
            </span>
            <div className="mt-0.5">
              {getDeltaBadge(selectedRegionData.rainfall, baselineStation?.rainfall, 'mm')}
            </div>
          </div>
        </div>

        {/* Humidity */}
        <div className="flex items-center justify-between p-2.5 rounded-lg bg-teal-50/60 border border-teal-100">
          <div className="flex items-center space-x-2.5">
            <div className="w-7 h-7 rounded-md bg-teal-100 text-teal-600 flex items-center justify-center">
              <Droplets className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-semibold text-slate-700 block">Relative Humidity</span>
              <span className="text-[11px] text-slate-600">Boundary Layer</span>
            </div>
          </div>
          <div className="text-right">
            <span className="text-sm font-bold font-mono text-slate-900">
              {formatHumidity(selectedRegionData.humidity)}
            </span>
            <div className="mt-0.5">
              {getDeltaBadge(selectedRegionData.humidity, baselineStation?.humidity, '%')}
            </div>
          </div>
        </div>

        {/* Wind Speed */}
        <div className="flex items-center justify-between p-2.5 rounded-lg bg-indigo-50/60 border border-indigo-100">
          <div className="flex items-center space-x-2.5">
            <div className="w-7 h-7 rounded-md bg-indigo-100 text-indigo-600 flex items-center justify-center">
              <Wind className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-semibold text-slate-700 block">Wind Velocity</span>
              <span className="text-[11px] text-slate-600">10m Surface Speed</span>
            </div>
          </div>
          <div className="text-right">
            <span className="text-sm font-bold font-mono text-slate-900">
              {formatWindSpeed(selectedRegionData.windSpeed)}
            </span>
            <div className="mt-0.5">
              {getDeltaBadge(selectedRegionData.windSpeed, baselineStation?.windSpeed, 'km/h')}
            </div>
          </div>
        </div>

        {/* Atmospheric Pressure */}
        <div className="flex items-center justify-between p-2.5 rounded-lg bg-purple-50/60 border border-purple-100">
          <div className="flex items-center space-x-2.5">
            <div className="w-7 h-7 rounded-md bg-purple-100 text-purple-600 flex items-center justify-center">
              <Gauge className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-semibold text-slate-700 block">Barometric Pressure</span>
              <span className="text-[11px] text-slate-600">Sea Level Corrected</span>
            </div>
          </div>
          <div className="text-right">
            <span className="text-sm font-bold font-mono text-slate-900">
              {formatPressure(selectedRegionData.pressure)}
            </span>
            <div className="mt-0.5">
              {getDeltaBadge(selectedRegionData.pressure, baselineStation?.pressure, 'hPa')}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Station Switcher */}
      <div className="pt-2 border-t border-slate-100">
        <label className="text-[11px] font-semibold text-slate-700 block mb-1.5 uppercase">
          Switch Station:
        </label>
        <select
          value={selectedRegionData.id}
          onChange={(e) => setSelectedRegionId(e.target.value)}
          className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-800 font-medium focus:ring-1 focus:ring-sky-500 focus:outline-none"
        >
          {regions.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name} ({r.state})
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};
