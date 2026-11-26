/**
 * SAMPLE CLIMATE DATA ARCHITECTURE FOR DIGITAL TWIN (INDIA)
 * 
 * DISCLAIMER:
 * All figures and regional points below are structured DEMO DATA for initial interface
 * verification and layout testing. They are clearly identified as DEMO DATA in the UI.
 * Once the climate simulation model API is connected, live model outputs replace this demo dataset.
 */

export const IS_DEMO_DATA = true;
export const DATA_PROVENANCE = "Synthesized Regional Meteorological Baseline (Demo Dataset)";

export const INDIA_REGIONS = [
  {
    id: 'in-delhi',
    name: 'National Capital Region',
    state: 'Delhi / NCR',
    zone: 'Indo-Gangetic Plain',
    lat: 28.6139,
    lng: 77.2090,
    elevation: 216,
    baseline: {
      temperature: 27.4,
      rainfall: 4.2,
      humidity: 58,
      windSpeed: 12.5,
      pressure: 1012
    }
  },
  {
    id: 'in-mumbai',
    name: 'Konkan Coast (Mumbai)',
    state: 'Maharashtra',
    zone: 'Western Coastal Zone',
    lat: 19.0760,
    lng: 72.8777,
    elevation: 14,
    baseline: {
      temperature: 31.2,
      rainfall: 24.8,
      humidity: 82,
      windSpeed: 21.0,
      pressure: 1009
    }
  },
  {
    id: 'in-kolkata',
    name: 'Lower Gangetic Plain (Kolkata)',
    state: 'West Bengal',
    zone: 'Eastern Deltaic Zone',
    lat: 22.5726,
    lng: 88.3639,
    elevation: 9,
    baseline: {
      temperature: 29.8,
      rainfall: 18.5,
      humidity: 78,
      windSpeed: 15.2,
      pressure: 1010
    }
  },
  {
    id: 'in-chennai',
    name: 'Coromandel Coast (Chennai)',
    state: 'Tamil Nadu',
    zone: 'Southern Coastal Zone',
    lat: 13.0827,
    lng: 80.2707,
    elevation: 7,
    baseline: {
      temperature: 30.5,
      rainfall: 12.0,
      humidity: 74,
      windSpeed: 17.8,
      pressure: 1011
    }
  },
  {
    id: 'in-bengaluru',
    name: 'Deccan Plateau (Bengaluru)',
    state: 'Karnataka',
    zone: 'South Deccan Plateau',
    lat: 12.9716,
    lng: 77.5946,
    elevation: 920,
    baseline: {
      temperature: 25.1,
      rainfall: 8.6,
      humidity: 64,
      windSpeed: 14.0,
      pressure: 1014
    }
  },
  {
    id: 'in-ahmedabad',
    name: 'Western Semi-Arid (Ahmedabad)',
    state: 'Gujarat',
    zone: 'Western Zone',
    lat: 23.0225,
    lng: 72.5714,
    elevation: 53,
    baseline: {
      temperature: 33.6,
      rainfall: 2.1,
      humidity: 46,
      windSpeed: 16.4,
      pressure: 1010
    }
  },
  {
    id: 'in-jaipur',
    name: 'Thar Transition Zone (Jaipur)',
    state: 'Rajasthan',
    zone: 'North-Western Arid',
    lat: 26.9124,
    lng: 75.7873,
    elevation: 431,
    baseline: {
      temperature: 34.2,
      rainfall: 1.2,
      humidity: 38,
      windSpeed: 13.8,
      pressure: 1011
    }
  },
  {
    id: 'in-shimla',
    name: 'Western Himalayas (Shimla)',
    state: 'Himachal Pradesh',
    zone: 'Montane Alpine',
    lat: 31.1048,
    lng: 77.1734,
    elevation: 2206,
    baseline: {
      temperature: 15.8,
      rainfall: 16.2,
      humidity: 62,
      windSpeed: 19.5,
      pressure: 988
    }
  },
  {
    id: 'in-guwahati',
    name: 'Brahmaputra Valley (Guwahati)',
    state: 'Assam',
    zone: 'North-Eastern Humid',
    lat: 26.1445,
    lng: 91.7362,
    elevation: 55,
    baseline: {
      temperature: 26.8,
      rainfall: 32.4,
      humidity: 86,
      windSpeed: 9.8,
      pressure: 1010
    }
  },
  {
    id: 'in-bhopal',
    name: 'Central Highland (Bhopal)',
    state: 'Madhya Pradesh',
    zone: 'Central Continental Zone',
    lat: 23.2599,
    lng: 77.4126,
    elevation: 527,
    baseline: {
      temperature: 29.2,
      rainfall: 6.8,
      humidity: 52,
      windSpeed: 11.2,
      pressure: 1012
    }
  },
  {
    id: 'in-hyderabad',
    name: 'Telangana Plateau (Hyderabad)',
    state: 'Telangana',
    zone: 'Central Deccan',
    lat: 17.3850,
    lng: 78.4867,
    elevation: 542,
    baseline: {
      temperature: 28.7,
      rainfall: 9.4,
      humidity: 61,
      windSpeed: 13.2,
      pressure: 1011
    }
  },
  {
    id: 'in-patna',
    name: 'Middle Gangetic Plain (Patna)',
    state: 'Bihar',
    zone: 'Indo-Gangetic Plain',
    lat: 25.5941,
    lng: 85.1376,
    elevation: 53,
    baseline: {
      temperature: 28.9,
      rainfall: 14.1,
      humidity: 71,
      windSpeed: 10.5,
      pressure: 1012
    }
  }
];

