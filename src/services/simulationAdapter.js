/**
 * SIMULATION DATA ADAPTER
 * 
 * Translates external backend responses (from the independent climate model team)
 * into standard normalized structures consumed by the Digital Twin interface.
 * 
 * Defensive parsing: guards against nulls, undefined, NaN, and unexpected formats.
 */

import { generateBaselineSimulation } from '../data/sampleData.js';

// Safe number parser with strict fallback
const safeNumber = (val, fallback = 0) => {
  if (val === null || val === undefined || val === '') return fallback;
  const num = Number(val);
  return isNaN(num) ? fallback : num;
};

export const adaptSystemStatus = (raw) => {
  if (!raw || typeof raw !== 'object') {
    return {
      status: 'offline',
      modelName: 'Climate Model (Unreachable)',
      version: 'unknown',
      resolutionKm: 25,
      supportedDays: 10,
      lastUpdated: new Date().toISOString()
    };
  }
  return {
    status: raw.status || 'online',
    modelName: raw.model_name || raw.modelName || 'Climate Model (Remote)',
    version: raw.version || 'v1.0.0',
    resolutionKm: safeNumber(raw.mesh_resolution_km || raw.resolution, 25),
    supportedDays: safeNumber(raw.supported_days || raw.supportedDays, 10),
    lastUpdated: raw.last_updated || raw.lastUpdated || new Date().toISOString()
  };
};

export const adaptSimulationResponse = (raw) => {
  if (!raw || typeof raw !== 'object') return null;

  const rawDays = raw.daily_projections || raw.days || [];

  // If backend returns empty daily projections, fallback safely to baseline structure
  if (!Array.isArray(rawDays) || rawDays.length === 0) {
    const fallbackBase = generateBaselineSimulation();
    return {
      simulationId: raw.simulation_id || raw.simulationId || `SIM-${Date.now()}`,
      scenarioName: raw.scenario_name || raw.scenarioName || 'Simulation Output (Fallback Baseline)',
      description: raw.scenario_description || raw.description || 'Simulated response populated from fallback baseline structure.',
      isLive: true,
      isDemo: false,
      createdAt: raw.created_at || raw.createdAt || new Date().toISOString(),
      durationDays: 10,
      days: fallbackBase.days
    };
  }

  // Adapt days and regional metrics defensively
  const days = rawDays.map((d, index) => {
    const dayNumber = safeNumber(d.day || d.dayNumber, index + 1);
    const dateString = d.date || d.dateString || new Date().toISOString().split('T')[0];

    const nat = d.metrics || d.nationalAverages || {};
    const nationalAverages = {
      temperature: safeNumber(nat.temperature ?? nat.temp, 28.0),
      rainfall: safeNumber(nat.rainfall ?? nat.precip, 15.0),
      humidity: safeNumber(nat.humidity ?? nat.rel_humidity, 65),
      windSpeed: safeNumber(nat.windSpeed ?? nat.wind_speed, 14.0),
      pressure: safeNumber(nat.pressure ?? nat.atm_pressure, 1010),
    };

    const regionalList = d.regional_data || d.regions || [];
    const regionalData = Array.isArray(regionalList)
      ? regionalList.map((r, rIdx) => ({
          id: String(r.region_id || r.id || `reg-${rIdx}`),
          name: r.name || `Station ${rIdx + 1}`,
          state: r.state || '',
          zone: r.zone || '',
          lat: safeNumber(r.lat || r.latitude, 20.0),
          lng: safeNumber(r.lng || r.longitude, 78.0),
          elevation: safeNumber(r.elevation, 0),
          temperature: safeNumber(r.temperature ?? r.temp, 25.0),
          rainfall: safeNumber(r.rainfall ?? r.precip, 0),
          humidity: safeNumber(r.humidity ?? r.rel_humidity, 50),
          windSpeed: safeNumber(r.windSpeed ?? r.wind_speed, 10.0),
          pressure: safeNumber(r.pressure ?? r.atm_pressure, 1012),
        }))
      : [];

    return {
      dayIndex: index,
      dayNumber,
      dateString,
      displayLabel: `Day ${dayNumber}`,
      nationalAverages,
      regionalData
    };
  });

  return {
    simulationId: String(raw.simulation_id || raw.simulationId || `SIM-${Date.now()}`),
    scenarioName: String(raw.scenario_name || raw.scenarioName || 'Custom Scenario Simulation'),
    description: String(raw.scenario_description || raw.description || 'Calculated regional forward simulation'),
    isLive: true,
    isDemo: false,
    createdAt: raw.created_at || raw.createdAt || new Date().toISOString(),
    durationDays: safeNumber(raw.duration_days || raw.durationDays, days.length || 10),
    days
  };
};

export const adaptSimulationHistory = (raw) => {
  if (!Array.isArray(raw)) return [];
  return raw.map((item, idx) => ({
    simulationId: String(item.simulation_id || item.simulationId || `HIST-${idx}`),
    scenarioName: String(item.scenario_name || item.scenarioName || 'Unnamed Scenario'),
    createdAt: item.created_at || item.createdAt || 'N/A',
    durationDays: safeNumber(item.duration_days || item.durationDays, 10),
    status: item.status || 'Completed',
    scenarioType: item.scenario_type || item.scenarioType || 'Parametric Run',
    summary: item.summary || item.scenario_description || 'Computed simulation records'
  }));
};
