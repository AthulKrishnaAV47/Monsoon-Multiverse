"""2D Residual U-Net for Indian Monsoon Digital Twin (32x36 grid)."""
from __future__ import annotations

import torch
import torch.nn as nn


class ResConvBlock(nn.Module):
    """Two 3x3 replicate-padded convolutions with BatchNorm, GELU, and a residual skip."""

    def __init__(self, in_ch: int, out_ch: int) -> None:
        super().__init__()
        self.conv1 = nn.Conv2d(in_ch, out_ch, kernel_size=3, padding=1, padding_mode="replicate", bias=False)
        self.bn1 = nn.BatchNorm2d(out_ch)
        self.act = nn.GELU()
        self.conv2 = nn.Conv2d(out_ch, out_ch, kernel_size=3, padding=1, padding_mode="replicate", bias=False)
        self.bn2 = nn.BatchNorm2d(out_ch)
        self.skip = (
            nn.Identity()
            if in_ch == out_ch
            else nn.Conv2d(in_ch, out_ch, kernel_size=1, bias=False)
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        h = self.act(self.bn1(self.conv1(x)))
        h = self.bn2(self.conv2(h))
        return self.act(h + self.skip(x))


class MonsoonResUNet(nn.Module):
    """2-level 2D Residual U-Net predicting normalized day-over-day state deltas.

    Input channels (22 total at 32x36):
      - 0..17:  3 consecutive days x 6 normalized dynamic channels (oldest first)
      - 18..19: 2 static channels (land_sea_mask, normalized orography_m)
      - 20..21: 2 seasonal channels (sin(doy), cos(doy) broadcast to 32x36)

    Output channels (6 total at 32x36):
      - Predicted normalized state for the next day:
        next_norm = current_norm + unet_delta(inputs)
    """

    def __init__(self, in_channels: int = 22, out_channels: int = 6, base_channels: int = 48) -> None:
        super().__init__()
        c1 = base_channels          # 48
        c2 = base_channels * 2      # 96
        c3 = base_channels * 4      # 192

        # Encoder: 32x36 -> 16x18 -> 8x9
        self.enc1 = ResConvBlock(in_channels, c1)
        self.down1 = nn.Conv2d(c1, c1, kernel_size=2, stride=2, bias=False)
        self.enc2 = ResConvBlock(c1, c2)
        self.down2 = nn.Conv2d(c2, c2, kernel_size=2, stride=2, bias=False)

        # Bottleneck: 8x9
        self.bottleneck = ResConvBlock(c2, c3)

        # Decoder: 8x9 -> 16x18 -> 32x36
        self.up2 = nn.ConvTranspose2d(c3, c2, kernel_size=2, stride=2)
        self.dec2 = ResConvBlock(c2 + c2, c2)
        self.up1 = nn.ConvTranspose2d(c2, c1, kernel_size=2, stride=2)
        self.dec1 = ResConvBlock(c1 + c1, c1)

        # Delta head (zero-initialized so initial predictions start near persistence)
        self.head = nn.Conv2d(c1, out_channels, kernel_size=1)
        nn.init.zeros_(self.head.weight)
        nn.init.zeros_(self.head.bias)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        # Most recent day's 6 normalized dynamic channels are at indices 12:18
        current_norm = x[:, 12:18, :, :]

        e1 = self.enc1(x)
        e2 = self.enc2(self.down1(e1))
        b = self.bottleneck(self.down2(e2))

        d2 = self.dec2(torch.cat([self.up2(b), e2], dim=1))
        d1 = self.dec1(torch.cat([self.up1(d2), e1], dim=1))

        delta = self.head(d1)
        return current_norm + delta
