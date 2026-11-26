"""Dataset loading, chronological splitting, normalization, and windowing for Monsoon-Multiverse."""
from __future__ import annotations

import json
from pathlib import Path
from typing import Tuple

import numpy as np
import torch
from torch.utils.data import Dataset
import xarray as xr

CHANNELS = ("t2m", "tp", "u10", "v10", "msl", "tcwv")
TP_IDX = 1
T_IN = 3


def transform_physical_to_model(x: np.ndarray, mean: np.ndarray, std: np.ndarray) -> np.ndarray:
    """Convert raw physical [..., 6, H, W] to normalized model space (log1p on tp)."""
    out = x.astype(np.float32, copy=True)
    out[..., TP_IDX, :, :] = np.log1p(np.maximum(out[..., TP_IDX, :, :], 0.0))
    mean_b = mean.reshape((1,) * (out.ndim - 3) + (6, 1, 1))
    std_b = std.reshape((1,) * (out.ndim - 3) + (6, 1, 1))
    return (out - mean_b) / std_b


def transform_model_to_physical(x_norm: np.ndarray, mean: np.ndarray, std: np.ndarray) -> np.ndarray:
    """Convert normalized model space [..., 6, H, W] back to raw physical units."""
    mean_b = mean.reshape((1,) * (x_norm.ndim - 3) + (6, 1, 1))
    std_b = std.reshape((1,) * (x_norm.ndim - 3) + (6, 1, 1))
    out = x_norm.astype(np.float32, copy=False) * std_b + mean_b
    out = out.copy()
    tp_log = np.clip(out[..., TP_IDX, :, :], -20.0, 10.0)
    out[..., TP_IDX, :, :] = np.maximum(np.expm1(tp_log), 0.0)
    return out


def load_netcdf_splits(nc_path: Path) -> dict:
    """Load india_climate_train.nc and split chronologically: 2005-2018 train, 2019 val, 2020-2021 test."""
    ds = xr.open_dataset(nc_path)
    data = ds["data"].values.astype(np.float32)          # [N, 6, 32, 36]
    static = ds["static"].values.astype(np.float32)      # [2, 32, 36]: land_sea_mask, orography_m
    times = ds["time"].values                            # datetime64[ns]
    ds.close()

    years = times.astype("datetime64[Y]").astype(int) + 1970
    # Compute day-of-year (1..366) for each timestamp
    jan1 = times.astype("datetime64[Y]").astype("datetime64[D]")
    doys = (times.astype("datetime64[D]") - jan1).astype(np.int32) + 1

    train_mask = (years >= 2005) & (years <= 2018)
    val_mask = years == 2019
    test_mask = (years >= 2020) & (years <= 2021)

    return {
        "train_data": data[train_mask],
        "train_doys": doys[train_mask],
        "val_data": data[val_mask],
        "val_doys": doys[val_mask],
        "test_data": data[test_mask],
        "test_doys": doys[test_mask],
        "static": static,
        "times_test": times[test_mask],
    }


def compute_and_save_artifacts(train_data: np.ndarray, static: np.ndarray, artifacts_dir: Path) -> Tuple[dict, np.ndarray]:
    """Compute normalization stats from training split only and save stats.json + static_fields.npz."""
    artifacts_dir.mkdir(parents=True, exist_ok=True)

    # Transform tp with log1p before computing mean/std
    proc = train_data.copy()
    proc[:, TP_IDX] = np.log1p(np.maximum(proc[:, TP_IDX], 0.0))

    mean = proc.mean(axis=(0, 2, 3)).astype(np.float32)
    std = proc.std(axis=(0, 2, 3)).astype(np.float32)
    raw_std = train_data.std(axis=(0, 2, 3)).astype(np.float32)

    stats = {
        "channels": list(CHANNELS),
        "tp_transform": "log1p",
        "mean": [float(x) for x in mean],
        "std": [float(x) for x in std],
        "raw_std": [float(x) for x in raw_std],
    }
    (artifacts_dir / "stats.json").write_text(json.dumps(stats, indent=2))

    # Normalize static fields: land_sea_mask is already [0, 1]; standardize orography_m
    lsm = np.clip(static[0], 0.0, 1.0).astype(np.float32)
    oro = static[1].astype(np.float32)
    oro_mean = float(oro.mean())
    oro_std = float(max(oro.std(), 1e-6))
    oro_norm = ((oro - oro_mean) / oro_std).astype(np.float32)
    static_norm = np.stack([lsm, oro_norm], axis=0)  # [2, 32, 36]

    np.savez_compressed(
        artifacts_dir / "static_fields.npz",
        static_raw=static.astype(np.float32),
        static_norm=static_norm,
        oro_mean=np.float32(oro_mean),
        oro_std=np.float32(oro_std),
    )
    return stats, static_norm


class MonsoonRolloutDataset(Dataset):
    """Sliding-window dataset returning normalized 3-day history, static/seasonal metadata, and K-step targets."""

    def __init__(
        self,
        data_phys: np.ndarray,
        doys: np.ndarray,
        mean: np.ndarray,
        std: np.ndarray,
        static_norm: np.ndarray,
        rollout_steps: int = 1,
    ) -> None:
        self.data_norm = transform_physical_to_model(data_phys, mean, std)  # [N, 6, 32, 36]
        self.doys = doys.astype(np.int32)
        self.static_norm = static_norm.astype(np.float32)                  # [2, 32, 36]
        self.rollout_steps = rollout_steps
        self.num_samples = len(self.data_norm) - T_IN - rollout_steps + 1

    def __len__(self) -> int:
        return self.num_samples

    def __getitem__(self, idx: int) -> Tuple[torch.Tensor, torch.Tensor, torch.Tensor]:
        # History: [3, 6, 32, 36] -> flattened to [18, 32, 36]
        hist = self.data_norm[idx : idx + T_IN]                            # [3, 6, 32, 36]
        # Target sequence: [rollout_steps, 6, 32, 36]
        targets = self.data_norm[idx + T_IN : idx + T_IN + self.rollout_steps]
        # Angle of the LAST input day (idx + T_IN - 1)
        last_doy = float(self.doys[idx + T_IN - 1])
        theta0 = np.float32(2.0 * np.pi * last_doy / 365.0)
        return (
            torch.from_numpy(hist.copy()),
            torch.tensor(theta0, dtype=torch.float32),
            torch.from_numpy(targets.copy()),
        )
