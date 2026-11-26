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
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-800/80 bg-slate-900/70 px-4 py-2.5">
      <div className="flex items-center gap-1.5">
        <button
          onClick={() => onDayChange((safeDay - 1 + steps) % steps)}
          className="rounded-lg bg-slate-800 p-1.5 text-slate-300 hover:bg-slate-700"
          title="Previous Day"
        >
          <SkipBack className="h-4 w-4" />
        </button>

        <button
          onClick={onTogglePlay}
          className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
            playing
              ? "bg-amber-500/20 text-amber-200 ring-1 ring-amber-400/50"
              : "bg-cyan-500/20 text-cyan-200 ring-1 ring-cyan-400/50 hover:bg-cyan-500/30"
          }`}
        >
          {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
          <span>{playing ? "Pause" : "Animate"}</span>
        </button>

        <button
          onClick={() => onDayChange((safeDay + 1) % steps)}
          className="rounded-lg bg-slate-800 p-1.5 text-slate-300 hover:bg-slate-700"
          title="Next Day"
        >
          <SkipForward className="h-4 w-4" />
        </button>
      </div>

      <div className="flex min-w-[200px] flex-1 items-center gap-3">
        <span className="shrink-0 font-mono text-xs font-semibold text-cyan-300">
          Day {safeDay + 1} <span className="text-slate-500">/ {steps}</span>
        </span>
        <input
          type="range"
          min={0}
          max={Math.max(0, steps - 1)}
          value={safeDay}
          onChange={(e) => onDayChange(Number(e.target.value))}
          className="w-full accent-cyan-400"
        />
      </div>

      <div className="flex items-center gap-2">
        {(simLoading || syncingHorizon) && (
          <span className="animate-pulse font-mono text-[11px] text-cyan-400">
            {syncingHorizon ? `Syncing ${requestedSteps}d...` : "Running ONNX..."}
          </span>
        )}
        <div className="flex items-center rounded-lg bg-slate-950 p-0.5 ring-1 ring-slate-800 text-[11px]">
          {[
            { label: "0.5x", ms: 1100 },
            { label: "1x", ms: 600 },
            { label: "2x", ms: 300 },
          ].map((opt) => (
            <button
              key={opt.label}
              onClick={() => onSpeedChange(opt.ms)}
              className={`rounded-md px-2 py-0.5 font-mono transition ${
                speedMs === opt.ms
                  ? "bg-slate-800 text-cyan-300"
                  : "text-slate-400 hover:text-slate-200"
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
