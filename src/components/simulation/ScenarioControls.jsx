import React, { useState } from 'react';
import { 
  Sliders, 
  RotateCcw, 
  Play, 
  CheckCircle, 
  AlertTriangle, 
  Sparkles, 
  Thermometer, 
  CloudRain, 
  Droplets, 
  Wind, 
  Calendar,
  Layers,
  ArrowRight
} from 'lucide-react';
import { useSimulation } from '../../hooks/useSimulation';

export const ScenarioControls = () => {
  const { 
    executeScenario, 
    resetToBaseline, 
    isSimulating, 
    simulationError, 
    connectionStatus,
    setActiveTab,
    scenarioSimulation
  } = useSimulation();

  // Form State
  const [scenarioName, setScenarioName] = useState('Monsoon Thermal Spike (+2.0°C)');
  const [scenarioDescription, setScenarioDescription] = useState('Evaluating drought sensitivity across Indo-Gangetic Plains & Deccan under elevated sea surface and land temps.');
  const [temperatureDelta, setTemperatureDelta] = useState(2.0);
  const [rainfallDelta, setRainfallDelta] = useState(-15);
  const [humidityDelta, setHumidityDelta] = useState(-5);
  const [windSpeedDelta, setWindSpeedDelta] = useState(4.0);
  const [durationDays, setDurationDays] = useState(10);
  const [formError, setFormError] = useState(null);
  const [runSuccess, setRunSuccess] = useState(false);
  const [selectedPresetIndex, setSelectedPresetIndex] = useState(null);

  // Quick Preset Scenarios
  const presets = [
    {
      title: 'IPCC +2°C Warming',
      desc: 'Uniform thermal perturbation with drying trend in central agricultural zones.',
      temp: 2.0,
      rain: -10,
      hum: -8,
      wind: 2.0,
      days: 10
    },
    {
      title: 'Monsoon Flash Flooding',
      desc: 'Intense precipitation surge (+45%) along Western Ghats and coastal belt.',
      temp: -0.5,
      rain: 45,
      hum: 15,
      wind: 8.0,
      days: 10
    },
    {
      title: 'Severe Arid Drought',
      desc: 'Extended dry spell with -40% precipitation and elevated daytime temperature.',
      temp: 3.5,
      rain: -40,
      hum: -25,
      wind: 1.5,
      days: 10
    },
    {
      title: 'Cyclonic Storm Surge',
      desc: 'Extreme wind velocity elevation (+18 km/h) and heavy rainfall burst.',
      temp: -1.0,
      rain: 35,
      hum: 20,
      wind: 18.0,
      days: 7
    }
  ];

  const applyPreset = (preset, idx) => {
    setSelectedPresetIndex(idx);
    setScenarioName(preset.title);
    setScenarioDescription(preset.desc);
    setTemperatureDelta(preset.temp);
    setRainfallDelta(preset.rain);
    setHumidityDelta(preset.hum);
    setWindSpeedDelta(preset.wind);
    setDurationDays(preset.days);
    setFormError(null);
    setRunSuccess(false);
  };

  const handleReset = () => {
    setSelectedPresetIndex(null);
    setScenarioName('Historical Synoptic Baseline (Control)');
    setScenarioDescription('Standard baseline meteorological control run.');
    setTemperatureDelta(0);
    setRainfallDelta(0);
    setHumidityDelta(0);
    setWindSpeedDelta(0);
    setDurationDays(10);
    setFormError(null);
    setRunSuccess(false);
    resetToBaseline();
  };

  const handleRunSimulation = async (e) => {
    e.preventDefault();
    setFormError(null);
    setRunSuccess(false);

    // Form Validation
    if (!scenarioName.trim()) {
      setFormError('Please enter a valid Scenario Name.');
      return;
    }
    if (temperatureDelta < -10 || temperatureDelta > 15) {
      setFormError('Temperature adjustment must be between -10°C and +15°C.');
      return;
    }
    if (durationDays < 1 || durationDays > 10) {
      setFormError('Simulation duration must be between 1 and 10 days.');
      return;
    }

    const payload = {
      name: scenarioName.trim(),
      description: scenarioDescription.trim(),
      temperatureDelta,
      rainfallDelta,
      humidityDelta,
      windSpeedDelta,
      durationDays
    };

    await executeScenario(payload);
    setRunSuccess(true);
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 lg:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <Sliders className="w-5 h-5 text-sky-600" />
            <h3 className="text-base font-bold text-slate-900">
              Scenario Experimentation Console
            </h3>
          </div>
          <p className="text-xs text-slate-600 mt-0.5">
            Configure climate perturbation parameters, run simulations, and analyze impacts against the baseline.
          </p>
        </div>

        {/* Mode Indicator Badge */}
        <div>
          {connectionStatus === 'CONNECTED' ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Simulation API Ready
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
              <span className="w-2 h-2 rounded-full bg-amber-500"></span>
              Demo Simulation Mode
            </span>
          )}
        </div>
      </div>

      {/* Preset Buttons */}
      <div>
        <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider block mb-2">
          Load Scenario Benchmark Preset:
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {presets.map((p, idx) => {
            const isSelected = selectedPresetIndex === idx;
            return (
              <button
                key={idx}
                type="button"
                onClick={() => applyPreset(p, idx)}
                className={`p-3 text-left rounded-lg border transition text-xs group ${
                  isSelected
                    ? 'bg-sky-50 border-sky-400 ring-2 ring-sky-400/30 shadow-xs'
                    : 'bg-slate-50/70 border-slate-200 hover:bg-sky-50 hover:border-sky-300'
                }`}
              >
                <div className={`font-bold truncate ${isSelected ? 'text-sky-900' : 'text-slate-800 group-hover:text-sky-900'}`}>
                  {p.title}
                </div>
                <div className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                  {p.desc}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Scenario Form */}
      <form onSubmit={handleRunSimulation} className="space-y-6 pt-2">
        {/* Scenario Metadata Inputs */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              Scenario Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={scenarioName}
              onChange={(e) => setScenarioName(e.target.value)}
              placeholder="e.g., Regional Heatwave +2.5°C"
              className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:ring-1 focus:ring-sky-500 focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              Simulation Horizon (Duration)
            </label>
            <div className="flex items-center space-x-3">
              <input
                type="range"
                min="1"
                max="10"
                step="1"
                value={durationDays}
                onChange={(e) => setDurationDays(Number(e.target.value))}
                className="flex-1 accent-sky-600"
              />
              <span className="w-16 text-center font-mono text-xs font-bold px-2 py-1 bg-slate-100 rounded border border-slate-200">
                {durationDays} Days
              </span>
            </div>
          </div>

          <div className="md:col-span-2">
            <label className="text-xs font-bold text-slate-700 block mb-1">
              Scenario Description / Hypothesis
            </label>
            <input
              type="text"
              value={scenarioDescription}
              onChange={(e) => setScenarioDescription(e.target.value)}
              placeholder="Brief description of experimental hypothesis..."
              className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:ring-1 focus:ring-sky-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Parametric Adjustment Sliders */}
        <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200 space-y-4">
          <div className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            Parametric Climate Perturbations
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Temperature Delta */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-xs">
                <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                  <Thermometer className="w-4 h-4 text-orange-500" />
                  Temperature Delta:
                </span>
                <span className="font-mono font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded border border-orange-200">
                  {temperatureDelta > 0 ? '+' : ''}{temperatureDelta.toFixed(1)} °C
                </span>
              </div>
              <input
                type="range"
                min="-5"
                max="8"
                step="0.1"
                value={temperatureDelta}
                onChange={(e) => setTemperatureDelta(Number(e.target.value))}
                className="w-full accent-orange-600"
              />
              <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                <span>-5.0°C</span>
                <span>0.0°C (Baseline)</span>
                <span>+8.0°C</span>
              </div>
            </div>

            {/* Rainfall Delta */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-xs">
                <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                  <CloudRain className="w-4 h-4 text-sky-500" />
                  Precipitation Adjustment:
                </span>
                <span className="font-mono font-bold text-sky-600 bg-sky-50 px-2 py-0.5 rounded border border-sky-200">
                  {rainfallDelta > 0 ? '+' : ''}{rainfallDelta}%
                </span>
              </div>
              <input
                type="range"
                min="-60"
                max="100"
                step="5"
                value={rainfallDelta}
                onChange={(e) => setRainfallDelta(Number(e.target.value))}
                className="w-full accent-sky-600"
              />
              <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                <span>-60% (Drought)</span>
                <span>0%</span>
                <span>+100% (Deluge)</span>
              </div>
            </div>

            {/* Humidity Delta */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-xs">
                <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                  <Droplets className="w-4 h-4 text-teal-500" />
                  Relative Humidity Delta:
                </span>
                <span className="font-mono font-bold text-teal-600 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                  {humidityDelta > 0 ? '+' : ''}{humidityDelta}%
                </span>
              </div>
              <input
                type="range"
                min="-40"
                max="40"
                step="5"
                value={humidityDelta}
                onChange={(e) => setHumidityDelta(Number(e.target.value))}
                className="w-full accent-teal-600"
              />
              <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                <span>-40%</span>
                <span>0%</span>
                <span>+40%</span>
              </div>
            </div>

            {/* Wind Speed Delta */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-xs">
                <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                  <Wind className="w-4 h-4 text-indigo-500" />
                  Wind Velocity Delta:
                </span>
                <span className="font-mono font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                  {windSpeedDelta > 0 ? '+' : ''}{windSpeedDelta.toFixed(1)} km/h
                </span>
              </div>
              <input
                type="range"
                min="-10"
                max="30"
                step="1"
                value={windSpeedDelta}
                onChange={(e) => setWindSpeedDelta(Number(e.target.value))}
                className="w-full accent-indigo-600"
              />
              <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                <span>-10 km/h</span>
                <span>0 km/h</span>
                <span>+30 km/h</span>
              </div>
            </div>
          </div>
        </div>

        {/* Validation or API Errors */}
        {(formError || simulationError) && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800 flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
            <span>{formError || simulationError}</span>
          </div>
        )}

        {/* Success Banner */}
        {runSuccess && scenarioSimulation && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-900 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>
                <strong>Simulation completed successfully!</strong> Outputs have updated the map, 10-day timeline, and metrics.
              </span>
            </div>
            <button
              type="button"
              onClick={() => setActiveTab('comparison')}
              className="flex items-center space-x-1 font-bold text-emerald-700 hover:text-emerald-900 hover:underline"
            >
              <span>View Baseline Comparison</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center space-x-1.5 px-4 py-2.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset to Control Baseline</span>
          </button>

          <button
            type="submit"
            disabled={isSimulating}
            className={`flex items-center space-x-2 px-6 py-2.5 rounded-lg text-xs font-bold text-white transition shadow-sm ${
              isSimulating
                ? 'bg-slate-400 cursor-not-allowed'
                : 'bg-sky-600 hover:bg-sky-700'
            }`}
          >
            {isSimulating ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                <span>Computing Synoptic Steps...</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-current" />
                <span>Run Experimental Simulation</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
