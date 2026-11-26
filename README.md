# Monsoon-Multiverse (Track 2: Climate Digital Twin of India)

An offline, deterministic atmospheric rollout server and interactive multiverse dashboard for **Yugaantar DevForge — Track 2 ("Multiverse of Monsoon")**. Built around a ~1.50M-parameter 2D Residual U-Net (`monsoon-resunet-v1`) exported to ONNX for fast CPU inference, `serve.py` serves physical-unit rollouts over HTTP (`POST /health` and `POST /simulate`) without external network calls or raw `.nc` dataset dependencies at runtime.

---

## Repository Structure

```text
Monsoon-Multiverse/
├── serve.py                              # Offline FastAPI inference server (root entry point)
├── requirements.txt                      # Minimal runtime inference dependencies
├── README.md                             # Project overview, setup, validation, and usage guide
├── .gitignore                            # Excludes *.nc, .venv/, .venvv/, __pycache__/, *.zip, temp files
├── model/
│   ├── __init__.py
│   ├── unet.py                           # MonsoonResidualUNet architecture definition
│   └── artifacts/
│       ├── monsoon_unet.onnx             # Exported ONNX graph (opset 18)
│       ├── monsoon_unet.onnx.data        # External ONNX weights (kept beside monsoon_unet.onnx)
│       ├── monsoon_unet.pt               # Best PyTorch checkpoint (Stage 2 Epoch 31)
│       ├── static_fields.npz             # land_sea_mask, orography_m, orography_norm
│       └── stats.json                    # Train-split (2005–2018) normalization statistics
├── training/
│   └── monsoon_training_notebook.ipynb   # Two-stage training, holdout evaluation, shock & ONNX export
├── dashboard/                            # Interactive multiverse dashboard (decoupled from model weights)
│   └── ...
└── docs/
    ├── shock_diagnostics.png             # Spatial difference maps for Warm BoB & Weak AS Wind shocks
    └── technical_brief.pdf               # 2-page project technical brief
```

---

## Model & Training Summary

* **Spatial Grid & Channels:** `32 × 36` daily Indian climate grid (`2005–2021`) with **6 dynamic channels** (`t2m` in K, `tp` in mm/day, `u10` and `v10` in m/s, `msl` in Pa, `tcwv` in kg/m²), **2 static channels** (`land_sea_mask` and normalized `orography_m`), and **2 seasonal channels** ($\sin$ and $\cos$ of Day-of-Year)
* **Architecture:** `MonsoonResidualUNet` (~1.50M trainable parameters) with two `MaxPool2d(2)` downsampling stages (`32×36 → 16×18 → 8×9`), `ConvTranspose2d` upsampling stages with skip connections, `ResBlock` units (`replicate`-padded `3×3` convs, `BatchNorm2d`, `GELU`, and residual shortcuts), and a delta output head (`current_norm + delta`)
* **Chronological Splits & Normalization:** Strictly split into **Train (`2005–2018`)**, **Validation (`2019`)**, and **Holdout Test (`2020–2021`)**; `tp` uses `log1p(max(tp, 0))` before train-only Z-score normalization and `expm1` + `clamp(min=0.0)` during physical denormalization
* **Two-Stage Curriculum:**
  * **Stage 1 (Epochs 1–30):** 1-step supervised warm-up (`AdamW`, `lr=1e-3`, `CosineAnnealingLR`, batch size 64) using channel-weighted Huber loss (`SmoothL1Loss(beta=1.0)` with `2.0×` weight on `tp` and `1.0×` on other channels)
  * **Stage 2 (Epochs 31–60):** 4-step autoregressive rollout fine-tuning (`AdamW`, `lr=2e-4`, batch size 32) rotating seasonal angle by $+2\pi/365$ per step, selecting the best checkpoint by Day-4 physical validation RMSE

---

## Holdout Forecast Skill (2020–2021 Test Split)

On the unseen 2020–2021 test split, `monsoon-resunet-v1` outperforms the persistence ("repeat yesterday") baseline across all 6 channels at Days 1, 4, and 8:

| Channel | Unit | Day 1 (Model / Pers) | Day 4 (Model / Pers) | Day 8 (Model / Pers) |
| :--- | :--- | :---: | :---: | :---: |
| `t2m` | K | `0.767` / `1.060` | `1.646` / `1.979` | `2.028` / `2.322` |
| `tp` | mm/day | `4.641` / `6.222` | `6.591` / `9.093` | `7.146` / `9.203` |
| `u10` | m/s | `0.744` / `1.083` | `1.481` / `1.986` | `1.759` / `2.190` |
| `v10` | m/s | `0.730` / `1.098` | `1.369` / `1.910` | `1.609` / `1.953` |
| `msl` | Pa | `129.368` / `205.762` | `273.062` / `352.359` | `308.249` / `390.590` |
| `tcwv` | kg/m² | `2.426` / `3.694` | `5.614` / `7.391` | `6.959` / `8.226` |

---

## Running the Inference Server (`serve.py`)

Start the server on port `8000` (or any custom port via `--port`):

```bash
python serve.py --port 8000
```

### Endpoints

* **`POST /health`** — Returns server readiness and `model_name` (`monsoon-resunet-v1`).
* **`POST /simulate`** — Accepts JSON with:
  * `init_states`: shape `[3, 6, 32, 36]` in raw physical units (canonical nested JSON lists or `{"b64": ..., "shape": ...}`)
  * `doy_sincos`: `[sin(theta), cos(theta)]` for the initial state day
  * `steps`: number of autoregressive forecast days to roll out
  * `perturbation`: `null` or shape `[6, 32, 36]` in raw physical units applied to the latest input day (`states[-1]`) before normalization

Returns `rollout` (`[steps, 6, 32, 36]` in physical units) and `inference_ms`.

---

## Schema Validation & Offline Sandbox Check

Run the organizer's validator against the live server:

```bash
PYTHONPATH=/path/to/yug-monsoon-kit-main python -m monsoon_r1.schema_validator http://localhost:8000
```

To verify offline execution with networking disabled and the repository mounted read-only:

```bash
docker run --rm --network none --cpus="4" --memory="6g" \
  -v "$(pwd):/app:ro" -w /app -p 8000:8000 \
  <sandbox-image-with-numpy-onnxruntime-fastapi-uvicorn> \
  python serve.py --port 8000
```

---

## Dashboard (`dashboard/`)

The dashboard in `dashboard/` connects to `POST /simulate` to compare **Timeline Prime** (`perturbation: null`) against **Multiverse Shocked** timelines and visualize the **Causal Difference** (`Multiverse - Prime`), wind vectors (`u10`, `v10`), timeline playback, shock presets and custom shock builders, hazard KPIs, and inference/determinism diagnostics without requiring the raw `.nc` dataset at runtime.