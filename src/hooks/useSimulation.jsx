import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { generateBaselineSimulation, INITIAL_SIMULATION_HISTORY, INDIA_REGIONS } from '../data/sampleData.js';
import { getSimulationStatus, runSimulation as apiRunSimulation, getSimulationHistory as apiGetHistory } from '../services/simulationApi.js';
import { runDemoSimulation } from '../services/demoSimulation.js';

const SimulationContext = createContext(null);

export const SimulationProvider = ({ children }) => {
  // Connection state: 'DEMO' | 'CONNECTED' | 'ERROR'
  const [connectionStatus, setConnectionStatus] = useState('DEMO');
  const [backendError, setBackendError] = useState(null);
  const [backendInfo, setBackendInfo] = useState(null);

  // Baseline data
  const [baselineSimulation] = useState(() => generateBaselineSimulation());

  // Active viewed simulation and comparison scenario
  const [activeSimulation, setActiveSimulation] = useState(() => baselineSimulation);
  const [scenarioSimulation, setScenarioSimulation] = useState(null);

  // Selected Day Index (0 to 9 for 10-day model)
  const [selectedDayIndex, setSelectedDayIndex] = useState(0);

  // Active climate variable for layer rendering
  const [selectedVariable, setSelectedVariable] = useState('temperature');

  // Currently inspected geographic region
  const [selectedRegionId, setSelectedRegionId] = useState('in-delhi');

  // Timeline playback state
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1); // 1x or 2x
  const playIntervalRef = useRef(null);

  // Loading state during simulation runs
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationError, setSimulationError] = useState(null);

  // History list with localStorage persistence
  const [historyList, setHistoryList] = useState(() => {
    try {
      if (typeof window !== 'undefined') {
        const cached = localStorage.getItem('climate_twin_history');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      }
    } catch (e) {
      console.warn('Could not read history from localStorage', e);
    }
    return INITIAL_SIMULATION_HISTORY;
  });

  // Persist history changes across refreshes
  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('climate_twin_history', JSON.stringify(historyList));
      }
    } catch (e) {
      console.warn('Could not persist history to localStorage', e);
    }
  }, [historyList]);

  // Active page / view navigation
  const [activeTab, setActiveTab] = useState('overview');

  // Sidebar collapse toggle
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Proactive check of model backend connection
  const checkBackendHealth = useCallback(async () => {
    const res = await getSimulationStatus();
    if (res.connected && res.data) {
      setConnectionStatus('CONNECTED');
      setBackendInfo(res.data);
      setBackendError(null);
    } else {
      setConnectionStatus('DEMO');
      setBackendInfo(null);
      setBackendError(res.error);
    }
  }, []);

  useEffect(() => {
    checkBackendHealth();
  }, [checkBackendHealth]);

  // Allows testing & QA of all 3 API connection modes
  const setSimulatedConnectionMode = (mode) => {
    if (mode === 'CONNECTED') {
      setConnectionStatus('CONNECTED');
      setBackendInfo({
        status: 'healthy',
        modelName: 'IndiaRegionalClimateModel-v2',
        version: 'v2.4.1',
        resolutionKm: 25,
        supportedDays: 10,
        lastUpdated: new Date().toISOString()
      });
      setBackendError(null);
    } else if (mode === 'ERROR') {
      setConnectionStatus('ERROR');
      setBackendInfo(null);
      setBackendError('ERR_CONNECTION_REFUSED: Climate simulation API host at port 8000 is unreachable.');
    } else {
      setConnectionStatus('DEMO');
      setBackendInfo(null);
      setBackendError('Demo mode active. Operating on local synthesized baseline.');
    }
  };

  // Timeline playback controller with speed support
  useEffect(() => {
    if (isPlaying) {
      const intervalMs = playbackSpeed === 2 ? 800 : 1600;
      playIntervalRef.current = setInterval(() => {
        setSelectedDayIndex(prev => {
          const totalDays = activeSimulation?.days?.length || 10;
          if (prev >= totalDays - 1) {
            return 0; // loop back to day 1
          }
          return prev + 1;
        });
      }, intervalMs);
    } else {
      if (playIntervalRef.current) {
        clearInterval(playIntervalRef.current);
      }
    }
    return () => {
      if (playIntervalRef.current) clearInterval(playIntervalRef.current);
    };
  }, [isPlaying, activeSimulation, playbackSpeed]);

  // Execute scenario with day clamping and error handling
  const executeScenario = async (scenarioParams) => {
    setIsSimulating(true);
    setSimulationError(null);

    try {
      if (connectionStatus === 'CONNECTED') {
        const response = await apiRunSimulation(scenarioParams);
        if (response.success && response.data) {
          setActiveSimulation(response.data);
          setScenarioSimulation(response.data);
          setSelectedDayIndex(prev => Math.min(prev, (response.data.days?.length || 10) - 1));

          setHistoryList(prev => [
            {
              simulationId: response.data.simulationId,
              scenarioName: response.data.scenarioName,
              createdAt: new Date().toLocaleDateString('en-IN') + ' ' + new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
              durationDays: response.data.durationDays,
              status: 'Completed',
              scenarioType: 'Live Model Computation',
              summary: response.data.description,
              parameters: scenarioParams
            },
            ...prev
          ]);
        } else {
          throw new Error(response.error || 'Backend model execution failed');
        }
      } else {
        await new Promise(r => setTimeout(r, 600)); // realistic UX feedback
        const demoResult = runDemoSimulation(scenarioParams);
        setActiveSimulation(demoResult);
        setScenarioSimulation(demoResult);
        setSelectedDayIndex(prev => Math.min(prev, (demoResult.days?.length || 10) - 1));

        setHistoryList(prev => [
          {
            simulationId: demoResult.simulationId,
            scenarioName: demoResult.scenarioName,
            createdAt: new Date().toLocaleDateString('en-IN') + ' ' + new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
            durationDays: demoResult.durationDays,
            status: 'Completed (Demo)',
            scenarioType: 'Parametric Perturbation',
            summary: demoResult.description,
            parameters: scenarioParams
          },
          ...prev
        ]);
      }
    } catch (err) {
      setSimulationError(err.message || 'Error executing scenario');
    } finally {
      setIsSimulating(false);
    }
  };

  // Load a historical simulation run directly into the digital twin
  const loadHistoricalSimulation = (simulationId) => {
    const historical = historyList.find(h => h.simulationId === simulationId);
    let params = historical?.parameters;

    // Preset configurations for default historical records
    if (!params) {
      if (simulationId === 'SIM-HIST-001') {
        params = { name: 'Pre-Monsoon Heatwave (+2.5°C)', description: 'Historical heatwave perturbation', temperatureDelta: 2.5, rainfallDelta: -20, humidityDelta: -10, windSpeedDelta: 2, durationDays: 10 };
      } else if (simulationId === 'SIM-HIST-002') {
        params = { name: 'Cyclonic Storm Surge (Arabian Sea)', description: 'Historical cyclone wind and rain burst', temperatureDelta: -1.0, rainfallDelta: 50, humidityDelta: 25, windSpeedDelta: 22, durationDays: 8 };
      } else {
        params = { name: 'El-Niño Dry Spell Simulation', description: 'Historical drought condition', temperatureDelta: 3.0, rainfallDelta: -45, humidityDelta: -20, windSpeedDelta: 1, durationDays: 10 };
      }
    }

    const sim = runDemoSimulation({ ...params, simulationId });
    setActiveSimulation(sim);
    setScenarioSimulation(sim);
    setSelectedDayIndex(0);
    setActiveTab('comparison');
  };

  const resetToBaseline = () => {
    setActiveSimulation(baselineSimulation);
    setScenarioSimulation(null);
    setSelectedDayIndex(0);
  };

  // Helper selectors
  const currentDayData = activeSimulation?.days?.[selectedDayIndex] || baselineSimulation.days[0];
  const baselineDayData = baselineSimulation.days[selectedDayIndex] || baselineSimulation.days[0];
  const selectedRegionData = currentDayData?.regionalData?.find(r => r.id === selectedRegionId) || currentDayData?.regionalData?.[0];

  const value = {
    connectionStatus,
    setConnectionStatus,
    backendError,
    backendInfo,
    checkBackendHealth,
    setSimulatedConnectionMode,
    baselineSimulation,
    activeSimulation,
    scenarioSimulation,
    selectedDayIndex,
    setSelectedDayIndex,
    selectedVariable,
    setSelectedVariable,
    selectedRegionId,
    setSelectedRegionId,
    selectedRegionData,
    currentDayData,
    baselineDayData,
    isPlaying,
    setIsPlaying,
    playbackSpeed,
    setPlaybackSpeed,
    isSimulating,
    simulationError,
    executeScenario,
    resetToBaseline,
    historyList,
    loadHistoricalSimulation,
    activeTab,
    setActiveTab,
    sidebarCollapsed,
    setSidebarCollapsed,
    regions: INDIA_REGIONS
  };

  return (
    <SimulationContext.Provider value={value}>
      {children}
    </SimulationContext.Provider>
  );
};

export const useSimulation = () => {
  const context = useContext(SimulationContext);
  if (!context) {
    throw new Error('useSimulation must be used within a SimulationProvider');
  }
  return context;
};
