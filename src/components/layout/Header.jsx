import React, { useState, useEffect } from 'react';
import { 
  Globe2, 
  Activity, 
  Server, 
  Wifi, 
  WifiOff, 
  RefreshCw, 
  User, 
  Clock, 
  Layers,
  ChevronDown,
  Info,
  Check,
  AlertTriangle
} from 'lucide-react';
import { useSimulation } from '../../hooks/useSimulation';

export const Header = () => {
  const { 
    connectionStatus, 
    backendInfo, 
    backendError, 
    checkBackendHealth, 
    setSimulatedConnectionMode,
    activeSimulation,
    isSimulating
  } = useSimulation();

  const [currentTime, setCurrentTime] = useState(new Date());
  const [isChecking, setIsChecking] = useState(false);
  const [showStatusTooltip, setShowStatusTooltip] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleManualCheck = async () => {
    setIsChecking(true);
    await checkBackendHealth();
    setTimeout(() => setIsChecking(false), 500);
  };

  const formattedTime = currentTime.toLocaleTimeString('en-IN', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });

  const formattedDate = currentTime.toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-40 select-none shadow-sm">
      <div className="px-4 lg:px-6 py-2.5 flex flex-wrap items-center justify-between gap-4">
        {/* Left: Brand & Title */}
        <div className="flex items-center space-x-3.5">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-tr from-sky-700 to-cyan-500 flex items-center justify-center text-white shadow-sm ring-1 ring-sky-600/30">
            <Globe2 className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-base lg:text-lg font-bold tracking-tight text-slate-900 flex items-center">
                CLIMATE DIGITAL TWIN
              </h1>
              <span className="bg-sky-100 text-sky-800 text-[10px] font-semibold px-2 py-0.5 rounded border border-sky-200">
                INDIA
              </span>
            </div>
            <p className="text-xs text-slate-700 font-medium hidden sm:block">
              Subcontinental Climate Simulation & Geospatial Intelligence Platform
            </p>
          </div>
        </div>

        {/* Center: Synoptic Run State & Provenance Badge */}
        <div className="hidden md:flex items-center space-x-3 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg text-xs">
          <div className="flex items-center space-x-2">
            <Activity className={`w-3.5 h-3.5 ${isSimulating ? 'text-amber-500 animate-spin' : 'text-cyan-600'}`} />
            <span className="text-slate-700 font-semibold">Active Run:</span>
            <span className="font-semibold text-slate-800 max-w-[200px] truncate" title={activeSimulation.scenarioName}>
              {activeSimulation.scenarioName}
            </span>
          </div>
          <div className="h-3 w-px bg-slate-300"></div>
          <div className="flex items-center space-x-1.5">
            <Layers className="w-3.5 h-3.5 text-slate-600" />
            <span className="text-slate-700 font-semibold">Source:</span>
            {activeSimulation.isDemo ? (
              <span className="bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded text-[10px] font-bold tracking-wide uppercase border border-amber-200">
                DEMO DATA
              </span>
            ) : (
              <span className="bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded text-[10px] font-bold tracking-wide uppercase border border-emerald-200">
                LIVE MODEL
              </span>
            )}
          </div>
        </div>

        {/* Right: API Connectivity, Live Time, Profile */}
        <div className="flex items-center space-x-3">
          {/* Live Date & IST Clock */}
          <div className="hidden xl:flex items-center space-x-2 text-xs font-mono text-slate-700 bg-slate-100/80 px-2.5 py-1.5 rounded border border-slate-200">
            <Clock className="w-3.5 h-3.5 text-slate-600" />
            <span>{formattedDate}</span>
            <span className="font-semibold text-slate-900">{formattedTime} IST</span>
          </div>

          {/* Model API Status Badge */}
          <div className="relative">
            <button
              onClick={() => setShowStatusTooltip(!showStatusTooltip)}
              className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                connectionStatus === 'CONNECTED'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                  : connectionStatus === 'ERROR'
                  ? 'bg-red-50 text-red-800 border-red-200 hover:bg-red-100'
                  : 'bg-amber-50 text-amber-900 border-amber-200 hover:bg-amber-100'
              }`}
              title="Click for Simulation API status details"
            >
              {connectionStatus === 'CONNECTED' ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                  <Wifi className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="hidden sm:inline font-semibold">Model Connected</span>
                </>
              ) : connectionStatus === 'ERROR' ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-red-500"></span>
                  <WifiOff className="w-3.5 h-3.5 text-red-600" />
                  <span className="hidden sm:inline font-semibold">Connection Error</span>
                </>
              ) : (
                <>
                  <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                  <Server className="w-3.5 h-3.5 text-amber-700" />
                  <span className="hidden sm:inline font-semibold">Demo Mode</span>
                </>
              )}
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {/* Status Dropdown Popover with Mode Testing */}
            {showStatusTooltip && (
              <div 
                className="absolute right-0 mt-2 w-84 bg-white border border-slate-200 rounded-lg shadow-xl p-4 text-xs z-50 animate-in fade-in slide-in-from-top-1"
                onMouseLeave={() => setShowStatusTooltip(false)}
              >
                <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
                  <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                    <Server className="w-3.5 h-3.5 text-slate-500" /> Simulation API Endpoint
                  </span>
                  <button 
                    onClick={handleManualCheck}
                    disabled={isChecking}
                    className="p-1 hover:bg-slate-100 rounded text-slate-500 hover:text-slate-800 transition"
                    title="Probe API Endpoint"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin' : ''}`} />
                  </button>
                </div>

                <div className="mt-2.5 space-y-1.5 text-slate-600">
                  <div className="flex justify-between">
                    <span className="text-slate-700">Target URL:</span>
                    <span className="font-mono text-slate-700 truncate max-w-[170px]" title={import.meta.env.VITE_SIMULATION_API_URL || 'http://localhost:8000'}>
                      {import.meta.env.VITE_SIMULATION_API_URL || 'http://localhost:8000'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-700">Active State:</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                      connectionStatus === 'CONNECTED' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                      connectionStatus === 'ERROR' ? 'bg-red-50 text-red-700 border-red-200' :
                      'bg-amber-50 text-amber-800 border-amber-200'
                    }`}>
                      {connectionStatus === 'CONNECTED' ? 'Connected' : connectionStatus === 'ERROR' ? 'Error' : 'Demo Mode'}
                    </span>
                  </div>
                  {backendInfo && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-slate-700">Model:</span>
                        <span className="font-semibold text-slate-800">{backendInfo.modelName} ({backendInfo.version})</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-700">Mesh Resolution:</span>
                        <span className="font-semibold text-slate-800">{backendInfo.resolutionKm} km</span>
                      </div>
                    </>
                  )}
                  {backendError && (
                    <div className="mt-2 p-2 bg-slate-50 rounded border border-slate-200 text-slate-700 text-[11px] leading-relaxed">
                      <strong>Status Detail:</strong> {backendError}
                    </div>
                  )}
                </div>

                {/* API Mode Testing Controls for QA & Evaluators */}
                <div className="mt-3 pt-2.5 border-t border-slate-100 space-y-2">
                  <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block">
                    Mode Testing & Verification
                  </span>
                  <div className="grid grid-cols-3 gap-1.5 text-[11px]">
                    <button
                      onClick={() => setSimulatedConnectionMode('DEMO')}
                      className={`px-2 py-1.5 rounded border text-center transition ${
                        connectionStatus === 'DEMO'
                          ? 'bg-amber-100 text-amber-900 border-amber-300 font-bold'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      Demo Mode
                    </button>
                    <button
                      onClick={() => setSimulatedConnectionMode('CONNECTED')}
                      className={`px-2 py-1.5 rounded border text-center transition ${
                        connectionStatus === 'CONNECTED'
                          ? 'bg-emerald-100 text-emerald-900 border-emerald-300 font-bold'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      Connected
                    </button>
                    <button
                      onClick={() => setSimulatedConnectionMode('ERROR')}
                      className={`px-2 py-1.5 rounded border text-center transition ${
                        connectionStatus === 'ERROR'
                          ? 'bg-red-100 text-red-900 border-red-300 font-bold'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      Error
                    </button>
                  </div>
                </div>

                <div className="mt-3 pt-2 border-t border-slate-100 text-[11px] text-slate-500 flex items-center gap-1">
                  <Info className="w-3 h-3 flex-shrink-0 text-slate-400" />
                  <span>Adapter layer isolates frontend from prediction algorithm changes.</span>
                </div>
              </div>
            )}
          </div>

          {/* User Profile / Scientist Badge */}
          <div className="flex items-center space-x-2 pl-2 border-l border-slate-200">
            <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-300 flex items-center justify-center text-slate-700 hover:bg-slate-200 cursor-pointer transition">
              <User className="w-4 h-4" />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
