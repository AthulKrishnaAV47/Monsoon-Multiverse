"""Inference server for Monsoon-Multiverse (Track 2: Climate Digital Twin of India).

Loads the exported ONNX Residual U-Net, normalization statistics, and static fields
at startup, and serves deterministic physical-unit rollouts over HTTP.
"""
from __future__ import annotations

import argparse
import base64
import json
import math
import time
from pathlib import Path

import numpy as np
import onnxruntime as ort
import uvicorn
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware



APP_DIR = Path(__file__).resolve().parent
ARTIFACTS_DIR = APP_DIR / "model" / "artifacts"
MODEL_NAME = "monsoon-resunet-v1"
TP_IDX = 1
DTHETA = 2.0 * math.pi / 365.0

# Load static fields and normalization statistics at startup
_stats = json.loads((ARTIFACTS_DIR / "stats.json").read_text())
_MEAN = np.array(_stats["mean"], dtype=np.float32).reshape(1, 6, 1, 1)
_STD = np.array(_stats["std"], dtype=np.float32).reshape(1, 6, 1, 1)

_static_npz = np.load(ARTIFACTS_DIR / "static_fields.npz")
_STATIC_NORM = np.stack(
    [_static_npz["land_sea_mask"], _static_npz["orography_norm"]], axis=0
).astype(np.float32)  # [2, 32, 36]
# Configure ONNX Runtime for fast deterministic CPU inference
_sess_opts = ort.SessionOptions()
_sess_opts.intra_op_num_threads = 4
_sess_opts.inter_op_num_threads = 1
_sess_opts.graph_optimization_level = ort.GraphOptimizationLevel.ORT_ENABLE_ALL
_SESSION = ort.InferenceSession(
    str(ARTIFACTS_DIR / "monsoon_unet.onnx"),
    sess_options=_sess_opts,
    providers=["CPUExecutionProvider"],
)
_INPUT_NAME = _SESSION.get_inputs()[0].name

app = FastAPI(title="Monsoon-Multiverse Digital Twin API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

def _decode_arr(x) -> np.ndarray:
    """Accept canonical nested JSON lists or tolerated {'b64': ..., 'shape': [...]}."""
    if isinstance(x, dict):
        return np.frombuffer(base64.b64decode(x["b64"]), dtype="<f4").reshape(x["shape"]).astype(np.float32)
    return np.asarray(x, dtype=np.float32)


def _normalize(x_phys: np.ndarray) -> np.ndarray:
    """Physical [T, 6, 32, 36] -> normalized model space [T, 6, 32, 36]."""
    out = x_phys.astype(np.float32, copy=True)
    out[:, TP_IDX] = np.log1p(np.maximum(out[:, TP_IDX], 0.0))
    return (out - _MEAN) / _STD


def _denormalize(x_norm: np.ndarray) -> np.ndarray:
    """Normalized [T, 6, 32, 36] -> physical [T, 6, 32, 36] with non-negative rainfall."""
    out = x_norm.astype(np.float32, copy=False) * _STD + _MEAN
    out = out.copy()
    tp_log = np.clip(out[:, TP_IDX], -20.0, 10.0)
    out[:, TP_IDX] = np.maximum(np.expm1(tp_log), 0.0)
    return out


def simulate(init_states: np.ndarray, doy_sincos, steps: int, perturbation: np.ndarray | None) -> np.ndarray:
    """Run deterministic autoregressive rollout for `steps` days in raw physical units."""
    states = init_states.astype(np.float32, copy=True)
    if perturbation is not None:
        states[-1] = states[-1] + perturbation.astype(np.float32, copy=False)

    # Normalize 3-day history: [3, 6, 32, 36]
    hist_norm = _normalize(states)
    theta0 = math.atan2(float(doy_sincos[0]), float(doy_sincos[1]))

    # Pre-allocate single input buffer [1, 22, 32, 36]
    x_buf = np.empty((1, 22, 32, 36), dtype=np.float32)
    x_buf[0, 18:20] = _STATIC_NORM

    preds_norm = np.empty((steps, 6, 32, 36), dtype=np.float32)
    for k in range(steps):
        x_buf[0, :18] = hist_norm.reshape(18, 32, 36)
        angle = theta0 + k * DTHETA
        x_buf[0, 20] = math.sin(angle)
        x_buf[0, 21] = math.cos(angle)

        nxt_norm = _SESSION.run(None, {_INPUT_NAME: x_buf})[0][0]  # [6, 32, 36]
        preds_norm[k] = nxt_norm

        # Shift 3-day window forward
        hist_norm[0] = hist_norm[1]
        hist_norm[1] = hist_norm[2]
        hist_norm[2] = nxt_norm

    return _denormalize(preds_norm)


@app.post("/health")
def health():
    return {"status": "ready", "model_name": MODEL_NAME}


@app.post("/simulate")
async def simulate_endpoint(request: Request):
    t0 = time.perf_counter()
    body = await request.json()
    init = _decode_arr(body["init_states"])
    pert = None if body.get("perturbation") is None else _decode_arr(body["perturbation"])
    out = simulate(init, body["doy_sincos"], int(body["steps"]), pert)
    return {
        "rollout": np.asarray(out, dtype=np.float32).tolist(),
        "inference_ms": (time.perf_counter() - t0) * 1000.0,
    }


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--port", type=int, default=8000)
    uvicorn.run(app, host="0.0.0.0", port=ap.parse_args().port, log_level="warning")
