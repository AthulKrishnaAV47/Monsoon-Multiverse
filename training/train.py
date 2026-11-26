"""Two-stage training script for MonsoonResUNet with ONNX export."""
from __future__ import annotations

import argparse
import json
import math
import time
from pathlib import Path

import numpy as np
import torch
import torch.nn as nn
from torch.utils.data import DataLoader

from model.unet import MonsoonResUNet
from training.dataset import (
    MonsoonRolloutDataset,
    compute_and_save_artifacts,
    load_netcdf_splits,
    transform_model_to_physical,
)


def build_unet_input(
    hist: torch.Tensor,
    static_norm: torch.Tensor,
    theta: torch.Tensor,
) -> torch.Tensor:
    """Assemble [B, 22, 32, 36] input tensor from [B, 3, 6, 32, 36] history, [2, 32, 36] static, [B] angle."""
    b, _, _, h, w = hist.shape
    hist_flat = hist.reshape(b, 18, h, w)
    stat = static_norm.unsqueeze(0).expand(b, -1, -1, -1)
    sin_c = torch.sin(theta).view(b, 1, 1, 1).expand(b, 1, h, w)
    cos_c = torch.cos(theta).view(b, 1, 1, 1).expand(b, 1, h, w)
    return torch.cat([hist_flat, stat, sin_c, cos_c], dim=1)


def autoregressive_rollout(
    model: nn.Module,
    hist: torch.Tensor,
    static_norm: torch.Tensor,
    theta0: torch.Tensor,
    steps: int,
) -> torch.Tensor:
    """Roll the model forward `steps` days in normalized space, returning [B, steps, 6, 32, 36]."""
    cur_hist = hist
    preds = []
    dtheta = 2.0 * math.pi / 365.0
    for k in range(steps):
        x = build_unet_input(cur_hist, static_norm, theta0 + k * dtheta)
        nxt = model(x)
        preds.append(nxt)
        cur_hist = torch.cat([cur_hist[:, 1:], nxt.unsqueeze(1)], dim=1)
    return torch.stack(preds, dim=1)


def weighted_smooth_l1(pred: torch.Tensor, target: torch.Tensor, weights: torch.Tensor) -> torch.Tensor:
    """SmoothL1Loss with per-channel weights (2x on tp)."""
    loss_fn = nn.SmoothL1Loss(reduction="none", beta=0.5)
    loss = loss_fn(pred, target)
    # weights: [6] -> broadcast over [..., 6, H, W]
    w_shape = (1,) * (loss.ndim - 3) + (6, 1, 1)
    return (loss * weights.view(*w_shape)).mean()


@torch.no_grad()
def evaluate_val_day4_rmse(
    model: nn.Module,
    val_loader: DataLoader,
    static_norm: torch.Tensor,
    mean: np.ndarray,
    std: np.ndarray,
    device: torch.device,
) -> float:
    """Compute mean normalized Day-4 RMSE + physical-space summary on 2019 validation windows."""
    model.eval()
    sq_err_sum = np.zeros(6, dtype=np.float64)
    count = 0
    for hist, theta0, targets in val_loader:
        hist = hist.to(device)
        theta0 = theta0.to(device)
        preds = autoregressive_rollout(model, hist, static_norm, theta0, steps=4)
        pred_d4 = preds[:, 3].cpu().numpy()
        targ_d4 = targets[:, 3].numpy()
        sq_err_sum += ((pred_d4 - targ_d4) ** 2).mean(axis=(2, 3)).sum(axis=0)
        count += pred_d4.shape[0]
    rmse_per_ch = np.sqrt(sq_err_sum / max(count, 1))
    return float(rmse_per_ch.mean())


