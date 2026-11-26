import axios from 'axios';
import { adaptSimulationResponse, adaptSimulationHistory, adaptSystemStatus } from './simulationAdapter';

/**
 * SIMULATION API CLIENT
 * 
 * Handles all network requests to the independent Climate Simulation Model backend.
 * Uses environment variables for configuration.
 * Does not hardcode endpoints throughout React components.
 */

const API_BASE_URL = import.meta.env.VITE_SIMULATION_API_URL || 'http://localhost:8000';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
});

/**
 * Check if the climate simulation model backend is reachable and retrieve model info
 */
export const getSimulationStatus = async () => {
  try {
    const response = await apiClient.get('/api/v1/status');
    return {
      connected: true,
      data: adaptSystemStatus(response.data),
      error: null
    };
  } catch (err) {
    return {
      connected: false,
      data: null,
      error: err.response?.data?.message || err.message || 'Cannot connect to simulation model backend'
    };
  }
};

/**
 * Dispatch an experimental scenario perturbation to the climate model
 * @param {Object} scenario - { name, description, durationDays, parameters }
 */
export const runSimulation = async (scenario) => {
  try {
    const payload = {
      scenario_name: scenario.name,
      scenario_description: scenario.description,
      duration_days: scenario.durationDays || 10,
      parameters: {
        temperature_delta: Number(scenario.temperatureDelta || 0),
        rainfall_delta_percent: Number(scenario.rainfallDelta || 0),
        humidity_delta_percent: Number(scenario.humidityDelta || 0),
        wind_speed_delta: Number(scenario.windSpeedDelta || 0),
      }
    };

    const response = await apiClient.post('/api/v1/simulations/run', payload);
    return {
      success: true,
      data: adaptSimulationResponse(response.data),
      error: null
    };
  } catch (err) {
    return {
      success: false,
      data: null,
      error: err.response?.data?.message || err.message || 'Simulation execution failed'
    };
  }
};

/**
 * Fetch a previously computed simulation result by ID
 */
export const getSimulationResults = async (simulationId) => {
  try {
    const response = await apiClient.get(`/api/v1/simulations/${simulationId}`);
    return {
      success: true,
      data: adaptSimulationResponse(response.data),
      error: null
    };
  } catch (err) {
    return {
      success: false,
      data: null,
      error: err.response?.data?.message || err.message || 'Could not fetch simulation results'
    };
  }
};

/**
 * Fetch past simulation run history from backend
 */
export const getSimulationHistory = async () => {
  try {
    const response = await apiClient.get('/api/v1/simulations/history');
    return {
      success: true,
      data: adaptSimulationHistory(response.data),
      error: null
    };
  } catch (err) {
    return {
      success: false,
      data: null,
      error: err.response?.data?.message || err.message || 'Could not retrieve simulation history'
    };
  }
};
