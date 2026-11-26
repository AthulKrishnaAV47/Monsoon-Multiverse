# Climate Simulation Model – Frontend API Contract Specification

**Version:** 1.0.0-draft  
**Platform:** Climate Digital Twin (India)  
**Target Backend Integration:** Independent Team Simulation & Prediction Model  
**Frontend Base URL Environment Variable:** `VITE_SIMULATION_API_URL` (Default: `http://localhost:8000`)

---

## 1. Overview & Architectural Philosophy

The Climate Digital Twin frontend is decoupled from the specific climate prediction algorithms, machine learning frameworks (e.g., PyTorch, TensorFlow, Jax), or physical numerical weather prediction (NWP) engines.

- **Independent Development:** The frontend functions in **DEMO MODE** when the simulation backend is unavailable, without generating pseudo-scientific fabrications or faking a live server connection.
- **Adapter Layer (`src/services/simulationAdapter.js`):** Ingests the API response and maps it to standard frontend visual models, allowing backend engineers to change JSON structures without breaking UI components.
- **Clear Scientific Demarcation:** All simulated data is clearly badged with simulation run ID, model provenance, and timestamp.

---

## 2. API Endpoints

### 2.1 System Health & Model Status
- **Method:** `GET`
- **Endpoint:** `/api/v1/status`
- **Description:** Verifies that the climate simulation backend is operational and returns active model metadata.
- **Response `200 OK`:**
```json
{
  "status": "healthy",
  "model_name": "IndiaRegionalClimateModel-v2",
  "version": "2.4.1",
  "mesh_resolution_km": 25,
  "supported_days": 10,
  "variables": ["temperature", "rainfall", "humidity", "windSpeed", "pressure"],
  "last_updated": "2026-11-26T06:00:00Z"
}
```

---

### 2.2 Run Experimental Climate Simulation
- **Method:** `POST`
- **Endpoint:** `/api/v1/simulations/run`
- **Description:** Triggers a 10-day forward simulation run based on experimental perturbation parameters.
- **Request Body (`application/json`):**
```json
{
  "scenario_name": "Monsoon Shift +2°C",
  "scenario_description": "Testing Western Ghats and Deccan drought risk under elevated SST and temperature.",
  "duration_days": 10,
  "parameters": {
    "temperature_delta": 2.0,
    "rainfall_delta_percent": -15.0,
    "humidity_delta_percent": -5.0,
    "wind_speed_delta": 3.5
  }
}
```
- **Response `200 OK` (Synchronous) or `202 Accepted`:**
```json
{
  "simulation_id": "sim-in-20261126-094",
  "status": "completed",
  "created_at": "2026-11-26T15:47:00Z",
  "scenario_name": "Monsoon Shift +2°C",
  "duration_days": 10,
  "summary": {
    "avg_temperature": 29.8,
    "avg_rainfall": 48.2,
    "avg_humidity": 68.4,
    "avg_wind_speed": 18.2,
    "avg_pressure": 1009
  },
  "daily_projections": [
    {
      "day": 1,
      "date": "2026-11-27",
      "metrics": {
        "temperature": 28.5,
        "rainfall": 52.0,
        "humidity": 72.0,
        "windSpeed": 16.5,
        "pressure": 1011
      },
      "regional_data": [
        {
          "region_id": "north",
          "name": "Northern Himalayas (Shimla/Leh)",
          "lat": 31.1048,
          "lng": 77.1734,
          "temperature": 14.2,
          "rainfall": 12.0,
          "humidity": 55.0,
          "windSpeed": 22.0,
          "pressure": 980
        }
      ]
    }
  ]
}
```

---

### 2.3 Fetch Simulation Results by ID
- **Method:** `GET`
- **Endpoint:** `/api/v1/simulations/:simulation_id`
- **Description:** Retrieves previously computed simulation results for historical playback and baseline comparison.

---

### 2.4 Simulation Run History
- **Method:** `GET`
- **Endpoint:** `/api/v1/simulations/history`
- **Description:** Lists past simulation runs with their IDs, parameters, execution timestamps, and execution statuses.

---

## 3. Frontend Adapter Interface

The adapter function `adaptSimulationResponse(apiData)` converts backend responses into the normalized structure expected by the Digital Twin:

```javascript
{
  id: string,
  scenarioName: string,
  isLive: boolean,
  generatedAt: string,
  days: [
    {
      dayNumber: number,
      dateString: string,
      nationalAverages: {
        temperature: number,
        rainfall: number,
        humidity: number,
        windSpeed: number,
        pressure: number
      },
      regions: [
        {
          id: string,
          name: string,
          state: string,
          coordinates: [lat, lng],
          metrics: {
            temperature: number,
            rainfall: number,
            humidity: number,
            windSpeed: number,
            pressure: number
          }
        }
      ]
    }
  ]
}
```
