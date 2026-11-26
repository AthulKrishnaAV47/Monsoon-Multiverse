# Monsoon-Multiverse: Climate Digital Twin of India

End-to-end submission for **Yugaantar DevForge Hackathon — Track 2: "Multiverse of Monsoon"**.

## Overview
- **Model (`model/unet.py`)**: 2D Residual U-Net (`MonsoonResUNet`) predicting day-over-day normalized state deltas on a `32 x 36` (1° × 1°) India grid (`6.5°N–37.5°N`, `65.5°E–100.5°E`).
- **Inputs (22 channels)**: 3 consecutive days × 6 dynamic channels (`t2m`, `tp`, `u10`, `v10`, `msl`, `tcwv`) + 2 static fields (`land_sea_mask`, normalized `orography_m`) + 2 seasonal channels (`sin(doy)`, `cos(doy)`).
- **Precipitation Stability**: `tp` is transformed with `log1p(max(tp, 0))` before standardization and inverted with `expm1` + `clamp(min=0.0)` so rainfall is strictly non-negative.
- **Inference Server (`serve.py`)**: FastAPI + ONNX Runtime (`CPUExecutionProvider`) serving `/health` and `/simulate` in raw physical units, strictly deterministic, < 100 ms per 10-day rollout.
- **Interactive Dashboard (`dashboard/app.py`)**: Streamlit + Plotly UI coupled live to `/simulate` with Timeline Prime, Multiverse Shocked, Causal Difference maps, and live Flood / Heatwave / Kharif Crop Stress impact metrics.

## Repository Layout
```
├── serve.py                   # Offline FastAPI + ONNX Runtime inference server
├── model/
│   ├── unet.py                # 2D Residual U-Net architecture
│   └── artifacts/             # Exported ONNX weights, stats.json, static_fields.npz
├── training/
│   ├── dataset.py             # Chronological split (2005-2018 / 2019 / 2020-2021) & transforms
│   ├── train.py               # Two-stage training (1-step + 4-step autoregressive) & ONNX export
│   └── evaluate.py            # Holdout evaluation & shock causality verification
└── dashboard/
    └── app.py                 # Live interactive Streamlit dashboard
```

## Quickstart
1. **Start the inference server:**
   ```bash
   python serve.py --port 8000
   ```
2. **Validate API contract:**
   ```bash
   python -m monsoon_r1.schema_validator http://localhost:8000
   ```
3. **Launch the live dashboard (in a separate terminal):**
   ```bash
   streamlit run dashboard/app.py
   ```
4. **Train / Evaluate (offline, requires `india_climate_train.nc`):**
   ```bash
   python -m training.train --nc /path/to/india_climate_train.nc
   python -m training.evaluate --nc /path/to/india_climate_train.nc
   ```
