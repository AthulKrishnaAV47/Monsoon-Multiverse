import React, { useId, useMemo } from "react";
import { GitBranch, TrendingUp } from "lucide-react";
import { REFERENCE_CITIES } from "../data/indiaGeo";
import { computeRegionSeries } from "../utils/metrics";

const W = 740;
const H = 240;
const PAD = { top: 20, right: 24, bottom: 32, left: 56 };

function targetLabel(target) {
  if (target?.type === "city") return `${target.name} (${target.lat}°N, ${target.lon}°E)`;
  if (target?.type === "cell") {
    return `Grid Cell [${target.r},${target.c}] (${target.lat.toFixed(1)}°N, ${target.lon.toFixed(1)}°E)`;
  }
  return "Active Shock Box Mean";
}

export default function EnsembleChartPanel({
  primeRollout,
  multiRollout,
  ensembleState,
  onRunEnsemble,
  selectedTarget,
  onSelectTarget,
  shockBox,
  chartChannel,
  onChartChannelChange,
  dayIdx,
}) {
  const clipId = useId();

  const series = useMemo(
    () =>
      computeRegionSeries({
        primeRollout,
        multiRollout,
        ensembleRollouts: ensembleState.rollouts,
        target: selectedTarget,
        shockBox,
        channelId: chartChannel,
      }),
    [primeRollout, multiRollout, ensembleState.rollouts, selectedTarget, shockBox, chartChannel]
  );

  const activeIdx = Math.min(dayIdx, Math.max(0, series.length - 1));

  const chartGeom = useMemo(() => {
    if (!series.length) return null;

    const hasEns =
      series.length > 0 &&
      series.every(
        (pt) =>
          pt.ensMean != null &&
          Number.isFinite(pt.ensMin) &&
          Number.isFinite(pt.ensMax)
      );

    const allVals = [];
    for (const pt of series) {
      if (Number.isFinite(pt.prime)) allVals.push(pt.prime);
      if (Number.isFinite(pt.multi)) allVals.push(pt.multi);
      if (hasEns) {
        allVals.push(pt.ensMin, pt.ensMax);
        if (pt.members) {
          for (const mv of pt.members) {
            if (Number.isFinite(mv)) allVals.push(mv);
          }
        }
      }
    }
    if (!allVals.length) return null;

    const rawMin = Math.min(...allVals);
    const rawMax = Math.max(...allVals);
    const span = rawMax - rawMin;
    const pad = Math.max(span * 0.15, chartChannel === "tp" ? 1.0 : 0.75);
    const yMin = chartChannel === "tp" ? Math.max(0, rawMin - pad * 0.25) : rawMin - pad;
    const yMax = rawMax + pad;

    const plotW = W - PAD.left - PAD.right;
    const plotH = H - PAD.top - PAD.bottom;
    const n = series.length;

    const xAt = (i) => PAD.left + (n === 1 ? plotW / 2 : (i / (n - 1)) * plotW);
    const yAt = (val) => {
      const t = (val - yMin) / Math.max(yMax - yMin, 1e-6);
      const y = PAD.top + plotH - t * plotH;
      return Math.max(PAD.top, Math.min(PAD.top + plotH, y));
    };

    const primePath = series
      .map((pt, i) => `${i === 0 ? "M" : "L"} ${xAt(i).toFixed(1)} ${yAt(pt.prime).toFixed(1)}`)
      .join(" ");
    const multiPath = series
      .map((pt, i) => `${i === 0 ? "M" : "L"} ${xAt(i).toFixed(1)} ${yAt(pt.multi).toFixed(1)}`)
      .join(" ");

    const ensMeanPath = hasEns
      ? series
          .map((pt, i) => `${i === 0 ? "M" : "L"} ${xAt(i).toFixed(1)} ${yAt(pt.ensMean).toFixed(1)}`)
          .join(" ")
      : null;

    const conePoints = hasEns
      ? [
          ...series.map((pt, i) => `${xAt(i).toFixed(1)},${yAt(pt.ensMax).toFixed(1)}`),
          ...[...series]
            .reverse()
            .map((pt, i) => `${xAt(n - 1 - i).toFixed(1)},${yAt(pt.ensMin).toFixed(1)}`),
        ].join(" ")
      : null;

    const memberPaths = hasEns
      ? series[0].members.map((_, mIdx) =>
          series
            .map(
              (pt, i) =>
                `${i === 0 ? "M" : "L"} ${xAt(i).toFixed(1)} ${yAt(pt.members[mIdx]).toFixed(1)}`
            )
            .join(" ")
        )
      : [];

    const yTicks = Array.from({ length: 5 }, (_, i) => {
      const val = yMin + ((yMax - yMin) * i) / 4;
      return { val, y: yAt(val) };
    });

    return {
      plotW,
      plotH,
      xAt,
      yAt,
      primePath,
      multiPath,
      ensMeanPath,
      conePoints,
      memberPaths,
      yTicks,
      hasEns,
    };
  }, [series, chartChannel]);

  const unit = chartChannel === "t2m" ? "°C" : "mm/day";
  const activeDayRow = series[activeIdx];
  const maxSpread = useMemo(() => {
    const spreads = series.map((s) => s.spread).filter((v) => v != null);
    return spreads.length ? Math.max(...spreads) : null;
  }, [series]);

  return (
    <section
      className="min-w-0 space-y-3 overflow-hidden rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
      aria-label="Regional Time-Series and 5-Member Ensemble"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-700">
            <TrendingUp className="h-4 w-4 shrink-0 text-sky-600" />
            <span>Regional / City Forecast & 5-Member Uncertainty Cone</span>
          </h2>
          <p className="mt-0.5 text-[11px] text-slate-500">
            Target: <strong className="text-slate-800">{targetLabel(selectedTarget)}</strong> — Click any city marker or grid cell on the maps above
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-lg bg-slate-100 p-0.5 ring-1 ring-slate-200 text-xs">
            <button
              onClick={() => onChartChannelChange("tp")}
              className={`rounded-md px-2.5 py-1 font-medium transition ${
                chartChannel === "tp"
                  ? "bg-white text-sky-700 shadow-sm ring-1 ring-slate-200"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Precipitation (mm/day)
            </button>
            <button
              onClick={() => onChartChannelChange("t2m")}
              className={`rounded-md px-2.5 py-1 font-medium transition ${
                chartChannel === "t2m"
                  ? "bg-white text-orange-700 shadow-sm ring-1 ring-slate-200"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Temperature (°C)
            </button>
          </div>

          <button
            onClick={onRunEnsemble}
            disabled={ensembleState.loading || !primeRollout}
            className="flex items-center gap-1.5 rounded-lg bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-sky-700 disabled:opacity-50"
          >
            <GitBranch className="h-3.5 w-3.5" />
            <span>
              {ensembleState.loading
                ? "Running 5 Members..."
                : ensembleState.rollouts
                ? "Re-run 5-Member Ensemble"
                : "Run 5-Member Ensemble"}
            </span>
          </button>
        </div>
      </div>

      {/* Target Quick Selector */}
      <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
        <button
          onClick={() => onSelectTarget({ type: "box" })}
          className={`rounded-md px-2.5 py-1 font-medium transition ${
            selectedTarget?.type === "box"
              ? "bg-orange-50 text-orange-800 ring-1 ring-orange-400"
              : "bg-slate-50 text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100"
          }`}
        >
          Active Shock Box
        </button>
        {REFERENCE_CITIES.map((city) => {
          const active = selectedTarget?.type === "city" && selectedTarget.name === city.name;
          return (
            <button
              key={city.name}
              onClick={() => onSelectTarget({ type: "city", ...city })}
              className={`rounded-md px-2.5 py-1 font-medium transition ${
                active
                  ? "bg-sky-50 text-sky-800 ring-1 ring-sky-400"
                  : "bg-slate-50 text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100"
              }`}
            >
              {city.name}
            </button>
          );
        })}
        {selectedTarget?.type === "cell" && (
          <span className="rounded-md bg-sky-50 px-2.5 py-1 font-mono font-semibold text-sky-800 ring-1 ring-sky-400">
            Cell [{selectedTarget.r},{selectedTarget.c}]
          </span>
        )}
        {ensembleState.stale && ensembleState.rollouts && (
          <span className="ml-auto rounded bg-amber-50 px-2 py-0.5 font-medium text-amber-800 ring-1 ring-amber-200">
            Inputs changed — click Re-run 5-Member Ensemble to refresh spread
          </span>
        )}
      </div>

      {/* Time-Series SVG + Legend */}
      {chartGeom ? (
        <div className="min-w-0 overflow-hidden rounded-lg bg-slate-50/70 p-3 ring-1 ring-slate-200">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-[11px]">
            <div className="flex flex-wrap items-center gap-4">
              <span className="flex items-center gap-1.5 font-medium text-slate-700">
                <span className="inline-block h-0.5 w-5 border-t-2 border-dashed border-sky-600" />
                Timeline Prime
              </span>
              <span className="flex items-center gap-1.5 font-medium text-slate-700">
                <span className="inline-block h-0.5 w-5 bg-orange-600" />
                {chartGeom.hasEns ? "Multiverse Ensemble Mean (5 members)" : "Multiverse Shocked"}
              </span>
              {chartGeom.hasEns && (
                <span className="flex items-center gap-1.5 font-medium text-slate-700">
                  <span className="inline-block h-3 w-4 rounded-sm bg-orange-500/25 ring-1 ring-orange-400/60" />
                  Min–Max Uncertainty Cone (0.85x–1.15x jitter)
                </span>
              )}
            </div>
            {ensembleState.avgMs != null && (
              <span className="font-mono text-slate-500">
                Ensemble avg: {ensembleState.avgMs.toFixed(1)} ms/member
              </span>
            )}
          </div>

          <svg
            viewBox={`0 0 ${W} ${H}`}
            preserveAspectRatio="xMidYMid meet"
            className="block h-auto max-h-64 w-full overflow-hidden"
          >
            <defs>
              <clipPath id={clipId}>
                <rect
                  x={PAD.left - 2}
                  y={PAD.top - 4}
                  width={chartGeom.plotW + 4}
                  height={chartGeom.plotH + 8}
                />
              </clipPath>
            </defs>

            {/* Plot Frame Background */}
            <rect
              x={PAD.left}
              y={PAD.top}
              width={chartGeom.plotW}
              height={chartGeom.plotH}
              fill="#ffffff"
              stroke="#cbd5e1"
              strokeWidth="1"
            />

            {/* Horizontal gridlines & Y ticks */}
            {chartGeom.yTicks.map((t, i) => (
              <g key={i}>
                <line
                  x1={PAD.left}
                  x2={W - PAD.right}
                  y1={t.y}
                  y2={t.y}
                  stroke="#e2e8f0"
                  strokeWidth="1"
                />
                <text
                  x={PAD.left - 8}
                  y={t.y + 3.5}
                  textAnchor="end"
                  fontSize="10"
                  className="fill-slate-600 font-mono"
                >
                  {t.val.toFixed(1)}
                </text>
              </g>
            ))}

            {/* X-axis day ticks */}
            {series.map((pt, i) => (
              <text
                key={pt.day}
                x={chartGeom.xAt(i)}
                y={H - 10}
                textAnchor="middle"
                fontSize="10"
                className={`font-mono ${
                  i === activeIdx ? "fill-sky-700 font-bold" : "fill-slate-500"
                }`}
              >
                D{pt.day}
              </text>
            ))}

            {/* Clipped Plot Series */}
            <g clipPath={`url(#${clipId})`}>
              {series[activeIdx] && (
                <line
                  x1={chartGeom.xAt(activeIdx)}
                  x2={chartGeom.xAt(activeIdx)}
                  y1={PAD.top}
                  y2={PAD.top + chartGeom.plotH}
                  stroke="#0284c7"
                  strokeOpacity="0.35"
                  strokeDasharray="3 3"
                  strokeWidth="1.5"
                />
              )}

              {chartGeom.conePoints && (
                <polygon points={chartGeom.conePoints} fill="rgba(249, 115, 22, 0.22)" />
              )}

              {chartGeom.memberPaths.map((d, idx) => (
                <path
                  key={idx}
                  d={d}
                  fill="none"
                  stroke="#fb923c"
                  strokeOpacity="0.5"
                  strokeWidth="1.1"
                />
              ))}

              <path
                d={chartGeom.primePath}
                fill="none"
                stroke="#0284c7"
                strokeDasharray="5 4"
                strokeWidth="2.2"
              />

              <path
                d={chartGeom.ensMeanPath || chartGeom.multiPath}
                fill="none"
                stroke="#ea580c"
                strokeWidth="2.5"
              />

              {series[activeIdx] && (
                <>
                  <circle
                    cx={chartGeom.xAt(activeIdx)}
                    cy={chartGeom.yAt(series[activeIdx].prime)}
                    r="4"
                    fill="#0284c7"
                    stroke="#ffffff"
                    strokeWidth="1.5"
                  />
                  <circle
                    cx={chartGeom.xAt(activeIdx)}
                    cy={chartGeom.yAt(series[activeIdx].ensMean ?? series[activeIdx].multi)}
                    r="4.5"
                    fill="#ea580c"
                    stroke="#ffffff"
                    strokeWidth="1.5"
                  />
                </>
              )}
            </g>
          </svg>
        </div>
      ) : null}

      {/* Non-Hover DOM Numeric Readouts */}
      {activeDayRow && (
        <div className="space-y-2.5">
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            <div className="rounded-lg bg-slate-50 px-3 py-2 ring-1 ring-slate-200">
              <div className="text-[10px] font-semibold uppercase text-slate-500">
                Day {activeDayRow.day} Prime
              </div>
              <div className="font-mono text-sm font-bold text-sky-700">
                {activeDayRow.prime.toFixed(2)} {unit}
              </div>
            </div>
            <div className="rounded-lg bg-orange-50/60 px-3 py-2 ring-1 ring-orange-200">
              <div className="text-[10px] font-semibold uppercase text-orange-700">
                Day {activeDayRow.day} {activeDayRow.ensMean != null ? "Ensemble Mean" : "Multiverse"}
              </div>
              <div className="font-mono text-sm font-bold text-orange-800">
                {(activeDayRow.ensMean ?? activeDayRow.multi).toFixed(2)} {unit}
              </div>
            </div>
            <div className="rounded-lg bg-slate-50 px-3 py-2 ring-1 ring-slate-200">
              <div className="text-[10px] font-semibold uppercase text-slate-500">
                Day {activeDayRow.day} Min–Max Cone
              </div>
              <div className="font-mono text-sm font-bold text-slate-800">
                {activeDayRow.ensMin != null
                  ? `${activeDayRow.ensMin.toFixed(2)} – ${activeDayRow.ensMax.toFixed(2)} ${unit}`
                  : "Run Ensemble"}
              </div>
            </div>
            <div className="rounded-lg bg-slate-50 px-3 py-2 ring-1 ring-slate-200">
              <div className="text-[10px] font-semibold uppercase text-slate-500">
                Max Horizon Spread
              </div>
              <div className="font-mono text-sm font-bold text-violet-700">
                {maxSpread != null ? `±${(maxSpread / 2).toFixed(2)} (${maxSpread.toFixed(2)} ${unit})` : "—"}
              </div>
            </div>
          </div>

          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="w-full text-left font-mono text-[11px]">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-2.5 py-1.5 font-semibold">Metric ({unit})</th>
                  {series.map((pt) => (
                    <th
                      key={pt.day}
                      className={`px-2 py-1.5 text-right font-semibold ${
                        pt.day - 1 === activeIdx ? "bg-sky-50 text-sky-800" : ""
                      }`}
                    >
                      D{pt.day}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                <tr>
                  <td className="px-2.5 py-1 font-medium text-sky-700">Prime</td>
                  {series.map((pt) => (
                    <td key={pt.day} className="px-2 py-1 text-right text-slate-700">
                      {pt.prime.toFixed(2)}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="px-2.5 py-1 font-medium text-orange-700">
                    {chartGeom?.hasEns ? "Ens. Mean" : "Multiverse"}
                  </td>
                  {series.map((pt) => (
                    <td key={pt.day} className="px-2 py-1 text-right font-semibold text-orange-800">
                      {(pt.ensMean ?? pt.multi).toFixed(2)}
                    </td>
                  ))}
                </tr>
                {chartGeom?.hasEns && (
                  <tr>
                    <td className="px-2.5 py-1 font-medium text-slate-500">Spread (Max−Min)</td>
                    {series.map((pt) => (
                      <td key={pt.day} className="px-2 py-1 text-right text-slate-600">
                        {pt.spread != null ? pt.spread.toFixed(2) : "—"}
                      </td>
                    ))}
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}
