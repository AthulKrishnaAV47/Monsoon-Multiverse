import React from 'react';
import { 
  History, 
  Eye, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  Layers, 
  ArrowRight,
  Download,
  Filter,
  RotateCcw
} from 'lucide-react';
import { useSimulation } from '../hooks/useSimulation';

export const HistoryPage = () => {
  const { historyList, loadHistoricalSimulation, resetToBaseline, activeSimulation } = useSimulation();

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-xl font-bold tracking-tight text-slate-900">
              Simulation Execution Archive & History
            </h2>
            <span className="bg-slate-200 text-slate-800 text-xs font-semibold px-2.5 py-0.5 rounded-full border border-slate-300">
              Audit Log
            </span>
          </div>
          <p className="text-xs text-slate-600 mt-1">
            Archived logs of forward simulations and experimental scenario configurations. Click <strong>View Results</strong> to load any past run into the Digital Twin.
          </p>
        </div>

        <button
          onClick={resetToBaseline}
          className="self-start sm:self-auto flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 transition"
        >
          <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
          <span>Reset to Control Baseline</span>
        </button>
      </div>

      {/* History Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            Computed Simulations ({historyList.length})
          </span>
          <span className="text-xs text-slate-500 font-mono">
            Subcontinent Grid v2.4
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-semibold">
              <tr>
                <th className="py-3 px-4">Simulation ID</th>
                <th className="py-3 px-4">Scenario Name</th>
                <th className="py-3 px-4">Execution Type</th>
                <th className="py-3 px-4">Duration</th>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {historyList.map((item) => {
                const isActive = activeSimulation?.simulationId === item.simulationId;

                return (
                  <tr key={item.simulationId} className={`transition ${isActive ? 'bg-sky-50/50' : 'hover:bg-slate-50/80'}`}>
                    <td className="py-3 px-4 font-mono font-bold text-sky-700">
                      {item.simulationId}
                      {isActive && (
                        <span className="ml-1.5 text-[9px] bg-sky-100 text-sky-800 px-1 py-0.2 rounded font-sans uppercase font-bold">
                          Active
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">{item.scenarioName}</div>
                      <div className="text-[11px] text-slate-500 line-clamp-1">{item.summary}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[11px] font-medium border border-slate-200">
                        {item.scenarioType}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-700">
                      {item.durationDays} Days
                    </td>
                    <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                      {item.createdAt}
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        {item.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => loadHistoricalSimulation(item.simulationId)}
                        className="inline-flex items-center space-x-1.5 text-xs font-semibold px-2.5 py-1 rounded-md bg-sky-50 text-sky-700 hover:bg-sky-100 border border-sky-200 transition"
                        title="Load this simulation into the Digital Twin"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Inspect Run</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
