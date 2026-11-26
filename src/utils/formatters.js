/**
 * Utility functions for scientific and formatting calculations
 */

export const formatTemperature = (val, unit = '°C') => {
  if (val === undefined || val === null || isNaN(val)) return '—';
  return `${Number(val).toFixed(1)}${unit}`;
};

export const formatRainfall = (val, unit = 'mm') => {
  if (val === undefined || val === null || isNaN(val)) return '—';
  return `${Number(val).toFixed(1)} ${unit}`;
};

export const formatHumidity = (val) => {
  if (val === undefined || val === null || isNaN(val)) return '—';
  return `${Math.round(val)}%`;
};

export const formatWindSpeed = (val, unit = 'km/h') => {
  if (val === undefined || val === null || isNaN(val)) return '—';
  return `${Number(val).toFixed(1)} ${unit}`;
};

export const formatPressure = (val, unit = 'hPa') => {
  if (val === undefined || val === null || isNaN(val)) return '—';
  return `${Math.round(val)} ${unit}`;
};

export const formatDelta = (val, unit = '') => {
  if (val === undefined || val === null || isNaN(val)) return '0.0';
  const prefix = val > 0 ? '+' : '';
  return `${prefix}${Number(val).toFixed(1)}${unit}`;
};

export const formatPercentChange = (baseline, scenario) => {
  if (!baseline || baseline === 0 || scenario === undefined || scenario === null) return '0.0%';
  const change = ((scenario - baseline) / Math.abs(baseline)) * 100;
  const prefix = change > 0 ? '+' : '';
  return `${prefix}${change.toFixed(1)}%`;
};

export const getVariableMeta = (variableKey) => {
  const map = {
    temperature: {
      name: 'Surface Temperature',
      shortName: 'Temperature',
      unit: '°C',
      color: '#ea580c',
      badgeClass: 'bg-orange-50 text-orange-700 border-orange-200',
      min: 10,
      max: 48,
    },
    rainfall: {
      name: 'Precipitation',
      shortName: 'Rainfall',
      unit: 'mm',
      color: '#0284c7',
      badgeClass: 'bg-sky-50 text-sky-700 border-sky-200',
      min: 0,
      max: 150,
    },
    humidity: {
      name: 'Relative Humidity',
      shortName: 'Humidity',
      unit: '%',
      color: '#0d9488',
      badgeClass: 'bg-teal-50 text-teal-700 border-teal-200',
      min: 10,
      max: 100,
    },
    windSpeed: {
      name: 'Wind Velocity',
      shortName: 'Wind Speed',
      unit: 'km/h',
      color: '#6366f1',
      badgeClass: 'bg-indigo-50 text-indigo-700 border-indigo-200',
      min: 0,
      max: 90,
    },
    pressure: {
      name: 'Atmospheric Pressure',
      shortName: 'Pressure',
      unit: 'hPa',
      color: '#8b5cf6',
      badgeClass: 'bg-purple-50 text-purple-700 border-purple-200',
      min: 990,
      max: 1025,
    }
  };
  return map[variableKey] || map.temperature;
};
