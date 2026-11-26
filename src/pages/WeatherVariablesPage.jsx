import React, { useState } from 'react';
import { 
  Thermometer, 
  CloudRain, 
  Droplets, 
  Wind, 
  Gauge, 
  TrendingUp, 
  BarChart3, 
  Info,
  ArrowUpDown
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Cell,
  LineChart,
  Line
} from 'recharts';
import { useSimulation } from '../hooks/useSimulation';
import { formatTemperature, formatRainfall, formatHumidity, formatWindSpeed, formatPressure } from '../utils/formatters';

export const WeatherVariablesPage = () => {
  const { currentDayData, selectedDayIndex, activeSimulation } = useSimulation();
  const [activeVariableTab, setActiveVariableTab] = useState('temperature');

  const regionalData = currentDayData?.regionalData || [];

  // Compute statistical aggregations for the current day
  const getStats = (key) => {
    if (!regionalData.length) return { min: 0, max: 0, avg: 0, spread: 0 };
    const values = regionalData.map(r => r[key]);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const avg = values.reduce((s, v) => s + v, 0) / values.length;
    return {
      min,
      max,
      avg: Number(avg.toFixed(1)),
      spread: Number((max - min).toFixed(1))
    };
  };

  const tempStats = getStats('temperature');
  const rainStats = getStats('rainfall');
  const humStats = getStats('humidity');
  const windStats = getStats('windSpeed');
  const pressStats = getStats('pressure');

  // Chart data sorted by regional stations
  const chartData = regionalData.map(r => ({
    name: r.name.split('(')[0].trim(),
    state: r.state,
    zone: r.zone,
    temperature: r.temperature,
    rainfall: r.rainfall,
    humidity: r.humidity,
    windSpeed: r.windSpeed,
    pressure: r.pressure,
  }));

  const tabs = [
    { id: 'temperature', label: 'Surface Temperature', icon: Thermometer, unit: '°C', color: '#ea580c', stats: tempStats },
    { id: 'rainfall', label: 'Precipitation', icon: CloudRain, unit: 'mm', color: '#0284c7', stats: rainStats },
    { id: 'humidity', label: 'Relative Humidity', icon: Droplets, unit: '%', color: '#0d9488', stats: humStats },
    { id: 'windSpeed', label: 'Wind Velocity', icon: Wind, unit: 'km/h', color: '#6366f1', stats: windStats },
    { id: 'pressure', label: 'Atmospheric Pressure', icon: Gauge, unit: 'hPa', color: '#8b5cf6', stats: pressStats },
  ];

  const currentTabObj = tabs.find(t => t.id === activeVariableTab) || tabs[0];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900">
            Synoptic Meteorological Variables
          </h2>
          <p className="text-xs text-slate-600 mt-1">
            Regional distribution, statistical extremes, and parameter spreads across India for Day {selectedDayIndex + 1}.
          </p>
        </div>
      </div>

      {/* Variable Switcher Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isSelected = activeVariableTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveVariableTab(tab.id)}
              className={`p-3.5 rounded-xl border text-left transition-all ${
                isSelected
                  ? 'bg-white border-slate-900 shadow-sm ring-1 ring-slate-900'
                  : 'bg-white border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-700 truncate">{tab.label}</span>
                <Icon className="w-4 h-4" style={{ color: tab.color }} />
              </div>
              <div className="mt-2 text-lg font-bold font-mono text-slate-900">
                {tab.stats.avg} <span className="text-xs font-normal text-slate-500">{tab.unit}</span>
              </div>
              <div className="mt-1 text-[11px] text-slate-500 flex justify-between">
                <span>Range:</span>
                <span className="font-mono">{tab.stats.min} – {tab.stats.max}</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Main Analysis Card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <currentTabObj.icon className="w-5 h-5" style={{ color: currentTabObj.color }} />
              <span>{currentTabObj.label} Regional Variation</span>
            </h3>
            <p className="text-xs text-slate-600">
              Cross-station comparison across climatic zones of the Indian subcontinent ({currentTabObj.unit})
            </p>
          </div>

          {/* Extreme values badge */}
          <div className="flex items-center space-x-3 text-xs font-mono">
            <span className="bg-slate-100 text-slate-700 px-2.5 py-1 rounded border border-slate-200">
              Min: <strong>{currentTabObj.stats.min} {currentTabObj.unit}</strong>
            </span>
            <span className="bg-slate-100 text-slate-700 px-2.5 py-1 rounded border border-slate-200">
              Max: <strong>{currentTabObj.stats.max} {currentTabObj.unit}</strong>
            </span>
            <span className="bg-sky-50 text-sky-800 px-2.5 py-1 rounded border border-sky-200">
              Spread: <strong>{currentTabObj.stats.spread} {currentTabObj.unit}</strong>
            </span>
          </div>
        </div>

        {/* Station Bar Chart */}
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 40 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis 
                dataKey="name" 
                tick={{ fontSize: 10, fill: '#64748b' }} 
                angle={-30} 
                textAnchor="end" 
                stroke="#cbd5e1"
              />
              <YAxis tick={{ fontSize: 11, fill: '#64748b' }} stroke="#cbd5e1" unit={currentTabObj.unit} />
              <Tooltip 
                formatter={(val) => [`${val} ${currentTabObj.unit}`, currentTabObj.label]}
                labelFormatter={(name) => `Station: ${name}`}
                contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }}
              />
              <Bar 
                dataKey={activeVariableTab} 
                fill={currentTabObj.color} 
                radius={[4, 4, 0, 0]} 
              >
                {chartData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={currentTabObj.color}
                    fillOpacity={0.85} 
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Detailed Breakdown Table */}
        <div className="pt-2">
          <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
            Zone-by-Zone Meteorological Table
          </h4>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-semibold">
                <tr>
                  <th className="py-2.5 px-3">Location</th>
                  <th className="py-2.5 px-3">State</th>
                  <th className="py-2.5 px-3">Geographic Zone</th>
                  <th className="py-2.5 px-3 text-right">Current Value</th>
                  <th className="py-2.5 px-3 text-right">Variance vs Subcontinent Mean</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {regionalData.map((reg) => {
                  const val = reg[activeVariableTab];
                  const variance = +(val - currentTabObj.stats.avg).toFixed(1);
                  return (
                    <tr key={reg.id} className="hover:bg-slate-50/70">
                      <td className="py-2.5 px-3 font-semibold text-slate-900">{reg.name}</td>
                      <td className="py-2.5 px-3 text-slate-500">{reg.state}</td>
                      <td className="py-2.5 px-3 text-slate-600">{reg.zone}</td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                        {val} {currentTabObj.unit}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono">
                        <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                          variance > 0 ? 'bg-orange-50 text-orange-700' :
                          variance < 0 ? 'bg-sky-50 text-sky-700' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {variance > 0 ? '+' : ''}{variance} {currentTabObj.unit}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
