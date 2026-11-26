// Compact perceptual colormaps (5-9 key stops interpolated linearly to 256-entry RGB LUTs)

const STOPS = {
  viridis: [
    [68, 1, 84],
    [59, 82, 139],
    [33, 145, 140],
    [94, 201, 98],
    [253, 231, 37],
  ],
  blues: [
    [15, 23, 42],
    [30, 58, 138],
    [2, 132, 199],
    [56, 189, 248],
    [224, 242, 254],
  ],
  rdbu_r: [
    [37, 99, 235],
    [147, 197, 253],
    [241, 245, 249],
    [252, 165, 165],
    [220, 38, 38],
  ],
};

function buildLut(stops) {
  const lut = new Uint8ClampedArray(256 * 3);
  const n = stops.length - 1;
  for (let i = 0; i < 256; i++) {
    const pos = (i / 255) * n;
    const idx = Math.min(Math.floor(pos), n - 1);
    const t = pos - idx;
    const a = stops[idx];
    const b = stops[idx + 1];
    lut[i * 3] = Math.round(a[0] + (b[0] - a[0]) * t);
    lut[i * 3 + 1] = Math.round(a[1] + (b[1] - a[1]) * t);
    lut[i * 3 + 2] = Math.round(a[2] + (b[2] - a[2]) * t);
  }
  return lut;
}

export const LUTS = {
  viridis: buildLut(STOPS.viridis),
  blues: buildLut(STOPS.blues),
  rdbu_r: buildLut(STOPS.rdbu_r),
};

export function cssGradient(name) {
  const stops = STOPS[name] || STOPS.viridis;
  const cssStops = stops.map(([r, g, b], i) => {
    const pct = Math.round((i / (stops.length - 1)) * 100);
    return `rgb(${r},${g},${b}) ${pct}%`;
  });
  return `linear-gradient(to right, ${cssStops.join(", ")})`;
}

export function sampleLut(lut, norm01) {
  const clamped = Math.max(0, Math.min(1, norm01));
  const idx = Math.round(clamped * 255) * 3;
  return [lut[idx], lut[idx + 1], lut[idx + 2]];
}
