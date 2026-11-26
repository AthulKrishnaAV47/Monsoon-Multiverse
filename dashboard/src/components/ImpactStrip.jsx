import React from "react";
import { CloudRain, Flame, Sprout, Thermometer } from "lucide-react";

function KpiCard({ icon: Icon, iconBg, title, subtitle, value, primeValue, delta }) {
  const deltaTone =
    delta > 0
      ? "bg-rose-50 text-rose-700 ring-rose-200"
      : delta < 0
      ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
      : "bg-slate-100 text-slate-600 ring-slate-200";

  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3.5 shadow-sm">
      <div className="flex items-start gap-3">
        <div className={`mt-0.5 rounded-lg p-2 ring-1 ${iconBg}`}>
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <div className="text-xs font-semibold text-slate-800">{title}</div>
          <div className="mt-0.5 text-[11px] text-slate-500">{subtitle}</div>
          <div className="mt-1.5 flex items-baseline gap-2">
            <span className="font-mono text-xl font-bold text-slate-900">{value}</span>
            <span className="font-mono text-[11px] text-slate-500">
              (Prime: {primeValue})
            </span>
          </div>
        </div>
      </div>

      <span className={`shrink-0 rounded-full px-2.5 py-1 font-mono text-xs font-semibold ring-1 ${deltaTone}`}>
        {delta > 0 ? `+${delta}` : delta} vs Prime
      </span>
    </div>
  );
}

function TempReadoutCard({ label, sub, primeK, multiK, diffK }) {
  const primeC = primeK - 273.15;
  const multiC = multiK - 273.15;
  const diff = diffK ?? multiK - primeK;
  const diffTone =
    diff > 0.05
      ? "text-orange-700 bg-orange-50 ring-orange-200"
      : diff < -0.05
      ? "text-sky-700 bg-sky-50 ring-sky-200"
      : "text-slate-600 bg-slate-100 ring-slate-200";

  return (
    <div className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800">
            <Thermometer className="h-3.5 w-3.5 text-orange-600" />
            <span>{label}</span>
          </div>
          <div className="mt-0.5 text-[11px] text-slate-500">{sub}</div>
        </div>
        <span className={`shrink-0 rounded-full px-2 py-0.5 font-mono text-[11px] font-semibold ring-1 ${diffTone}`}>
          {diff >= 0 ? `+${diff.toFixed(2)}` : diff.toFixed(2)} K
        </span>
      </div>

      <div className="mt-2.5 grid grid-cols-2 gap-2 font-mono text-xs">
        <div className="rounded-lg bg-slate-50 px-2.5 py-1.5 ring-1 ring-slate-200">
          <div className="text-[10px] uppercase text-slate-500">Prime</div>
          <div className="font-bold text-slate-900">{primeC.toFixed(1)}°C</div>
          <div className="text-[10px] text-slate-500">{primeK.toFixed(1)} K</div>
        </div>
        <div className="rounded-lg bg-orange-50/60 px-2.5 py-1.5 ring-1 ring-orange-200">
          <div className="text-[10px] uppercase text-orange-700">Multiverse</div>
          <div className="font-bold text-orange-900">{multiC.toFixed(1)}°C</div>
          <div className="text-[10px] text-orange-700">{multiK.toFixed(1)} K</div>
        </div>
      </div>
    </div>
  );
}

export default function ImpactStrip({ metrics, tempStats, dayIdx, steps }) {
  if (!metrics && !tempStats) return null;

  return (
    <div className="space-y-4">
      {/* Always-accessible Temperature DOM Inspector (Non-hover + Live Hover Sync) */}
      {tempStats && (
        <section className="space-y-2" aria-label="Temperature Readouts">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              2m Temperature Readouts (t2m in °C & K • Day {dayIdx + 1})
            </h2>
            <span className="text-[11px] text-slate-500">
              Updates live on map hover or tracks Shock Center by default
            </span>
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <TempReadoutCard
              label="India Domain Mean Temp"
              sub="Average across 32 × 36 grid"
              primeK={tempStats.meanPrimeK}
              multiK={tempStats.meanMultiK}
            />
            <TempReadoutCard
              label="Domain Peak Temp"
              sub={`Peak at ${tempStats.peakLat.toFixed(1)}°N, ${tempStats.peakLon.toFixed(1)}°E`}
              primeK={tempStats.peakPrimeK}
              multiK={tempStats.peakMultiK}
            />
            <TempReadoutCard
              label={`${tempStats.pointSource} Temp`}
              sub={`Grid [${tempStats.pointRow},${tempStats.pointCol}] • ${tempStats.pointLat.toFixed(1)}°N, ${tempStats.pointLon.toFixed(1)}°E`}
              primeK={tempStats.pointPrimeK}
              multiK={tempStats.pointMultiK}
              diffK={tempStats.pointDiffK}
            />
          </div>
        </section>
      )}

      {/* Live Real-World Hazard KPIs */}
      {metrics && (
        <section className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Live Real-World Impact Assessment (1° × 1° Grid Cells)
            </h2>
            <span className="text-[11px] text-slate-500">
              Day {dayIdx + 1} hazards & {steps}-day cumulative crop stress
            </span>
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <KpiCard
              icon={CloudRain}
              iconBg="bg-sky-50 text-sky-600 ring-sky-200"
              title="Flood Risk Cells"
              subtitle={`IMD Heavy Rain (> 64.5 mm/day on Day ${dayIdx + 1})`}
              value={`${metrics.flood.multi}`}
              primeValue={metrics.flood.prime}
              delta={metrics.flood.delta}
            />
            <KpiCard
              icon={Flame}
              iconBg="bg-orange-50 text-orange-600 ring-orange-200"
              title="Heatwave Risk Cells"
              subtitle={`Extreme Heat (> 40°C on Day ${dayIdx + 1})`}
              value={`${metrics.heat.multi}`}
              primeValue={metrics.heat.prime}
              delta={metrics.heat.delta}
            />
            <KpiCard
              icon={Sprout}
              iconBg="bg-emerald-50 text-emerald-600 ring-emerald-200"
              title="Kharif Dry-Stress Cells"
              subtitle={`Cumulative Rain < 25 mm over ${steps} days`}
              value={`${metrics.crop.multi}`}
              primeValue={metrics.crop.prime}
              delta={metrics.crop.delta}
            />
          </div>
        </section>
      )}
    </div>
  );
}
