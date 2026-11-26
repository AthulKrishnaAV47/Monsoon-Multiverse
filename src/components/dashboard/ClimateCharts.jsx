import React from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';
import { useSimulation } from '../../hooks/useSimulation';

export const ClimateCharts = () => {
  const { activeSimulation, baselineSimulation, selectedDayIndex, setSelectedDayIndex } = useSimulation();

  // Prepare 10-day series data combining active and baseline
  const chartData = (activeSimulation?.days || []).map((day, idx) => {
    const baseDay = baselineSimulation?.days?.[idx] || day;
    return {
      day: day.displayLabel,
      dayIndex: idx,
      date: day.dateString,
      // Active run metrics
      temperature: day.nationalAverages.temperature,
      rainfall: day.nationalAverages.rainfall,
      humidity: day.nationalAverages.humidity,
      windSpeed: day.nationalAverages.windSpeed,
      pressure: day.nationalAverages.pressure,
      // Baseline metrics for comparison
      baseTemp: baseDay.nationalAverages.temperature,
      baseRain: baseDay.nationalAverages.rainfall,
    };
  });

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-slate-200 rounded-lg shadow-lg text-xs font-sans space-y-1.5">
          <div className="font-semibold text-slate-800 border-b border-slate-100 pb-1">
            {label} ({payload[0]?.payload?.date})
          </div>
          {payload.map((entry, index) => (
            <div key={`item-${index}`} className="flex items-center justify-between gap-4">
              <span className="flex items-center gap-1.5" style={{ color: entry.color }}>
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }}></span>
                {entry.name}:
              </span>
              <span className="font-mono font-semibold text-slate-800">
                {entry.value} {entry.unit}
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Chart 1: 10-Day Temperature Synoptic Trend */}
      <div className="bg-white p-4 lg:p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 tracking-tight">
              10-Day Temperature Projection
            </h3>
            <p className="text-xs text-slate-700">
              National mean surface temperature vs. baseline control (°C)
            </p>
          </div>
          <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-orange-50 text-orange-700 border border-orange-200">
            Selected: Day {selectedDayIndex + 1}
          </span>
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart 
              data={chartData} 
              onClick={(e) => {
                if (e && e.activePayload && e.activePayload[0]) {
                  setSelectedDayIndex(e.activePayload[0].payload.dayIndex);
                }
              }}
            >
              <defs>
                <linearGradient id="colorTemp" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ea580c" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#ea580c" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#64748b' }} stroke="#cbd5e1" />
              <YAxis domain={['auto', 'auto']} tick={{ fontSize: 11, fill: '#64748b' }} stroke="#cbd5e1" unit="°C" />
              <Tooltip content={<CustomTooltip />} />
              <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: 12 }} />
              <Line 
                type="monotone" 
                dataKey="baseTemp" 
                name="Baseline Control" 
                stroke="#94a3b8" 
                strokeDasharray="4 4" 
                dot={false}
                strokeWidth={1.5}
                unit="°C"
              />
              <Area 
                type="monotone" 
                dataKey="temperature" 
                name="Simulation Run" 
                stroke="#ea580c" 
                strokeWidth={2.5}
                fillOpacity={1} 
                fill="url(#colorTemp)" 
                activeDot={{ r: 6, fill: '#ea580c', stroke: '#fff', strokeWidth: 2 }}
                unit="°C"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Chart 2: 10-Day Precipitation Accumulation */}
      <div className="bg-white p-4 lg:p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 tracking-tight">
              Precipitation Distribution
            </h3>
            <p className="text-xs text-slate-700">
              Daily mean rainfall across subcontinental grid (mm)
            </p>
          </div>
          <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-sky-50 text-sky-700 border border-sky-200">
            Synoptic Series
          </span>
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart 
              data={chartData}
              onClick={(e) => {
                if (e && e.activePayload && e.activePayload[0]) {
                  setSelectedDayIndex(e.activePayload[0].payload.dayIndex);
                }
              }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#64748b' }} stroke="#cbd5e1" />
              <YAxis tick={{ fontSize: 11, fill: '#64748b' }} stroke="#cbd5e1" unit="mm" />
              <Tooltip content={<CustomTooltip />} />
              <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="baseRain" name="Baseline Rain" fill="#cbd5e1" radius={[4, 4, 0, 0]} unit="mm" />
              <Bar dataKey="rainfall" name="Simulated Rain" fill="#0284c7" radius={[4, 4, 0, 0]} unit="mm" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
