import React from 'react';
import { 
  Thermometer, 
  CloudRain, 
  Droplets, 
  Wind, 
  Gauge, 
  Layers, 
  Eye, 
  MapPin 
} from 'lucide-react';
import { useSimulation } from '../../hooks/useSimulation';

export const MapControls = () => {
  const { 
    selectedVariable, 
    setSelectedVariable, 
    selectedDayIndex, 
    setSelectedDayIndex,
    activeSimulation 
  } = useSimulation();

  const variables = [
    { id: 'temperature', label: 'Temperature', icon: Thermometer, unit: '°C', activeColor: 'text-orange-600 bg-orange-50 border-orange-200' },
    { id: 'rainfall', label: 'Rainfall', icon: CloudRain, unit: 'mm', activeColor: 'text-sky-600 bg-sky-50 border-sky-200' },
    { id: 'humidity', label: 'Humidity', icon: Droplets, unit: '%', activeColor: 'text-teal-600 bg-teal-50 border-teal-200' },
    { id: 'windSpeed', label: 'Wind Speed', icon: Wind, unit: 'km/h', activeColor: 'text-indigo-600 bg-indigo-50 border-indigo-200' },
    { id: 'pressure', label: 'Pressure', icon: Gauge, unit: 'hPa', activeColor: 'text-purple-600 bg-purple-50 border-purple-200' },
  ];

  return (
    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-4">
      {/* Top: Layer Variable Tabs */}
      <div>
        <div className="flex items-center space-x-2 text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2.5">
          <Layers className="w-3.5 h-3.5 text-cyan-600" />
          <span>Active Geospatial Climate Layer</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {variables.map((v) => {
            const Icon = v.icon;
            const isSelected = selectedVariable === v.id;
            return (
              <button
                key={v.id}
                onClick={() => setSelectedVariable(v.id)}
                className={`flex items-center justify-center space-x-2 px-3 py-2 rounded-lg text-xs font-medium border transition-all ${
                  isSelected
                    ? `${v.activeColor} shadow-xs font-semibold ring-1 ring-offset-1`
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="truncate">{v.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Bottom: Day Timeline Quick Scrub */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
        <div className="text-xs text-slate-600 flex items-center space-x-1.5">
          <span className="font-semibold text-slate-800">Projection Day:</span>
          <span>Day {selectedDayIndex + 1} of 10 ({activeSimulation?.days?.[selectedDayIndex]?.dateString})</span>
        </div>

        <div className="flex items-center space-x-1">
          {activeSimulation?.days?.map((d, idx) => (
            <button
              key={d.dayNumber}
              onClick={() => setSelectedDayIndex(idx)}
              className={`px-2 py-1 rounded text-xs font-mono transition ${
                selectedDayIndex === idx
                  ? 'bg-sky-600 text-white font-bold'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              D{d.dayNumber}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