def export_onnx(model: nn.Module, out_path: Path) -> None:
    """Export MonsoonResUNet to ONNX (opset 17, static [B, 22, 32, 36] with dynamic batch)."""
    model_cpu = model.to("cpu").eval()
    dummy = torch.zeros(1, 22, 32, 36, dtype=torch.float32)
    torch.onnx.export(
        model_cpu,
        dummy,
        str(out_path),
        input_names=["input"],
        output_names=["next_norm"],
        dynamic_axes={"input": {0: "batch"}, "next_norm": {0: "batch"}},
        opset_version=17,
        do_constant_folding=True,
        dynamo=False,
    )


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--nc", type=Path, default=Path("/tmp/india_climate_train.nc"))
    ap.add_argument("--artifacts", type=Path, default=Path("model/artifacts"))
    ap.add_argument("--epochs-s1", type=int, default=30)
    ap.add_argument("--epochs-s2", type=int, default=30)
    ap.add_argument("--batch-size", type=int, default=64)
    ap.add_argument("--base-channels", type=int, default=48)
    ap.add_argument("--seed", type=int, default=42)
    args = ap.parse_args()

    torch.manual_seed(args.seed)
    np.random.seed(args.seed)
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    if device.type == "cpu":
        torch.set_num_threads(6)
    print(f"Using device: {device}", flush=True)

    splits = load_netcdf_splits(args.nc)
    stats, static_norm_np = compute_and_save_artifacts(splits["train_data"], splits["static"], args.artifacts)
    mean = np.array(stats["mean"], dtype=np.float32)
    std = np.array(stats["std"], dtype=np.float32)
    static_norm = torch.from_numpy(static_norm_np).to(device)

    # Datasets
    train_ds_s1 = MonsoonRolloutDataset(splits["train_data"], splits["train_doys"], mean, std, static_norm_np, rollout_steps=1)
    train_ds_s2 = MonsoonRolloutDataset(splits["train_data"], splits["train_doys"], mean, std, static_norm_np, rollout_steps=4)
    val_ds = MonsoonRolloutDataset(splits["val_data"], splits["val_doys"], mean, std, static_norm_np, rollout_steps=4)

    train_loader_s1 = DataLoader(train_ds_s1, batch_size=args.batch_size, shuffle=True, drop_last=True)
    train_loader_s2 = DataLoader(train_ds_s2, batch_size=args.batch_size, shuffle=True, drop_last=True)
    val_loader = DataLoader(val_ds, batch_size=args.batch_size, shuffle=False)

    model = MonsoonResUNet(in_channels=22, out_channels=6, base_channels=args.base_channels).to(device)
    n_params = sum(p.numel() for p in model.parameters())
    print(f"MonsoonResUNet parameters: {n_params:,}", flush=True)

    ch_weights = torch.tensor([1.0, 2.0, 1.0, 1.0, 1.0, 1.0], device=device)
    best_val_rmse = float("inf")
    best_pt = args.artifacts / "monsoon_unet.pt"

    # ---- Stage 1: 1-step training ----
    opt1 = torch.optim.AdamW(model.parameters(), lr=1e-3, weight_decay=1e-4)
    sched1 = torch.optim.lr_scheduler.CosineAnnealingLR(opt1, T_max=max(args.epochs_s1, 1))
    print(f"\n=== Stage 1: 1-step training ({args.epochs_s1} epochs) ===", flush=True)
    for ep in range(1, args.epochs_s1 + 1):
        t0 = time.time()
        model.train()
        tot_loss = 0.0
        for hist, theta0, targets in train_loader_s1:
            hist, theta0, targets = hist.to(device), theta0.to(device), targets.to(device)
            opt1.zero_grad(set_to_none=True)
            pred = model(build_unet_input(hist, static_norm, theta0))
            loss = weighted_smooth_l1(pred, targets[:, 0], ch_weights)
            loss.backward()
            nn.utils.clip_grad_norm_(model.parameters(), 1.0)
            opt1.step()
            tot_loss += float(loss.item())
        sched1.step()
        val_rmse = evaluate_val_day4_rmse(model, val_loader, static_norm, mean, std, device)
        if val_rmse < best_val_rmse:
            best_val_rmse = val_rmse
            torch.save(model.state_dict(), best_pt)
        print(f"S1 Epoch {ep:02d}/{args.epochs_s1:02d} | loss={tot_loss/len(train_loader_s1):.4f} | val_d4_nrmse={val_rmse:.4f} | {time.time()-t0:.1f}s", flush=True)

    # ---- Stage 2: 4-step autoregressive rollout fine-tuning ----
    if args.epochs_s2 > 0:
        model.load_state_dict(torch.load(best_pt, map_location=device, weights_only=True))
        opt2 = torch.optim.AdamW(model.parameters(), lr=2e-4, weight_decay=1e-4)
        sched2 = torch.optim.lr_scheduler.CosineAnnealingLR(opt2, T_max=max(args.epochs_s2, 1))
        print(f"\n=== Stage 2: 4-step autoregressive fine-tuning ({args.epochs_s2} epochs) ===", flush=True)
        for ep in range(1, args.epochs_s2 + 1):
            t0 = time.time()
            model.train()
            tot_loss = 0.0
            for hist, theta0, targets in train_loader_s2:
                hist, theta0, targets = hist.to(device), theta0.to(device), targets.to(device)
                opt2.zero_grad(set_to_none=True)
                preds = autoregressive_rollout(model, hist, static_norm, theta0, steps=4)
                loss = weighted_smooth_l1(preds, targets, ch_weights)
                loss.backward()
                nn.utils.clip_grad_norm_(model.parameters(), 1.0)
                opt2.step()
                tot_loss += float(loss.item())
            sched2.step()
            val_rmse = evaluate_val_day4_rmse(model, val_loader, static_norm, mean, std, device)
            if val_rmse < best_val_rmse:
                best_val_rmse = val_rmse
                torch.save(model.state_dict(), best_pt)
            print(f"S2 Epoch {ep:02d}/{args.epochs_s2:02d} | loss={tot_loss/len(train_loader_s2):.4f} | val_d4_nrmse={val_rmse:.4f} | {time.time()-t0:.1f}s", flush=True)

    # Export best checkpoint to ONNX
    model.load_state_dict(torch.load(best_pt, map_location="cpu", weights_only=True))
    onnx_path = args.artifacts / "monsoon_unet.onnx"
    export_onnx(model, onnx_path)
    print(f"\nBest Val Day-4 nRMSE: {best_val_rmse:.4f}", flush=True)
    print(f"Exported ONNX model to {onnx_path} ({onnx_path.stat().st_size / 1e6:.2f} MB)", flush=True)


if __name__ == "__main__":
    main()
