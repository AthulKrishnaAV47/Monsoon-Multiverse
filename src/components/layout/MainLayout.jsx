import React from 'react';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { useSimulation } from '../../hooks/useSimulation';
import { AlertTriangle, Sparkles, CheckCircle2 } from 'lucide-react';

export const MainLayout = ({ children }) => {
  const { activeSimulation, connectionStatus } = useSimulation();

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 font-sans text-slate-900">
      {/* Top Header */}
      <Header />

      {/* Notice Banner when in DEMO MODE or Live Mode */}
      {activeSimulation.isDemo ? (
        <div className="bg-amber-50/90 border-b border-amber-200/80 px-4 py-1.5 text-xs text-amber-900 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
            <span>
              <strong>DEMO MODE ACTIVE:</strong> Synthesized baseline meteorological data loaded for UI testing & simulation validation.
            </span>
          </div>
          <span className="text-[11px] text-amber-700 hidden md:inline">
            Connecting external model API will automatically substitute this with live numerical inferences.
          </span>
        </div>
      ) : (
        <div className="bg-emerald-50 border-b border-emerald-200 px-4 py-1.5 text-xs text-emerald-900 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
            <span>
              <strong>LIVE SIMULATION MODEL CONNECTED:</strong> Rendering inferences computed by external backend.
            </span>
          </div>
          <span className="text-[11px] font-mono text-emerald-700">
            Run ID: {activeSimulation.simulationId}
          </span>
        </div>
      )}

      {/* Main Container: Sidebar + Active Page */}
      <div className="flex-1 flex overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto p-4 lg:p-6 bg-slate-50">
          <div className="max-w-7xl mx-auto space-y-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};
