// Automated verification test script for Climate Digital Twin
import { generateBaselineSimulation, INDIA_REGIONS, INITIAL_SIMULATION_HISTORY } from './src/data/sampleData.js';
import { runDemoSimulation } from './src/services/demoSimulation.js';
import { adaptSimulationResponse, adaptSystemStatus, adaptSimulationHistory } from './src/services/simulationAdapter.js';
import { 
  formatTemperature, 
  formatRainfall, 
  formatHumidity, 
  formatWindSpeed, 
  formatPressure, 
  formatPercentChange, 
  formatDelta, 
  getVariableMeta 
} from './src/utils/formatters.js';

console.log('--- STARTING COMPREHENSIVE QA AUDIT TEST SUITE ---');

let passedTests = 0;
let totalTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    console.log(`[PASS] ${message}`);
    passedTests++;
  } else {
    console.error(`[FAIL] ${message}`);
    process.exit(1);
  }
}

// 1. Data Integrity & Regions
assert(INDIA_REGIONS.length === 12, '12 Indian regional stations configured across distinct climatic zones');
assert(INDIA_REGIONS.every(r => r.lat && r.lng && r.baseline), 'Every station has valid coordinates and baseline data');

// 2. Baseline generation
const baseline = generateBaselineSimulation();
assert(baseline.days.length === 10, 'Baseline generates exactly 10 forward days');
assert(baseline.days.every(d => d.regionalData.length === 12), 'Every day holds 12 station records');
assert(baseline.days.every(d => d.nationalAverages.temperature > 0), 'Every day computes positive national average temperature');

// 3. Demo simulation engine with all 4 presets
const presets = [
  { name: 'IPCC +2°C Warming', temperatureDelta: 2.0, rainfallDelta: -10, humidityDelta: -8, windSpeedDelta: 2.0, durationDays: 10 },
  { name: 'Monsoon Flash Flooding', temperatureDelta: -0.5, rainfallDelta: 45, humidityDelta: 15, windSpeedDelta: 8.0, durationDays: 10 },
  { name: 'Severe Arid Drought', temperatureDelta: 3.5, rainfallDelta: -40, humidityDelta: -25, windSpeedDelta: 1.5, durationDays: 10 },
  { name: 'Cyclonic Storm Surge', temperatureDelta: -1.0, rainfallDelta: 35, humidityDelta: 20, windSpeedDelta: 18.0, durationDays: 7 }
];

presets.forEach(p => {
  const result = runDemoSimulation(p);
  assert(result.days.length === 10, `Preset "${p.name}" produces full 10-day synoptic timeline`);
  assert(result.parameters.temperatureDelta === p.temperatureDelta, `Preset "${p.name}" preserves temperature delta`);
  const day1Delta = +(result.days[0].nationalAverages.temperature - baseline.days[0].nationalAverages.temperature).toFixed(1);
  assert(day1Delta === p.temperatureDelta, `Preset "${p.name}" applies expected Day 1 thermal delta (+${day1Delta}°C)`);
});

// 4. Clamping and relaxation test for duration < 10
const shortScenario = runDemoSimulation({
  name: 'Short Horizon Run',
  temperatureDelta: 4.0,
  rainfallDelta: -30,
  humidityDelta: -10,
  windSpeedDelta: 5.0,
  durationDays: 5
});
assert(shortScenario.days.length === 10, 'Short duration still produces 10-day timeline');
const day1Forcing = shortScenario.days[0].nationalAverages.temperature - baseline.days[0].nationalAverages.temperature;
const day10Forcing = shortScenario.days[9].nationalAverages.temperature - baseline.days[9].nationalAverages.temperature;
assert(day1Forcing > day10Forcing, 'Forcing relaxes toward baseline after scenario duration expires');

// 5. Formatters test
assert(formatTemperature(27.4) === '27.4°C', 'formatTemperature renders correct units');
assert(formatRainfall(18.5) === '18.5 mm', 'formatRainfall renders correct units');
assert(formatPercentChange(20, 25) === '+25.0%', 'formatPercentChange handles positive change');
assert(formatPercentChange(20, 15) === '-25.0%', 'formatPercentChange handles negative change');
assert(formatPercentChange(0, 5) === '0.0%', 'formatPercentChange guards against zero division');
assert(formatDelta(3.2, '°C') === '+3.2°C', 'formatDelta formats positive deltas');
assert(formatDelta(-1.5, '°C') === '-1.5°C', 'formatDelta formats negative deltas');

// 6. Variable metadata test
['temperature', 'rainfall', 'humidity', 'windSpeed', 'pressure'].forEach(v => {
  const meta = getVariableMeta(v);
  assert(meta && meta.name && meta.unit && meta.color, `getVariableMeta valid for ${v}`);
});

// 7. Adapter test
const mockApiResponse = {
  simulation_id: 'API-TEST-999',
  scenario_name: 'External Model Run',
  duration_days: 10,
  daily_projections: baseline.days.map((d, i) => ({
    day: i + 1,
    date: d.dateString,
    metrics: { temp: d.nationalAverages.temperature + 1.5, precip: 20.0, rel_humidity: 65, wind_speed: 14, atm_pressure: 1010 },
    regional_data: d.regionalData.map(r => ({
      region_id: r.id,
      name: r.name,
      lat: r.lat,
      lng: r.lng,
      temp: r.temperature + 1.5,
      precip: r.rainfall,
      rel_humidity: r.humidity,
      wind_speed: r.windSpeed,
      atm_pressure: r.pressure
    }))
  }))
};
const adapted = adaptSimulationResponse(mockApiResponse);
assert(adapted.simulationId === 'API-TEST-999', 'Adapter extracts simulationId');
assert(adapted.days.length === 10, 'Adapter maps 10 days');
assert(adapted.days[0].nationalAverages.temperature > 0, 'Adapter maps temperature correctly');
assert(adapted.isLive === true, 'Adapter sets isLive to true for external backend responses');
assert(adapted.isDemo === false, 'Adapter sets isDemo to false for external backend responses');

// 8. History records test
assert(INITIAL_SIMULATION_HISTORY.length === 3, 'Initial history contains 3 benchmark simulation runs');

console.log(`\n--- ALL ${passedTests}/${totalTests} TESTS PASSED SUCCESSFULLY! ---`);
