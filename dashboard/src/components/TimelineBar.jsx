import React from "react";
import { Play, Pause, SkipBack, SkipForward } from "lucide-react";

export default function TimelineBar({
  steps,
  requestedSteps,
  dayIdx,
  onDayChange,
  playing,
  onTogglePlay,
  speedMs,
  onSpeedChange,
  simLoading,
}) {
  const safeDay = Math.min(dayIdx, Math.max(0, steps - 1));
  const syncingHorizon = requestedSteps != null && requestedSteps !== steps;

  return (
    <div className="flex flex-wrap items-center gap-4 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
      <div className="flex items-center gap-2">
        <button
          onClick={() => onDayChange((safeDay - 1 + steps) % steps)}
          className="rounded-lg bg-slate-100 p-2 text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-200"
          title="Previous Day"
        >
          <SkipBack className="h-4 w-4" />
        </button>

        <button
          onClick={onTogglePlay}
          className={`flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold transition ${
            playing
              ? "bg-orange-600 text-white shadow-sm hover:bg-orange-700"
              : "bg-sky-600 text-white shadow-sm hover:bg-sky-700"
          }`}
        >
          {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
          <span>{playing ? "Pause" : "Animate"}</span>
        </button>

        <button
          onClick={() => onDayChange((safeDay + 1) % steps)}
          className="rounded-lg bg-slate-100 p-2 text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-200"
          title="Next Day"
        >
          <SkipForward className="h-4 w-4" />
        </button>
      </div>

      <div className="flex min-w-[200px] flex-1 items-center gap-3">
        <span className="shrink-0 font-mono text-xs font-semibold text-slate-900">
          Day {safeDay + 1} <span className="text-slate-400">/ {steps}</span>
        </span>
        <input
          type="range"
          min={0}
          max={Math.max(0, steps - 1)}
          value={safeDay}
          onChange={(e) => onDayChange(Number(e.target.value))}
          className="w-full accent-sky-600"
        />
      </div>

      <div className="flex items-center gap-3">
        {(simLoading || syncingHorizon) && (
          <span className="animate-pulse font-mono text-[11px] font-medium text-sky-700">
            {syncingHorizon ? `Syncing ${requestedSteps}d...` : "Running ONNX..."}
          </span>
        )}
        <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1 ring-1 ring-slate-200 text-[11px]">
          {[
            { label: "0.5x", ms: 1100 },
            { label: "1x", ms: 600 },
            { label: "2x", ms: 300 },
          ].map((opt) => (
            <button
              key={opt.label}
              onClick={() => onSpeedChange(opt.ms)}
              className={`rounded-md px-2.5 py-1 font-mono font-medium transition ${
                speedMs === opt.ms
                  ? "bg-white text-sky-700 shadow-sm ring-1 ring-slate-200"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
