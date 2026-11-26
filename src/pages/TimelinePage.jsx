import React from 'react';
import { Timeline } from '../components/simulation/Timeline';
import { ClimateCharts } from '../components/dashboard/ClimateCharts';
import { useSimulation } from '../hooks/useSimulation';
import { CalendarDays, AlertCircle } from 'lucide-react';

export const TimelinePage = () => {
  const { activeSimulation, selectedDayIndex } = useSimulation();

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <div className="flex items-center space-x-2">
          <h2 className="text-xl font-bold tracking-tight text-slate-900">
            Temporal Simulation Timeline (10-Day Series)
          </h2>
          <span className="bg-sky-100 text-sky-800 text-xs font-semibold px-2.5 py-0.5 rounded-full border border-sky-200">
            Synoptic Flow
          </span>
        </div>
        <p className="text-xs text-slate-600 mt-1">
          Explore day-by-day predictive forecasts, temporal trend trajectories, and synoptic weather evolution across India.
        </p>
      </div>

      {/* Main Interactive Timeline Scrubber & Controller */}
      <Timeline />

      {/* Time-Series Charts Synchronized to Timeline */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-slate-900">
          Temporal Evolution Across 10 Simulation Steps
        </h3>
        <ClimateCharts />
      </div>
    </div>
  );
};
