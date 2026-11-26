import React from 'react';
import { IndiaMap } from '../components/map/IndiaMap';
import { MapControls } from '../components/map/MapControls';
import { LocationPanel } from '../components/map/LocationPanel';
import { useSimulation } from '../hooks/useSimulation';
import { Map, Layers, Compass, SlidersHorizontal } from 'lucide-react';

export const ClimateMapPage = () => {
  const { currentDayData, selectedVariable } = useSimulation();

  return (
    <div className="space-y-6">
      {/* Page Title & Context */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-xl font-bold tracking-tight text-slate-900">
              Interactive Subcontinental Climate Map
            </h2>
            <span className="bg-cyan-100 text-cyan-800 text-xs font-semibold px-2.5 py-0.5 rounded-full border border-cyan-200">
              Geospatial Layer
            </span>
          </div>
          <p className="text-xs text-slate-600 mt-1">
            Multilayered geographic visualization across Indian meteorological stations with real-time station telemetry.
          </p>
        </div>
      </div>

      {/* Layer & Timeline Controls */}
      <MapControls />

      {/* Main Map + Location Panel Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <IndiaMap />
        </div>
        <div className="space-y-4">
          <LocationPanel />
        </div>
      </div>
    </div>
  );
};
