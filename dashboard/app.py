"""Interactive Streamlit Dashboard for Monsoon-Multiverse Climate Digital Twin.

Coupled live to the inference server to compare Timeline Prime
against branched Multiverse atmospheric shocks and compute live real-world impacts.
"""
from __future__ import annotations

import json
import math
from pathlib import Path

import numpy as np
import plotly.graph_objects as go
from plotly.subplots import make_subplots
import requests
import streamlit as st

LAT = np.arange(6.5, 37.5 + 1e-9, 1.0)
LON = np.arange(65.5, 100.5 + 1e-9, 1.0)
CHANNELS = ("t2m", "tp", "u10", "v10", "msl", "tcwv")
CHANNEL_LABELS = {
    "t2m": "2m Temperature (°C)",
    "tp": "Daily Precipitation (mm/day)",
    "u10": "10m Eastward Wind (m/s)",
    "v10": "10m Northward Wind (m/s)",
    "msl": "Mean Sea Level Pressure (hPa)",
    "tcwv": "Total Column Water Vapor (kg/m²)",
}


def load_default_init() -> tuple[np.ndarray, list[float]]:
    sample_path = Path(__file__).resolve().parent / "sample_init.json"
    if sample_path.exists():
        data = json.loads(sample_path.read_text())
        return np.array(data["init_states"], dtype=np.float32), data["doy_sincos"]
    # Fallback synthetic monsoon-like state if sample_init.json has not been generated yet
    rng = np.random.default_rng(7)
    base = np.array([299.0, 8.0, 6.0, 2.0, 100400.0, 48.0], dtype=np.float32)[:, None, None]
    noise = rng.normal(0, 1, (3, 6, 32, 36)).astype(np.float32) * np.array([2.5, 5.0, 2.0, 1.5, 250.0, 6.0], dtype=np.float32)[None, :, None, None]
    state = base + noise
    state[:, 1] = np.maximum(state[:, 1], 0.0)
    doy = 195
    return state, [math.sin(2 * math.pi * doy / 365.0), math.cos(2 * math.pi * doy / 365.0)]


def box_mask(lat_min: float, lat_max: float, lon_min: float, lon_max: float) -> np.ndarray:
    return ((LAT >= lat_min) & (LAT <= lat_max))[:, None] & ((LON >= lon_min) & (LON <= lon_max))[None, :]


def build_perturbation(
    preset: str,
    last_state: np.ndarray,
    custom_ch: int,
    custom_delta: float,
    custom_box: tuple[float, float, float, float],
) -> np.ndarray | None:
    pert = np.zeros((6, 32, 36), dtype=np.float32)
    if preset == "Zero Shock (Determinism Check)":
        return pert
    if preset == "Warm Bay of Bengal (+3K t2m, +15% tcwv)":
        m = box_mask(8.0, 20.0, 82.0, 94.0)
        pert[0][m] = 3.0
        pert[5][m] = 0.15 * last_state[5][m]
        return pert
    if preset == "Weaker Arabian Sea Wind (-40% u10/v10)":
        m = box_mask(8.0, 20.0, 65.0, 75.0)
        pert[2][m] = -0.4 * last_state[2][m]
        pert[3][m] = -0.4 * last_state[3][m]
        return pert
    if preset == "Custom Shock Builder":
        m = box_mask(*custom_box)
        pert[custom_ch][m] = custom_delta
        return pert
    return None


@st.cache_data(show_spinner=False, ttl=60)
def call_simulate(api_url: str, init_list: list, doy_sincos: list[float], steps: int, pert_list: list | None) -> dict:
    route = "sim" + "ulate"
    resp = requests.post(
        f"{api_url.rstrip('/')}/{route}",
        json={
            "init_states": init_list,
            "doy_sincos": doy_sincos,
            "steps": steps,
            "perturbation": pert_list,
        },
        timeout=10.0,
    )
    resp.raise_for_status()
    return resp.json()


def to_display_units(arr: np.ndarray, ch_idx: int) -> np.ndarray:
    field = arr[:, ch_idx].copy()
    if ch_idx == 0:
        field = field - 273.15  # K -> °C
    elif ch_idx == 4:
        field = field / 100.0   # Pa -> hPa
    return field


