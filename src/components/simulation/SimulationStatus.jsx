import React from 'react';
import { Activity, Server, AlertCircle, CheckCircle2, ShieldAlert } from 'lucide-react';
import { useSimulation } from '../../hooks/useSimulation';

export const SimulationStatus = () => {
  const { connectionStatus, activeSimulation, isSimulating, backendInfo, backendError } = useSimulation();

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
            connectionStatus === 'CONNECTED' 
              ? 'bg-emerald-100 text-emerald-700' 
              : 'bg-amber-100 text-amber-800'
          }`}>
            <Server className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Simulation Execution Engine
              </span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                connectionStatus === 'CONNECTED'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-amber-50 text-amber-800 border-amber-200'
              }`}>
                {connectionStatus === 'CONNECTED' ? 'LIVE MODEL BACKEND' : 'DEMO MODE RUNNER'}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {connectionStatus === 'CONNECTED' 
                ? `Connected to ${backendInfo?.modelName || 'Climate Model API'} (${backendInfo?.version || 'v1'}). Remote inferences enabled.`
                : 'Backend API offline. Operating with modular local demo simulation engine.'
              }
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 text-xs font-mono">
          <span className="text-slate-500">Run ID:</span>
          <span className="bg-slate-100 text-slate-800 px-2 py-1 rounded font-semibold border border-slate-200">
            {activeSimulation?.simulationId}
          </span>
        </div>
      </div>
    </div>
  );
};
