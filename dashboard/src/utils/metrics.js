import {
  LAT_MIN,
  LON_MIN,
  NLAT,
  NLON,
  boxToGridIndices,
  clampGridIndex,
} from "../data/presets";

export function computeImpactMetrics(primeRollout, multiRollout, dayIdx) {
  if (!primeRollout || !multiRollout || !primeRollout[dayIdx] || !multiRollout[dayIdx]) {
    return null;
  }

  let floodPrime = 0;
  let floodMulti = 0;
  let heatPrime = 0;
  let heatMulti = 0;
  let cropPrime = 0;
  let cropMulti = 0;

  const steps = Math.min(primeRollout.length, multiRollout.length);

  for (let r = 0; r < NLAT; r++) {
    for (let c = 0; c < NLON; c++) {
      if (primeRollout[dayIdx][1][r][c] > 64.5) floodPrime++;
      if (multiRollout[dayIdx][1][r][c] > 64.5) floodMulti++;

      if (primeRollout[dayIdx][0][r][c] > 313.15) heatPrime++;
      if (multiRollout[dayIdx][0][r][c] > 313.15) heatMulti++;

      let sumPrime = 0;
      let sumMulti = 0;
      for (let d = 0; d < steps; d++) {
        sumPrime += primeRollout[d][1][r][c];
        sumMulti += multiRollout[d][1][r][c];
      }
      if (sumPrime < 25.0) cropPrime++;
      if (sumMulti < 25.0) cropMulti++;
    }
  }

  return {
    flood: { prime: floodPrime, multi: floodMulti, delta: floodMulti - floodPrime },
    heat: { prime: heatPrime, multi: heatMulti, delta: heatMulti - heatPrime },
    crop: { prime: cropPrime, multi: cropMulti, delta: cropMulti - cropPrime },
  };
}

export function computeMaxCausalRipple(primeRollout, multiRollout) {
  if (!primeRollout || !multiRollout) return 0;
  let maxDiff = 0;
  const steps = Math.min(primeRollout.length, multiRollout.length);
  for (let d = 0; d < steps; d++) {
    for (let ch = 0; ch < 6; ch++) {
      for (let r = 0; r < NLAT; r++) {
        for (let c = 0; c < NLON; c++) {
          const diff = Math.abs(multiRollout[d][ch][r][c] - primeRollout[d][ch][r][c]);
          if (diff > maxDiff) maxDiff = diff;
        }
      }
    }
  }
  return maxDiff;
}

export function computePhysicsTelemetry(primeRollout, multiRollout) {
  const active = multiRollout || primeRollout;
  if (!active || active.length === 0) return null;

  const rollouts = [primeRollout, multiRollout].filter(Boolean);
  let nonFiniteCount = 0;
  let minRain = Infinity;

  for (const roll of rollouts) {
    for (let d = 0; d < roll.length; d++) {
      for (let ch = 0; ch < 6; ch++) {
        for (let r = 0; r < NLAT; r++) {
          for (let c = 0; c < NLON; c++) {
            const v = roll[d][ch][r][c];
            if (!Number.isFinite(v)) {
              nonFiniteCount++;
            } else if (ch === 1 && v < minRain) {
              minRain = v;
            }
          }
        }
      }
    }
  }

  const nCells = NLAT * NLON;
  const d0 = 0;
  const dLast = active.length - 1;
  let mslStart = 0;
  let mslEnd = 0;
  let tcwvStart = 0;
  let tcwvEnd = 0;

  for (let r = 0; r < NLAT; r++) {
    for (let c = 0; c < NLON; c++) {
      mslStart += active[d0][4][r][c];
      mslEnd += active[dLast][4][r][c];
      tcwvStart += active[d0][5][r][c];
      tcwvEnd += active[dLast][5][r][c];
    }
  }

  const mslDriftHpa = (mslEnd - mslStart) / nCells / 100.0;
  const tcwvDrift = (tcwvEnd - tcwvStart) / nCells;

  return {
    nonFiniteCount,
    finitePass: nonFiniteCount === 0,
    minRain: Number.isFinite(minRain) ? minRain : 0,
    nonNegativeRainPass: Number.isFinite(minRain) && minRain >= 0.0,
    mslDriftHpa,
    tcwvDrift,
    stepsChecked: active.length,
  };
}

