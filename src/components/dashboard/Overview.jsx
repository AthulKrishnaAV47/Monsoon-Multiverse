import React from 'react';
import { 
  Thermometer, 
  CloudRain, 
  Droplets, 
  Wind, 
  Gauge, 
  Calendar, 
  MapPin, 
  ArrowRight,
  TrendingUp,
  Cpu
} from 'lucide-react';
import { MetricCard } from './MetricCard';
import { ClimateCharts } from './ClimateCharts';
import { useSimulation } from '../../hooks/useSimulation';

export const Overview = () => {
  const { 
    activeSimulation, 
    baselineSimulation, 
    currentDayData, 
    baselineDayData,
    selectedDayIndex, 
    setSelectedDayIndex,
    setActiveTab,
    setSelectedRegionId
  } = useSimulation();

  const curNat = currentDayData?.nationalAverages || {};
  const baseNat = baselineDayData?.nationalAverages || {};

  return (
    <div className="space-y-6">
      {/* Top Banner: Active Simulation Summary */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">
              National Climate Synoptic Overview
            </h2>
            <span className="bg-sky-100 text-sky-800 text-xs font-semibold px-2.5 py-0.5 rounded-full border border-sky-200">
              India Subcontinent
            </span>
          </div>
          <p className="text-xs text-slate-600 max-w-2xl leading-relaxed">
            Viewing projection for <strong>{currentDayData.displayLabel}</strong> ({currentDayData.dateString}). 
            Synthesizing 25km meteorological stations across 12 climatic zones from Western Himalayas to Southern Peninsular.
          </p>
        </div>

        {/* Day Selector Pill Strip */}
        <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 md:pb-0">
          {activeSimulation.days?.map((d, idx) => (
            <button
              key={d.dayNumber}
              onClick={() => setSelectedDayIndex(idx)}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-mono font-medium transition-all ${
                selectedDayIndex === idx
                  ? 'bg-slate-900 text-white shadow-xs font-bold'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              D{d.dayNumber}
            </button>
          ))}
        </div>
      </div>

      {/* Top-Level Metric Cards (5 Core Parameters) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <MetricCard
          title="Surface Temperature"
          value={curNat.temperature}
          unit="°C"
          baselineValue={baseNat.temperature}
          icon={Thermometer}
          colorScheme="orange"
          isDemo={activeSimulation.isDemo}
        />
        <MetricCard
          title="Daily Rainfall"
          value={curNat.rainfall}
          unit="mm"
          baselineValue={baseNat.rainfall}
          icon={CloudRain}
          colorScheme="blue"
          isDemo={activeSimulation.isDemo}
        />
        <MetricCard
          title="Relative Humidity"
          value={curNat.humidity}
          unit="%"
          baselineValue={baseNat.humidity}
          icon={Droplets}
          colorScheme="teal"
          isDemo={activeSimulation.isDemo}
        />
        <MetricCard
          title="Wind Velocity"
          value={curNat.windSpeed}
          unit="km/h"
          baselineValue={baseNat.windSpeed}
          icon={Wind}
          colorScheme="indigo"
          isDemo={activeSimulation.isDemo}
        />
        <MetricCard
          title="Atmospheric Pressure"
          value={curNat.pressure}
          unit="hPa"
          baselineValue={baseNat.pressure}
          icon={Gauge}
          colorScheme="purple"
          isDemo={activeSimulation.isDemo}
        />
      </div>

      {/* 10-Day Synoptic Charts */}
      <ClimateCharts />

      {/* Regional Grid Preview Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 lg:p-5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Regional Observation & Prediction Stations
            </h3>
            <p className="text-xs text-slate-600">
              Representative micro-climatic sample stations for Day {selectedDayIndex + 1}
            </p>
          </div>
          <button
            onClick={() => setActiveTab('map')}
            className="flex items-center space-x-1.5 text-xs font-semibold text-sky-600 hover:text-sky-700 bg-sky-50 hover:bg-sky-100 px-3 py-1.5 rounded-lg border border-sky-200 transition"
          >
            <span>Open Interactive Map</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-semibold">
              <tr>
                <th className="py-3 px-4">Station / Location</th>
                <th className="py-3 px-4">Climatic Zone</th>
                <th className="py-3 px-4 text-right">Temp (°C)</th>
                <th className="py-3 px-4 text-right">Rain (mm)</th>
                <th className="py-3 px-4 text-right">Humidity</th>
                <th className="py-3 px-4 text-right">Wind (km/h)</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {currentDayData?.regionalData?.slice(0, 6).map((reg) => (
                <tr key={reg.id} className="hover:bg-slate-50/80 transition">
                  <td className="py-3 px-4">
                    <div className="font-semibold text-slate-900">{reg.name}</div>
                    <div className="text-[11px] text-slate-500">{reg.state}</div>
                  </td>
                  <td className="py-3 px-4">
                    <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[11px] font-medium border border-slate-200">
                      {reg.zone}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-semibold text-orange-600">
                    {reg.temperature}°C
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-semibold text-sky-600">
                    {reg.rainfall} mm
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-slate-700">
                    {reg.humidity}%
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-slate-700">
                    {reg.windSpeed} km/h
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => {
                        setSelectedRegionId(reg.id);
                        setActiveTab('map');
                      }}
                      className="text-xs text-sky-600 hover:text-sky-800 font-medium hover:underline"
                    >
                      Inspect
                    </button>
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
