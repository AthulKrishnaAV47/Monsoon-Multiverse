import React, { useState } from 'react';
import { 
  GitCompare, 
  Thermometer, 
  CloudRain, 
  Droplets, 
  Wind, 
  Gauge, 
  ArrowRight, 
  TrendingUp, 
  TrendingDown, 
  Info,
  Layers,
  Sliders,
  Sparkles
} from 'lucide-react';
import { 
  ResponsiveContainer, 
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
import { formatTemperature, formatRainfall, formatHumidity, formatWindSpeed, formatPressure, formatPercentChange } from '../../utils/formatters';

export const ComparisonPanel = () => {
  const { 
    baselineSimulation, 
    activeSimulation, 
    scenarioSimulation, 
    selectedDayIndex,
    setSelectedDayIndex,
    setActiveTab
  } = useSimulation();

  const [compareVariable, setCompareVariable] = useState('temperature');

  // If no custom scenario was run yet, we compare active (or sample perturbation) vs baseline
  const hasCustomScenario = !!scenarioSimulation;
  const scenarioToCompare = scenarioSimulation || activeSimulation;

  const currentScenarioDay = scenarioToCompare?.days?.[selectedDayIndex] || scenarioToCompare?.days?.[0];
  const currentBaselineDay = baselineSimulation?.days?.[selectedDayIndex] || baselineSimulation?.days?.[0];

  const variables = [
    { id: 'temperature', label: 'Temperature', icon: Thermometer, unit: '°C', color: '#ea580c' },
    { id: 'rainfall', label: 'Precipitation', icon: CloudRain, unit: 'mm', color: '#0284c7' },
    { id: 'humidity', label: 'Humidity', icon: Droplets, unit: '%', color: '#0d9488' },
    { id: 'windSpeed', label: 'Wind Velocity', icon: Wind, unit: 'km/h', color: '#6366f1' },
  ];

  const activeVarObj = variables.find(v => v.id === compareVariable) || variables[0];

  // 10-day series comparative chart data
  const timeSeriesComparison = (scenarioToCompare?.days || []).map((scDay, idx) => {
    const baseDay = baselineSimulation?.days?.[idx] || scDay;
    const baseVal = baseDay.nationalAverages[compareVariable];
    const scenVal = scDay.nationalAverages[compareVariable];
    const delta = +(scenVal - baseVal).toFixed(1);

    return {
      day: scDay.displayLabel,
      date: scDay.dateString,
      dayIndex: idx,
      Baseline: baseVal,
      Scenario: scenVal,
      Delta: delta
    };
  });

  // Regional stations comparative data for selected day
  const regionalComparison = (currentScenarioDay?.regionalData || []).map(scReg => {
    const baseReg = currentBaselineDay?.regionalData?.find(r => r.id === scReg.id) || scReg;
    const baseVal = baseReg[compareVariable];
    const scenVal = scReg[compareVariable];
    const delta = +(scenVal - baseVal).toFixed(1);
    const pct = formatPercentChange(baseVal, scenVal);

    return {
      id: scReg.id,
      name: scReg.name.split('(')[0].trim(),
      state: scReg.state,
      zone: scReg.zone,
      baselineVal: baseVal,
      scenarioVal: scenVal,
      delta,
      pctChange: pct
    };
  });

  // Aggregated deltas for top-level divergence cards
  const baseNational = currentBaselineDay?.nationalAverages?.[compareVariable] || 0;
  const scenNational = currentScenarioDay?.nationalAverages?.[compareVariable] || 0;
  const nationalDelta = +(scenNational - baseNational).toFixed(1);
  const nationalPct = formatPercentChange(baseNational, scenNational);

  return (
    <div className="space-y-6">
      {/* Notice banner if no custom scenario has been executed yet */}
      {!hasCustomScenario && (
        <div className="bg-sky-50 border border-sky-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-sky-900">
          <div className="flex items-center space-x-2">
            <Info className="w-4 h-4 text-sky-600 flex-shrink-0" />
            <span>
              <strong>Comparing Baseline Control to Itself:</strong> To evaluate divergence, execute an experimental climate scenario in the sandbox.
            </span>
          </div>
          <button
            onClick={() => setActiveTab('scenarios')}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-sky-600 text-white font-semibold hover:bg-sky-700 transition self-start sm:self-auto shadow-xs"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Configure Scenario</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Header & Scenario Context */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <GitCompare className="w-5 h-5 text-sky-600" />
            <h3 className="text-base font-bold text-slate-900">
              Comparative Climate Synthesis
            </h3>
          </div>
          <p className="text-xs text-slate-600 mt-1">
            Contrasting <strong>{baselineSimulation.scenarioName}</strong> vs. <strong>{scenarioToCompare.scenarioName}</strong> for Day {selectedDayIndex + 1}.
          </p>
        </div>

        {/* Day selector */}
        <div className="flex items-center space-x-1">
          <span className="text-xs text-slate-500 mr-1.5 font-medium">Day:</span>
          {scenarioToCompare?.days?.map((d, idx) => (
            <button
              key={d.dayNumber}
              onClick={() => setSelectedDayIndex(idx)}
              className={`px-2 py-1 rounded text-xs font-mono transition ${
                selectedDayIndex === idx
                  ? 'bg-slate-900 text-white font-bold'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              D{d.dayNumber}
            </button>
          ))}
        </div>
      </div>

      {/* Variable Selector Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {variables.map((v) => {
          const Icon = v.icon;
          const isSelected = compareVariable === v.id;
          return (
            <button
              key={v.id}
              onClick={() => setCompareVariable(v.id)}
              className={`p-3 rounded-xl border flex items-center justify-between transition-all ${
                isSelected
                  ? 'bg-sky-50 border-sky-400 ring-1 ring-sky-400 font-bold shadow-xs'
                  : 'bg-white border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center space-x-2">
                <Icon className="w-4 h-4" style={{ color: v.color }} />
                <span className="text-xs text-slate-800">{v.label}</span>
              </div>
              <span className="text-xs font-mono text-slate-500">{v.unit}</span>
            </button>
          );
        })}
      </div>

      {/* Divergence Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
            Baseline Control Mean
          </span>
          <div className="mt-2 text-2xl font-bold font-mono text-slate-800">
            {baseNational} <span className="text-sm font-normal text-slate-500">{activeVarObj.unit}</span>
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">Standard historical reference</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
            Scenario Projected Mean
          </span>
          <div className="mt-2 text-2xl font-bold font-mono text-slate-900" style={{ color: activeVarObj.color }}>
            {scenNational} <span className="text-sm font-normal text-slate-500">{activeVarObj.unit}</span>
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">Experimental model projection</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
            Net Divergence (Delta)
          </span>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className={`text-2xl font-bold font-mono ${nationalDelta > 0 ? 'text-orange-600' : nationalDelta < 0 ? 'text-sky-600' : 'text-slate-700'}`}>
              {nationalDelta > 0 ? '+' : ''}{nationalDelta} {activeVarObj.unit}
            </span>
            <span className="text-xs font-mono font-semibold text-slate-600">
              ({nationalPct})
            </span>
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">Mean shift across India mesh</span>
        </div>
      </div>

      {/* 10-Day Comparative Line Chart */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <div>
          <h4 className="text-sm font-bold text-slate-900">
            10-Day Synoptic Trajectory Comparison: {activeVarObj.label} ({activeVarObj.unit})
          </h4>
          <p className="text-xs text-slate-600">
            Solid line shows experimental scenario trajectory; dashed line denotes historical baseline control.
          </p>
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={timeSeriesComparison}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#64748b' }} stroke="#cbd5e1" />
              <YAxis tick={{ fontSize: 11, fill: '#64748b' }} stroke="#cbd5e1" unit={activeVarObj.unit} />
              <Tooltip 
                contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                formatter={(val, name) => [`${val} ${activeVarObj.unit}`, name]}
              />
              <Legend verticalAlign="top" height={36} iconType="plainline" wrapperStyle={{ fontSize: 12 }} />
              <Line 
                type="monotone" 
                dataKey="Baseline" 
                stroke="#94a3b8" 
                strokeDasharray="4 4" 
                strokeWidth={2}
                dot={false}
              />
              <Line 
                type="monotone" 
                dataKey="Scenario" 
                stroke={activeVarObj.color} 
                strokeWidth={2.5}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Station-by-Station Divergence Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200">
          <h4 className="text-sm font-bold text-slate-900">
            Station-Level Divergence Matrix (Day {selectedDayIndex + 1})
          </h4>
          <p className="text-xs text-slate-600">
            Granular comparison across micro-climatic zones with absolute and percentage shifts.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-semibold">
              <tr>
                <th className="py-2.5 px-3">Station</th>
                <th className="py-2.5 px-3">Climatic Zone</th>
                <th className="py-2.5 px-3 text-right">Baseline ({activeVarObj.unit})</th>
                <th className="py-2.5 px-3 text-right">Scenario ({activeVarObj.unit})</th>
                <th className="py-2.5 px-3 text-right">Absolute Delta</th>
                <th className="py-2.5 px-3 text-right">% Change</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {regionalComparison.map((reg) => (
                <tr key={reg.id} className="hover:bg-slate-50/70">
                  <td className="py-2.5 px-3 font-semibold text-slate-900">{reg.name}</td>
                  <td className="py-2.5 px-3 text-slate-500">{reg.zone}</td>
                  <td className="py-2.5 px-3 text-right font-mono text-slate-600">
                    {reg.baselineVal}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                    {reg.scenarioVal}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono">
                    <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                      reg.delta > 0 ? 'bg-orange-50 text-orange-700' :
                      reg.delta < 0 ? 'bg-sky-50 text-sky-700' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {reg.delta > 0 ? '+' : ''}{reg.delta} {activeVarObj.unit}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono font-semibold text-slate-700">
                    {reg.pctChange}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
