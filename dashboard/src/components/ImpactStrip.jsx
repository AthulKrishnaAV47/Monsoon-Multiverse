import React from "react";
import { CloudRain, Flame, Sprout } from "lucide-react";

function KpiCard({ icon: Icon, iconColor, title, subtitle, value, primeValue, delta }) {
  const deltaTone =
    delta > 0
      ? "bg-rose-500/15 text-rose-300 ring-rose-500/30"
      : delta < 0
      ? "bg-emerald-500/15 text-emerald-300 ring-emerald-500/30"
      : "bg-slate-800 text-slate-400 ring-slate-700";

  return (
    <div className="flex items-center justify-between rounded-xl border border-slate-800/80 bg-slate-900/70 px-4 py-3">
      <div className="flex items-start gap-3">
        <div className={`mt-0.5 rounded-lg bg-slate-950 p-2 ring-1 ring-slate-800 ${iconColor}`}>
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <div className="text-xs font-medium text-slate-300">{title}</div>
          <div className="text-[11px] text-slate-500">{subtitle}</div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="font-mono text-xl font-semibold text-slate-100">{value}</span>
            <span className="font-mono text-[11px] text-slate-500">
              (Prime: {primeValue})
            </span>
          </div>
        </div>
      </div>

      <span className={`rounded-full px-2.5 py-1 font-mono text-xs font-medium ring-1 ${deltaTone}`}>
        {delta > 0 ? `+${delta}` : delta} vs Prime
      </span>
    </div>
  );
}

export default function ImpactStrip({ metrics, dayIdx, steps }) {
  if (!metrics) return null;

  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          Live Real-World Impact Assessment (1° × 1° Grid Cells)
        </h2>
        <span className="text-[11px] text-slate-500">
          Day {dayIdx + 1} hazards & {steps}-day cumulative crop stress
        </span>
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <KpiCard
          icon={CloudRain}
          iconColor="text-sky-400"
          title="Flood Risk Cells"
          subtitle={`IMD Heavy Rain (> 64.5 mm/day on Day ${dayIdx + 1})`}
          value={`${metrics.flood.multi}`}
          primeValue={metrics.flood.prime}
          delta={metrics.flood.delta}
        />
        <KpiCard
          icon={Flame}
          iconColor="text-orange-400"
          title="Heatwave Risk Cells"
          subtitle={`Extreme Heat (> 40°C on Day ${dayIdx + 1})`}
          value={`${metrics.heat.multi}`}
          primeValue={metrics.heat.prime}
          delta={metrics.heat.delta}
        />
        <KpiCard
          icon={Sprout}
          iconColor="text-lime-400"
          title="Kharif Dry-Stress Cells"
          subtitle={`Cumulative Rain < 25 mm over ${steps} days`}
          value={`${metrics.crop.multi}`}
          primeValue={metrics.crop.prime}
          delta={metrics.crop.delta}
        />
      </div>
    </section>
  );
}
