import { LAT_MIN, LON_MIN, NLAT, NLON, boxToGridIndices } from "../data/presets";

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

  const steps = primeRollout.length;

  for (let r = 0; r < NLAT; r++) {
    for (let c = 0; c < NLON; c++) {
      // Day-specific Flood (>64.5 mm/day) and Heatwave (>40°C = 313.15 K)
      if (primeRollout[dayIdx][1][r][c] > 64.5) floodPrime++;
      if (multiRollout[dayIdx][1][r][c] > 64.5) floodMulti++;

      if (primeRollout[dayIdx][0][r][c] > 313.15) heatPrime++;
      if (multiRollout[dayIdx][0][r][c] > 313.15) heatMulti++;

      // Cumulative rollout rain < 25 mm -> Kharif dry-stress
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

  // Focus point: hovered cell, or center of active shock box, or Central India [14, 14]
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