// Helper to generate a realistic 10-day baseline simulation series
export const generateBaselineSimulation = () => {
  const days = [];
  const baseDate = new Date();

  // Natural synoptic patterns across 10 days
  const tempFluctuations = [0, 0.4, 0.9, 1.2, 0.8, -0.3, -0.8, -0.2, 0.3, 0.7];
  const rainFluctuations = [0, 2.5, 6.8, 12.0, 8.4, 3.2, 1.0, 0.4, 2.1, 4.5];
  const humFluctuations = [0, 2, 5, 8, 4, -2, -4, -1, 1, 3];
  const windFluctuations = [0, 1.2, 2.8, 4.1, 1.8, -1.0, -2.1, -0.5, 0.8, 1.5];
  const pressFluctuations = [0, -1, -2, -3, -1, 1, 2, 1, 0, -1];

  for (let i = 0; i < 10; i++) {
    const d = new Date(baseDate);
    d.setDate(baseDate.getDate() + i);
    const dateString = d.toISOString().split('T')[0];

    // Compute regional metrics for Day i
    const regionalData = INDIA_REGIONS.map(reg => {
      // Localized variation for realism
      const regTemp = +(reg.baseline.temperature + tempFluctuations[i] + (Math.sin(i + reg.lat) * 0.4)).toFixed(1);
      const regRain = +Math.max(0, reg.baseline.rainfall + rainFluctuations[i] + (Math.cos(i + reg.lng) * 1.5)).toFixed(1);
      const regHum = +Math.min(99, Math.max(25, reg.baseline.humidity + humFluctuations[i])).toFixed(0);
      const regWind = +Math.max(2, reg.baseline.windSpeed + windFluctuations[i]).toFixed(1);
      const regPress = +(reg.baseline.pressure + pressFluctuations[i]).toFixed(0);

      return {
        id: reg.id,
        name: reg.name,
        state: reg.state,
        zone: reg.zone,
        lat: reg.lat,
        lng: reg.lng,
        elevation: reg.elevation,
        temperature: regTemp,
        rainfall: regRain,
        humidity: regHum,
        windSpeed: regWind,
        pressure: regPress
      };
    });

    // Compute aggregate national averages
    const avgTemp = +(regionalData.reduce((s, r) => s + r.temperature, 0) / regionalData.length).toFixed(1);
    const avgRain = +(regionalData.reduce((s, r) => s + r.rainfall, 0) / regionalData.length).toFixed(1);
    const avgHum = Math.round(regionalData.reduce((s, r) => s + r.humidity, 0) / regionalData.length);
    const avgWind = +(regionalData.reduce((s, r) => s + r.windSpeed, 0) / regionalData.length).toFixed(1);
    const avgPress = Math.round(regionalData.reduce((s, r) => s + r.pressure, 0) / regionalData.length);

    days.push({
      dayIndex: i,
      dayNumber: i + 1,
      dateString,
      displayLabel: `Day ${i + 1}`,
      nationalAverages: {
        temperature: avgTemp,
        rainfall: avgRain,
        humidity: avgHum,
        windSpeed: avgWind,
        pressure: avgPress
      },
      regionalData
    });
  }

  return {
    simulationId: 'SIM-BASE-2026-IN',
    scenarioName: 'Historical Synoptic Baseline (Control)',
    description: '10-Day Standard Synoptic Meteorological Baseline for the Indian Subcontinent.',
    isLive: false,
    isDemo: true,
    createdAt: new Date().toISOString(),
    durationDays: 10,
    days
  };
};

export const INITIAL_SIMULATION_HISTORY = [
  {
    simulationId: 'SIM-HIST-001',
    scenarioName: 'Pre-Monsoon Heatwave (+2.5°C)',
    createdAt: '2026-11-25 14:30',
    durationDays: 10,
    status: 'Completed',
    scenarioType: 'Thermal Perturbation',
    summary: 'Elevated peak daytime temperatures across Central and NW India by 2.2°C - 3.8°C.'
  },
  {
    simulationId: 'SIM-HIST-002',
    scenarioName: 'Cyclonic Storm Surge (Arabian Sea)',
    createdAt: '2026-11-24 10:15',
    durationDays: 10,
    status: 'Completed',
    scenarioType: 'Precipitation & Wind Impact',
    summary: 'Wind speeds +25 km/h along Konkan Coast, precipitation surge up to 140mm.'
  },
  {
    simulationId: 'SIM-HIST-003',
    scenarioName: 'El-Niño Dry Spell Simulation',
    createdAt: '2026-11-22 18:45',
    durationDays: 10,
    status: 'Completed',
    scenarioType: 'Drought Vulnerability',
    summary: '40% reduction in accumulated precipitation over Indo-Gangetic & Deccan areas.'
  }
];
