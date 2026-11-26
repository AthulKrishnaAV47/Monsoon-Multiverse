"""Holdout evaluation (2020-2021) for Monsoon-Multiverse against persistence, climatology, and shock causality."""
from __future__ import annotations

import argparse
import datetime as dt
import json
from pathlib import Path

import numpy as np
from monsoon_r1 import contract as C
from monsoon_r1 import scoring as S
from monsoon_r1 import stats as S_stats

from serve import simulate
from training.dataset import load_netcdf_splits


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--nc", type=Path, default=Path("/tmp/india_climate_train.nc"))
    ap.add_argument("--n-windows", type=int, default=20)
    args = ap.parse_args()

    splits = load_netcdf_splits(args.nc)
    train_data = splits["train_data"]
    test_data = splits["test_data"]
    test_doys = splits["test_doys"]
    times_test = splits["times_test"]

    # Build climatology from 2005-2018 training data only (no leakage)
    # Reconstruct yyyymmdd ints for train_data using 2005-01-01..2018-12-31
    import xarray as xr
    ds = xr.open_dataset(args.nc)
    all_times = ds["time"].values
    ds.close()
    years = all_times.astype("datetime64[Y]").astype(int) + 1970
    train_times = all_times[(years >= 2005) & (years <= 2018)]
    train_dates = np.array([int(str(t)[:10].replace("-", "")) for t in train_times], dtype=np.int32)
    clim = S_stats.climatology(train_data, train_dates)  # [366, 6, 32, 36]

    stats = json.loads(Path("model/artifacts/stats.json").read_text())
    raw_std = np.array(
        stats.get("raw_std", train_data.std(axis=(0, 2, 3))),
        dtype=np.float32,
    )

    steps = 10
    max_start = len(test_data) - C.T_IN - steps
    indices = np.linspace(0, max_start, args.n_windows, dtype=int)

    preds_all, trues_all, pers_all, clim_all = [], [], [], []
    var_ratios_d8 = []
    all_valid = True

    for idx in indices:
        init = test_data[idx : idx + C.T_IN]                      # [3, 6, 32, 36]
        true_roll = test_data[idx + C.T_IN : idx + C.T_IN + steps]
        doy = int(test_doys[idx + C.T_IN - 1])
        doy_sc = C.doy_sincos(doy)

        pred_roll = simulate(init, doy_sc, steps, None)
        bad = S.validity(pred_roll, steps)
        if bad:
            print(f"INVALID rollout at idx={idx}: {bad}")
            all_valid = False

        pers_roll = np.repeat(init[-1][None], steps, axis=0)
        clim_roll = np.empty_like(true_roll)
        for k in range(steps):
            t_k = times_test[idx + C.T_IN + k]
            d_k = dt.date.fromisoformat(str(t_k)[:10])
            clim_roll[k] = S_stats.clim_for(clim, d_k)

        preds_all.append(pred_roll)
        trues_all.append(true_roll)
        pers_all.append(pers_roll)
        clim_all.append(clim_roll)
        var_ratios_d8.append(S.variance_ratio(pred_roll[7], true_roll[7]))

    preds_all = np.stack(preds_all)   # [W, 10, 6, 32, 36]
    trues_all = np.stack(trues_all)
    pers_all = np.stack(pers_all)
    clim_all = np.stack(clim_all)
    var_ratios_d8 = np.stack(var_ratios_d8)

    print("\n=== Holdout Evaluation (2020-2021, n_windows={}) ===".format(args.n_windows))
    ss_list, csi_ss_list = [], []
    for lead in C.LEAD_DAYS:
        k = lead - 1
        sk = S.skill_vs_best_ref(preds_all[:, k], trues_all[:, k], pers_all[:, k], clim_all[:, k])
        csi_m = S.csi(preds_all[:, k, 1], trues_all[:, k, 1])
        csi_p = S.csi(pers_all[:, k, 1], trues_all[:, k, 1])
        csi_c = S.csi(clim_all[:, k, 1], trues_all[:, k, 1])
        csi_s = S.csi_skill(csi_m, csi_p, csi_c)
        ss_list.append(float(np.nanmean(sk["ss"])))
        csi_ss_list.append(csi_s)
        print(
            f"Day {lead:2d} | mean_SS_vs_best={np.nanmean(sk['ss']):+.3f} "
            f"(vs_pers={np.nanmean(sk['ss_persist']):+.3f}, vs_clim={np.nanmean(sk['ss_clim']):+.3f}) | "
            f"CSI={csi_m:.3f} (pers={csi_p:.3f}, clim={csi_c:.3f}, skill={csi_s:+.3f})"
        )
        for ci, cname in enumerate(C.CHANNELS):
            print(f"   {cname:4s}: RMSE={sk['rmse'][ci]:8.3f} | SS_best={sk['ss'][ci]:+.3f} | SS_pers={sk['ss_persist'][ci]:+.3f}")

    anti_pts = S.anti_blur_points(var_ratios_d8)
    mean_vr = np.nanmean(var_ratios_d8, axis=0)
    print("\nDay-8 Spatial Variance Ratios (target 0.40 - 2.50):")
    for ci, cname in enumerate(C.CHANNELS):
        print(f"   {cname:4s}: {mean_vr[ci]:.3f}")
    print(f"Anti-blur points: {anti_pts:.2f} / 10.0")

    # ---- Shock / Causality tests on a monsoon window (July 2020) ----
    monsoon_idx = min(200, max_start)
    init_m = test_data[monsoon_idx : monsoon_idx + C.T_IN]
    doy_m = C.doy_sincos(int(test_doys[monsoon_idx + C.T_IN - 1]))
    base_m = simulate(init_m, doy_m, steps, None)

    zero_pert = np.zeros((C.NC, C.NLAT, C.NLON), dtype=np.float32)
    null_m = simulate(init_m, doy_m, steps, zero_pert)
    null_ok = S.null_consistent(base_m, null_m, raw_std)
    null_max_diff = float(np.abs(base_m - null_m).max())

    shock_warm = S.make_shock("warm_ocean", init_m[-1], raw_std)
    out_warm = simulate(init_m, doy_m, steps, shock_warm)
    res_warm = S.causality_checks(base_m, out_warm, C.BOX_BAY_OF_BENGAL, raw_std)

    shock_stall = S.make_shock("monsoon_stall", init_m[-1], raw_std)
    out_stall = simulate(init_m, doy_m, steps, shock_stall)
    res_stall = S.causality_checks(base_m, out_stall, C.BOX_ARABIAN_SEA, raw_std)

    caus_pts = S.causality_points([res_warm, res_stall], null_ok)
    fcst_pts = S.forecast_points(ss_list, csi_ss_list)

    print("\n=== Multiverse Shock Causality Tests ===")
    print(f"Null shock consistent: {null_ok} (max |diff| = {null_max_diff:.6e})")
    print(f"Warm Bay of Bengal:    {res_warm}")
    print(f"Arabian Sea Stall:     {res_stall}")
    print(f"Causality points:      {caus_pts:.2f} / 15.0")
    print(f"Forecast points:       {fcst_pts['points']:.2f} / 45.0 (RMSE={fcst_pts['rmse_pts']:.2f}/30, CSI={fcst_pts['csi_pts']:.2f}/15)")
    print(f"Combined Model+Dyn:    {fcst_pts['points'] + anti_pts + caus_pts:.2f} / 70.0")

    return 0 if (all_valid and null_ok) else 1


if __name__ == "__main__":
    raise SystemExit(main())
