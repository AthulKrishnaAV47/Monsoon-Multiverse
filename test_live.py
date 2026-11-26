import math
import urllib.request
import json
import numpy as np
import xarray as xr
import matplotlib.pyplot as plt

NC_PATH = "india_climate_train.nc"  # Update path if stored elsewhere
URL = "http://localhost:8000/simulate"
CHANNELS = ["t2m", "tp", "u10", "v10", "msl", "tcwv"]


def call_simulate(init_states, doy_sincos, steps=10, perturbation=None):
    payload = {
        "init_states": init_states.tolist(),
        "doy_sincos": doy_sincos,
        "steps": steps,
        "perturbation": None if perturbation is None else perturbation.tolist(),
    }
    req = urllib.request.Request(
        URL,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=10) as resp:
        res = json.loads(resp.read().decode("utf-8"))
    return np.array(res["rollout"], dtype=np.float32), res["inference_ms"]


# 1. Load a real July 2021 monsoon window from the NetCDF file
ds = xr.open_dataset(NC_PATH)
if "data" in ds:
    raw = np.stack([ds["data"].sel(channel=c).values for c in CHANNELS], axis=1)
else:
    raw = np.stack([ds[c].values for c in CHANNELS], axis=1)

# Pick a July 2021 index (near the end of the dataset)
idx = len(raw) - 180
init_states = raw[idx : idx + 3].astype(np.float32)       # [3, 6, 32, 36]
truth_10d = raw[idx + 3 : idx + 13].astype(np.float32)    # [10, 6, 32, 36]

doy = int(ds["time"].dt.dayofyear.values[idx + 2])
angle = 2.0 * math.pi * doy / 365.0
doy_sincos = [math.sin(angle), math.cos(angle)]
ds.close()

# 2. Call live server: Timeline Prime, Zero Shock, and Warm Bay of Bengal (+3K)
prime, ms_prime = call_simulate(init_states, doy_sincos, steps=10, perturbation=None)
zeros, ms_zero = call_simulate(init_states, doy_sincos, steps=10, perturbation=np.zeros((6, 32, 36), dtype=np.float32))

bob_shock = np.zeros((6, 32, 36), dtype=np.float32)
bob_shock[0, 12:22, 20:30] = 3.0  # +3K on t2m in Bay of Bengal
multiverse, ms_shock = call_simulate(init_states, doy_sincos, steps=10, perturbation=bob_shock)

# 3. Print checks
print(f"Latency: Prime={ms_prime:.1f}ms | Zero={ms_zero:.1f}ms | Shock={ms_shock:.1f}ms")
print(f"Zero-shock max diff (must be 0.0): {np.max(np.abs(prime - zeros)):.2e}")
print(f"Any NaN/Inf: {np.isnan(prime).any() or np.isinf(prime).any()} | Min rain: {prime[:, 1].min():.4f} mm/day\n")

print("Day-4 RMSE (Model vs Repeat Yesterday) on this window:")
for c, name in enumerate(CHANNELS):
    m_rmse = np.sqrt(np.mean((prime[3, c] - truth_10d[3, c]) ** 2))
    p_rmse = np.sqrt(np.mean((init_states[-1, c] - truth_10d[3, c]) ** 2))
    print(f"  {name:5s} | Model: {m_rmse:7.3f} | Repeat Yesterday: {p_rmse:7.3f}")

# 4. Save visual comparison: Ground Truth vs Predicted Temp (Day 4) + Shock Ripple (Day 4)
fig, axes = plt.subplots(1, 3, figsize=(14, 4))
axes[0].imshow(truth_10d[3, 0], origin="lower", cmap="inferno")
axes[0].set_title("Ground Truth t2m (Day 4)")
axes[1].imshow(prime[3, 0], origin="lower", cmap="inferno")
axes[1].set_title("Model Prediction t2m (Day 4)")
axes[2].imshow(multiverse[3, 0] - prime[3, 0], origin="lower", cmap="coolwarm")
axes[2].set_title("Warm BoB Shock Delta (Day 4)")
plt.tight_layout()
plt.savefig("live_test_check.png", dpi=150)
print("\nSaved visual check to live_test_check.png")