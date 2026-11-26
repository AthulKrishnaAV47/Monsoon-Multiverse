import { generateBaselineSimulation } from '../data/sampleData.js';

/**
 * DEMO SIMULATION ENGINE
 * 
 * Used ONLY when VITE_DEFAULT_MODE=DEMO or when the external simulation API is unreachable.
 * Clearly labeled across the entire UI as DEMO DATA.
 * Generates a full 10-day forward synoptic progression with realistic parametric forcing.
 */

export const runDemoSimulation = (scenarioConfig) => {
  const base = generateBaselineSimulation();
  const tempDelta = Number(scenarioConfig.temperatureDelta || 0);
  const rainDeltaPct = Number(scenarioConfig.rainfallDelta || 0);
  const humDeltaPct = Number(scenarioConfig.humidityDelta || 0);
  const windDelta = Number(scenarioConfig.windSpeedDelta || 0);

  const duration = Math.min(10, Math.max(1, Number(scenarioConfig.durationDays || 10)));

  // Always produce a 10-day synoptic timeline
  const modifiedDays = base.days.map((day, dayIdx) => {
    // For days within the scenario duration, apply full forcing;
    // for days beyond duration, gradually taper forcing back toward baseline
    const forcingFactor = dayIdx < duration ? 1.0 : Math.max(0, 1.0 - (dayIdx - duration + 1) * 0.35);

    const regionalData = day.regionalData.map(reg => {
      const effTempDelta = +(tempDelta * forcingFactor).toFixed(1);
      const effRainDeltaPct = +(rainDeltaPct * forcingFactor).toFixed(1);
      const effHumDeltaPct = +(humDeltaPct * forcingFactor).toFixed(1);
      const effWindDelta = +(windDelta * forcingFactor).toFixed(1);

      const newTemp = +(reg.temperature + effTempDelta).toFixed(1);
      const newRain = +Math.max(0, reg.rainfall * (1 + effRainDeltaPct / 100)).toFixed(1);
      const newHum = +Math.min(100, Math.max(15, reg.humidity * (1 + effHumDeltaPct / 100))).toFixed(0);
      const newWind = +Math.max(0, reg.windSpeed + effWindDelta).toFixed(1);
      const pressAdjustment = -(effTempDelta * 0.4);
      const newPress = Math.round(reg.pressure + pressAdjustment);

      return {
        ...reg,
        temperature: newTemp,
        rainfall: newRain,
        humidity: newHum,
        windSpeed: newWind,
        pressure: newPress
      };
    });

    const avgTemp = +(regionalData.reduce((s, r) => s + r.temperature, 0) / regionalData.length).toFixed(1);
    const avgRain = +(regionalData.reduce((s, r) => s + r.rainfall, 0) / regionalData.length).toFixed(1);
    const avgHum = Math.round(regionalData.reduce((s, r) => s + r.humidity, 0) / regionalData.length);
    const avgWind = +(regionalData.reduce((s, r) => s + r.windSpeed, 0) / regionalData.length).toFixed(1);
    const avgPress = Math.round(regionalData.reduce((s, r) => s + r.pressure, 0) / regionalData.length);

    return {
      ...day,
      nationalAverages: {
        temperature: avgTemp,
        rainfall: avgRain,
        humidity: avgHum,
        windSpeed: avgWind,
        pressure: avgPress
      },
      regionalData
    };
  });

  return {
    simulationId: scenarioConfig.simulationId || `SIM-DEMO-${Date.now().toString().slice(-6)}`,
    scenarioName: scenarioConfig.name || 'Custom Experimental Scenario',
    description: scenarioConfig.description || 'Interactive parameter evaluation (Demo Mode)',
    isLive: false,
    isDemo: true,
    createdAt: scenarioConfig.createdAt || new Date().toISOString(),
    durationDays: duration,
    parameters: {
      temperatureDelta: tempDelta,
      rainfallDelta: rainDeltaPct,
      humidityDelta: humDeltaPct,
      windSpeedDelta: windDelta
    },
    days: modifiedDays
  };
};
