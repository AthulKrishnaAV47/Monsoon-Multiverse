// AccuWeather-inspired weather radar & thermal ramps for light-theme cartography

const STOPS = {
  // Cool teal/azure -> emerald -> warm gold -> AccuWeather orange -> deep crimson
  accu_temp: [
    [14, 116, 144],
    [56, 189, 248],
    [74, 222, 128],
    [250, 204, 21],
    [249, 115, 22],
    [185, 28, 28],
  ],
  // Light coastal mist -> aqua -> radar green -> cobalt -> intense violet storm core
  accu_rain: [
    [241, 245, 249],
    [186, 230, 253],
    [56, 189, 248],
    [37, 99, 235],
    [109, 40, 217],
    [190, 24, 93],
  ],
  // Slate-sky -> teal -> gold -> amber wind gusts
  accu_wind: [
    [226, 232, 240],
    [125, 211, 252],
    [20, 184, 166],
    [245, 158, 11],
    [220, 38, 38],
  ],
  // Deep indigo low-pressure -> sky -> neutral cream -> amber ridge
  accu_pressure: [
    [67, 56, 202],
    [56, 189, 248],
    [226, 232, 240],
    [251, 191, 36],
    [234, 88, 12],
  ],
  // Dry sand -> pale mint -> sky blue -> deep moisture cobalt
  accu_moisture: [
    [254, 243, 199],
    [167, 243, 208],
    [56, 189, 248],
    [29, 78, 216],
    [30, 58, 138],
  ],
  // Diverging Causal Difference centered at clean light off-white
  rdbu_r: [
    [29, 78, 216],
    [147, 197, 253],
    [248, 250, 252],
    [253, 164, 175],
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
  accu_temp: buildLut(STOPS.accu_temp),
  accu_rain: buildLut(STOPS.accu_rain),
  accu_wind: buildLut(STOPS.accu_wind),
  accu_pressure: buildLut(STOPS.accu_pressure),
  accu_moisture: buildLut(STOPS.accu_moisture),
  rdbu_r: buildLut(STOPS.rdbu_r),
};

export function cssGradient(name) {
  const stops = STOPS[name] || STOPS.accu_temp;
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