export function computeTemperatureSummary(primeRollout, multiRollout, dayIdx, shockBox, focusCell) {
  if (!primeRollout?.[dayIdx] || !multiRollout?.[dayIdx]) return null;

  const pT = primeRollout[dayIdx][0];
  const mT = multiRollout[dayIdx][0];
  const n = NLAT * NLON;

  let pSum = 0;
  let mSum = 0;
  let pMaxK = -Infinity;
  let mMaxK = -Infinity;
  let peakLat = LAT_MIN;
  let peakLon = LON_MIN;

  for (let r = 0; r < NLAT; r++) {
    for (let c = 0; c < NLON; c++) {
      const pv = pT[r][c];
      const mv = mT[r][c];
      pSum += pv;
      mSum += mv;
      if (pv > pMaxK) pMaxK = pv;
      if (mv > mMaxK) {
        mMaxK = mv;
        peakLat = LAT_MIN + r;
        peakLon = LON_MIN + c;
      }
    }
  }

  let fr = 14;
  let fc = 14;
  let pointSource = "Central India";
  if (focusCell) {
    fr = focusCell.r;
    fc = focusCell.c;
    pointSource = "Hovered Cell";
  } else if (shockBox) {
    const idx = boxToGridIndices(shockBox);
    fr = Math.floor((idx.rowMin + idx.rowMax) / 2);
    fc = Math.floor((idx.colMin + idx.colMax) / 2);
    pointSource = "Shock Center";
  }

  const pointPrimeK = pT[fr][fc];
  const pointMultiK = mT[fr][fc];

  return {
    meanPrimeK: pSum / n,
    meanMultiK: mSum / n,
    peakPrimeK: pMaxK,
    peakMultiK: mMaxK,
    peakLat,
    peakLon,
    pointSource,
    pointRow: fr,
    pointCol: fc,
    pointLat: LAT_MIN + fr,
    pointLon: LON_MIN + fc,
    pointPrimeK,
    pointMultiK,
    pointDiffK: pointMultiK - pointPrimeK,
  };
}

export const ENSEMBLE_SCALES = [0.85, 0.92, 1.0, 1.08, 1.15];

// Generates 5 deterministic jittered [6, 32, 36] perturbation tensors around basePert
export function buildEnsemblePerturbations(basePert) {
  return ENSEMBLE_SCALES.map((scale, mIdx) => {
    const out = [];
    for (let ch = 0; ch < 6; ch++) {
      const grid = [];
      for (let r = 0; r < NLAT; r++) {
        const row = new Array(NLON);
        for (let c = 0; c < NLON; c++) {
          const v = basePert?.[ch]?.[r]?.[c] ?? 0;
          if (v === 0) {
            row[c] = 0;
          } else if (scale === 1.0) {
            row[c] = Math.fround(v);
          } else {
            // Deterministic +-5% spatial ripple layered onto multiplicative scale
            const phase = Math.sin((mIdx + 1) * 1.7 + ch * 2.3 + r * 0.61 + c * 0.43);
            row[c] = Math.fround(v * (scale + 0.05 * phase));
          }
        }
        grid.push(row);
      }
      out.push(grid);
    }
    return out;
  });
}

function getTargetCells(target, shockBox) {
  if (target?.type === "city") {
    const r = clampGridIndex(target.lat - LAT_MIN, NLAT - 1);
    const c = clampGridIndex(target.lon - LON_MIN, NLON - 1);
    return [{ r, c }];
  }
  if (target?.type === "cell") {
    return [{
      r: clampGridIndex(target.r, NLAT - 1),
      c: clampGridIndex(target.c, NLON - 1),
    }];
  }
  const box = shockBox || { latMin: 17.5, latMax: 25.5, lonMin: 74.5, lonMax: 84.5 };
  const idx = boxToGridIndices(box);
  const cells = [];
  for (let r = idx.rowMin; r <= idx.rowMax; r++) {
    for (let c = idx.colMin; c <= idx.colMax; c++) {
      cells.push({ r, c });
    }
  }
  return cells;
}

function averageCells(grid, cells, toDisplay) {
  let sum = 0;
  for (const { r, c } of cells) {
    sum += toDisplay(grid[r][c]);
  }
  return sum / Math.max(1, cells.length);
}

export function computeRegionSeries({
  primeRollout,
  multiRollout,
  ensembleRollouts,
  target,
  shockBox,
  channelId,
}) {
  if (!primeRollout || primeRollout.length === 0) return [];
  const chIdx = channelId === "t2m" ? 0 : 1;
  const toDisplay = chIdx === 0 ? (v) => v - 273.15 : (v) => v;
  const cells = getTargetCells(target, shockBox);
  const steps = primeRollout.length;

  return Array.from({ length: steps }, (_, d) => {
    const prime = averageCells(primeRollout[d][chIdx], cells, toDisplay);
    const multi = multiRollout?.[d]
      ? averageCells(multiRollout[d][chIdx], cells, toDisplay)
      : prime;

    let members = null;
    let ensMean = null;
    let ensMin = null;
    let ensMax = null;
    let spread = null;

    if (ensembleRollouts && ensembleRollouts.length > 0) {
      members = ensembleRollouts
        .filter((roll) => roll?.[d]?.[chIdx])
        .map((roll) => averageCells(roll[d][chIdx], cells, toDisplay));
      if (members.length > 0) {
        const sorted = [...members].sort((a, b) => a - b);
        ensMean = members.reduce((acc, v) => acc + v, 0) / members.length;
        ensMin = sorted[0];
        ensMax = sorted[sorted.length - 1];
        spread = ensMax - ensMin;
      }
    }

    return {
      day: d + 1,
      prime,
      multi,
      members,
      ensMean,
      ensMin,
      ensMax,
      spread,
    };
  });
}
