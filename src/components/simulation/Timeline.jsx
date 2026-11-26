import React from 'react';
import { 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  Calendar, 
  Clock, 
  TrendingUp, 
  Thermometer, 
  CloudRain,
  ChevronRight,
  Eye,
  Zap
} from 'lucide-react';
import { useSimulation } from '../../hooks/useSimulation';
import { formatTemperature, formatRainfall, formatHumidity } from '../../utils/formatters';

export const Timeline = () => {
  const { 
    activeSimulation, 
    selectedDayIndex, 
    setSelectedDayIndex, 
    isPlaying, 
    setIsPlaying,
    playbackSpeed,
    setPlaybackSpeed,
    currentDayData,
    setActiveTab
  } = useSimulation();

  const days = activeSimulation?.days || [];
  const totalDays = days.length;

  const handlePrev = () => {
    setSelectedDayIndex(prev => Math.max(0, prev - 1));
  };

  const handleNext = () => {
    setSelectedDayIndex(prev => Math.min(totalDays - 1, prev + 1));
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 lg:p-6 space-y-6">
      {/* Top Controls Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <h3 className="text-base font-bold text-slate-900">
              10-Day Synoptic Simulation Timeline
            </h3>
            <span className="bg-sky-100 text-sky-800 text-[11px] font-semibold px-2 py-0.5 rounded border border-sky-200">
              Step Forward Engine
            </span>
          </div>
          <p className="text-xs text-slate-600 mt-0.5">
            Step through daily predictions or trigger automated playback. All map and variable layers automatically synchronize.
          </p>
        </div>

        {/* Playback Controls & Speed Toggle */}
        <div className="flex items-center space-x-2">
          {/* Speed selector */}
          <button
            onClick={() => setPlaybackSpeed(playbackSpeed === 1 ? 2 : 1)}
            className={`px-2.5 py-1.5 rounded-lg border text-xs font-mono font-bold transition ${
              playbackSpeed === 2 
                ? 'bg-amber-50 text-amber-800 border-amber-300' 
                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
            }`}
            title="Toggle playback speed (1x or 2x)"
          >
            {playbackSpeed}x Speed
          </button>

          <button
            onClick={handlePrev}
            disabled={selectedDayIndex === 0}
            className="p-2 rounded-lg border border-slate-200 hover:bg-slate-100 disabled:opacity-40 text-slate-700 transition"
            title="Previous Day"
          >
            <SkipBack className="w-4 h-4" />
          </button>

          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-semibold text-white transition-all shadow-xs ${
              isPlaying
                ? 'bg-amber-600 hover:bg-amber-700'
                : 'bg-sky-600 hover:bg-sky-700'
            }`}
          >
            {isPlaying ? (
              <>
                <Pause className="w-4 h-4" />
                <span>Pause</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-current" />
                <span>Play Simulation</span>
              </>
            )}
          </button>

          <button
            onClick={handleNext}
            disabled={selectedDayIndex === totalDays - 1}
            className="p-2 rounded-lg border border-slate-200 hover:bg-slate-100 disabled:opacity-40 text-slate-700 transition"
            title="Next Day"
          >
            <SkipForward className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 10-Day Step Scrubber Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-5 lg:grid-cols-10 gap-2">
        {days.map((day, idx) => {
          const isSelected = selectedDayIndex === idx;
          const nat = day.nationalAverages;

          return (
            <button
              key={day.dayNumber}
              onClick={() => setSelectedDayIndex(idx)}
              className={`p-2.5 rounded-xl border text-left transition-all relative overflow-hidden flex flex-col justify-between ${
                isSelected
                  ? 'bg-sky-50 border-sky-500 shadow-sm ring-2 ring-sky-500/30'
                  : 'bg-slate-50/70 border-slate-200 hover:bg-white hover:border-slate-300'
              }`}
            >
              {isSelected && (
                <div className="absolute top-0 left-0 right-0 h-1 bg-sky-600"></div>
              )}
              <div>
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-bold font-mono ${isSelected ? 'text-sky-900' : 'text-slate-700'}`}>
                    Day {day.dayNumber}
                  </span>
                  {isSelected && (
                    <span className="w-2 h-2 rounded-full bg-sky-600"></span>
                  )}
                </div>
                <div className="text-[10px] text-slate-500 truncate mt-0.5">
                  {day.dateString.slice(5)}
                </div>
              </div>

              <div className="mt-2 pt-1.5 border-t border-slate-200/60 text-[11px] font-mono space-y-0.5">
                <div className="text-orange-600 font-semibold">
                  {nat.temperature}°C
                </div>
                <div className="text-sky-600 font-semibold">
                  {nat.rainfall} mm
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Active Day Synopsis & Quick Actions */}
      <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 rounded-xl bg-sky-600 text-white flex flex-col items-center justify-center font-mono font-bold shadow-xs">
            <span className="text-[10px] uppercase font-sans tracking-wider opacity-80">Day</span>
            <span className="text-lg leading-tight">{selectedDayIndex + 1}</span>
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-900">
              Active Simulation Step: {currentDayData.displayLabel} ({currentDayData.dateString})
            </h4>
            <p className="text-xs text-slate-600 mt-0.5">
              Subcontinental mean: Temp <strong>{currentDayData.nationalAverages.temperature}°C</strong> • Rain <strong>{currentDayData.nationalAverages.rainfall} mm</strong> • Humidity <strong>{currentDayData.nationalAverages.humidity}%</strong> • Wind <strong>{currentDayData.nationalAverages.windSpeed} km/h</strong>
            </p>
          </div>
        </div>

        <button
          onClick={() => setActiveTab('map')}
          className="flex items-center justify-center space-x-1.5 px-3.5 py-2 rounded-lg bg-white border border-slate-200 text-xs font-semibold text-slate-800 hover:bg-slate-100 transition shadow-xs"
        >
          <Eye className="w-3.5 h-3.5 text-sky-600" />
          <span>Inspect on Map</span>
          <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
        </button>
      </div>
    </div>
  );
};