def main() -> None:
    st.set_page_config(page_title="Monsoon-Multiverse Digital Twin", layout="wide")
    st.title("Monsoon-Multiverse: Climate Digital Twin of India")
    st.caption("Live 10-day autoregressive simulation & causal shock branching via the inference API")

    init_states, doy_sincos = load_default_init()

    with st.sidebar:
        st.header("Simulation Controls")
        api_url = st.text_input("Inference Server URL", value="http://localhost:8000")
        steps = st.slider("Forecast Horizon (days)", min_value=1, max_value=14, value=10)
        day_idx = st.slider("Inspect Forecast Day", min_value=1, max_value=steps, value=min(4, steps)) - 1
        var_name = st.selectbox("Variable", options=list(CHANNELS), format_func=lambda c: CHANNEL_LABELS[c])
        ch_idx = CHANNELS.index(var_name)

        st.divider()
        st.subheader("Multiverse Shock")
        preset = st.radio(
            "Shock Scenario",
            [
                "Warm Bay of Bengal (+3K t2m, +15% tcwv)",
                "Weaker Arabian Sea Wind (-40% u10/v10)",
                "Zero Shock (Determinism Check)",
                "Custom Shock Builder",
            ],
        )

        custom_ch, custom_delta = 0, 2.0
        custom_box = (12.0, 22.0, 72.0, 82.0)
        if preset == "Custom Shock Builder":
            custom_ch_name = st.selectbox("Shock Channel", options=list(CHANNELS), index=0)
            custom_ch = CHANNELS.index(custom_ch_name)
            custom_delta = st.number_input("Physical Delta", value=2.0, step=0.5)
            lat_range = st.slider("Latitude Box", 6.5, 37.5, (12.0, 22.0), step=1.0)
            lon_range = st.slider("Longitude Box", 65.5, 100.5, (72.0, 82.0), step=1.0)
            custom_box = (lat_range[0], lat_range[1], lon_range[0], lon_range[1])

    pert = build_perturbation(preset, init_states[-1], custom_ch, custom_delta, custom_box)

    try:
        prime_resp = call_simulate(api_url, init_states.tolist(), doy_sincos, steps, None)
        multi_resp = call_simulate(
            api_url,
            init_states.tolist(),
            doy_sincos,
            steps,
            None if pert is None else pert.tolist(),
        )
    except Exception as exc:
        st.error(f"Could not reach inference server at `{api_url}`: {exc}")
        st.info("Start the inference server with `python serve.py --port 8000` in a separate terminal.")
        return

    prime_roll = np.array(prime_resp["rollout"], dtype=np.float32)
    multi_roll = np.array(multi_resp["rollout"], dtype=np.float32)

    m1, m2, m3 = st.columns(3)
    m1.metric("Timeline Prime Latency", f"{prime_resp['inference_ms']:.1f} ms")
    m2.metric("Multiverse Latency", f"{multi_resp['inference_ms']:.1f} ms")
    max_causal_diff = float(np.abs(multi_roll - prime_roll).max())
    m3.metric("Max Causal Delta (All Channels)", f"{max_causal_diff:.4f}")

    prime_disp = to_display_units(prime_roll, ch_idx)[day_idx]
    multi_disp = to_display_units(multi_roll, ch_idx)[day_idx]
    diff_disp = multi_disp - prime_disp

    vmin = float(min(prime_disp.min(), multi_disp.min()))
    vmax = float(max(prime_disp.max(), multi_disp.max()))
    dmax = float(max(abs(diff_disp.min()), abs(diff_disp.max()), 1e-4))

    colorscale = "Blues" if var_name == "tp" else "Viridis"
    fig = make_subplots(
        rows=1,
        cols=3,
        subplot_titles=(
            f"Timeline Prime (Day {day_idx + 1})",
            f"Multiverse Shocked (Day {day_idx + 1})",
            f"Causal Difference (Multiverse − Prime)",
        ),
        horizontal_spacing=0.06,
    )
    fig.add_trace(
        go.Heatmap(z=prime_disp, x=LON, y=LAT, zmin=vmin, zmax=vmax, colorscale=colorscale, colorbar=dict(x=0.29, len=0.85)),
        row=1,
        col=1,
    )
    fig.add_trace(
        go.Heatmap(z=multi_disp, x=LON, y=LAT, zmin=vmin, zmax=vmax, colorscale=colorscale, showscale=False),
        row=1,
        col=2,
    )
    fig.add_trace(
        go.Heatmap(z=diff_disp, x=LON, y=LAT, zmin=-dmax, zmax=dmax, colorscale="RdBu_r", colorbar=dict(x=1.01, len=0.85)),
        row=1,
        col=3,
    )
    fig.update_layout(height=460, margin=dict(l=30, r=30, t=50, b=30))
    for c in (1, 2, 3):
        fig.update_xaxes(title_text="Lon (°E)", row=1, col=c)
    fig.update_yaxes(title_text="Lat (°N)", row=1, col=1)
    st.plotly_chart(fig, use_container_width=True)

    # ---- Live Impact Module ----
    st.subheader("Live Real-World Impact Assessment (Computed from Rollout)")
    heavy_rain_prime = int((prime_roll[day_idx, 1] > 64.5).sum())
    heavy_rain_multi = int((multi_roll[day_idx, 1] > 64.5).sum())

    heat_prime = int((prime_roll[day_idx, 0] > 313.15).sum())  # > 40 C
    heat_multi = int((multi_roll[day_idx, 0] > 313.15).sum())

    cum_rain_prime = prime_roll[:, 1].sum(axis=0)
    cum_rain_multi = multi_roll[:, 1].sum(axis=0)
    crop_stress_prime = int((cum_rain_prime < 25.0).sum())
    crop_stress_multi = int((cum_rain_multi < 25.0).sum())

    c1, c2, c3 = st.columns(3)
    c1.metric(
        "Flood Risk Cells (>64.5 mm/day)",
        f"{heavy_rain_multi} cells",
        delta=f"{heavy_rain_multi - heavy_rain_prime:+d} vs Prime",
        delta_color="inverse",
    )
    c2.metric(
        "Heatwave Risk Cells (>40°C)",
        f"{heat_multi} cells",
        delta=f"{heat_multi - heat_prime:+d} vs Prime",
        delta_color="inverse",
    )
    c3.metric(
        "Kharif Dry-Stress Cells (<25 mm / 10d)",
        f"{crop_stress_multi} cells",
        delta=f"{crop_stress_multi - crop_stress_prime:+d} vs Prime",
        delta_color="inverse",
    )


if __name__ == "__main__":
    main()
