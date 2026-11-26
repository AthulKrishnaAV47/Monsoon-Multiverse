import { NLAT, NLON } from "../data/presets";

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
  for (let d = 0; d < primeRollout.length; d++) {
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
