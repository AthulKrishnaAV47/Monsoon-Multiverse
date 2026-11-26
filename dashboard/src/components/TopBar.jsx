import React from "react";
import {
  Activity,
  CheckCircle2,
  Cpu,
  ShieldCheck,
  AlertTriangle,
  RefreshCw,
  Atom,
} from "lucide-react";

export default function TopBar({
  health,
  healthError,
  onRetryHealth,
  primeMs,
  multiMs,
  maxRipple,
  physicsTelemetry,
  detResult,
  detLoading,
  onVerifyDeterminism,
}) {
  const isOnline = health?.status === "ready";
  const physOk =
    physicsTelemetry &&
    physicsTelemetry.finitePass &&
    physicsTelemetry.nonNegativeRainPass;

  return (
    <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-5 py-3 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 text-white shadow-sm">
          <Activity className="h-5 w-5" />
        </div>
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-base font-bold tracking-tight text-slate-900">
              Monsoon-Multiverse
            </h1>
            <span className="rounded-md bg-sky-50 px-2 py-0.5 font-mono text-[11px] font-semibold text-sky-700 ring-1 ring-sky-200">
              {health?.model_name || "monsoon-resunet-v1"}
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Climate Digital Twin of India • Autoregressive Causal Shock Explorer
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2.5 text-xs">
        {isOnline ? (
          <div className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 font-medium text-emerald-700 ring-1 ring-emerald-200">
            <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
            <span>API Ready</span>
          </div>
        ) : (
          <button
            onClick={onRetryHealth}
            title={healthError || "Click to reconnect to serve.py"}
            className="flex items-center gap-1.5 rounded-full bg-rose-50 px-3 py-1.5 font-medium text-rose-700 ring-1 ring-rose-200 hover:bg-rose-100"
          >
            <AlertTriangle className="h-3.5 w-3.5" />
            <span>API Offline (Retry)</span>
            <RefreshCw className="h-3 w-3" />
          </button>
        )}

        {/* Latency & Causal Ripple */}
        <div className="flex flex-wrap items-center gap-2.5 rounded-lg bg-slate-50 px-3 py-1.5 font-mono text-slate-700 ring-1 ring-slate-200">
          <div className="flex items-center gap-1.5">
            <Cpu className="h-3.5 w-3.5 text-sky-600" />
            <span className="text-slate-500">Prime:</span>
            <span className="font-semibold text-sky-700">
              {primeMs != null ? `${primeMs.toFixed(1)} ms` : "—"}
            </span>
          </div>
          <span className="text-slate-300">|</span>
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500">Multi:</span>
            <span className="font-semibold text-orange-600">
              {multiMs != null ? `${multiMs.toFixed(1)} ms` : "—"}
            </span>
          </div>
          <span className="text-slate-300">|</span>
          <div
            className="flex items-center gap-1.5"
            title="Max absolute difference across all 6 channels and forecast days"
          >
            <span className="text-slate-500">Max Ripple:</span>
            <span className="font-semibold text-violet-700">
              {maxRipple != null ? maxRipple.toFixed(3) : "—"}
            </span>
          </div>
        </div>

        {/* Live Physics & Stability Telemetry Badge */}
        {physicsTelemetry && (
          <div
            className={`flex flex-wrap items-center gap-2 rounded-lg px-3 py-1.5 font-mono text-[11px] ring-1 ${
              physOk
                ? "bg-teal-50/80 text-teal-900 ring-teal-200"
                : "bg-rose-50 text-rose-900 ring-rose-200"
            }`}
            aria-label="Physics Stability Telemetry"
          >
            <Atom className={`h-3.5 w-3.5 ${physOk ? "text-teal-700" : "text-rose-600"}`} />
            <span className="font-semibold">
              Physics: {physOk ? "PASS" : "WARN"}
            </span>
            <span className="text-slate-400">•</span>
            <span>{physicsTelemetry.nonFiniteCount} NaN/Inf</span>
            <span className="text-slate-400">•</span>
            <span>min(tp)={physicsTelemetry.minRain.toFixed(2)} mm/d</span>
            <span className="text-slate-400">•</span>
            <span title={`Domain mean shift Day 1 to Day ${physicsTelemetry.stepsChecked}`}>
              Δmsl {physicsTelemetry.mslDriftHpa >= 0 ? "+" : ""}
              {physicsTelemetry.mslDriftHpa.toFixed(2)} hPa
            </span>
            <span className="text-slate-400">|</span>
            <span title={`Domain mean shift Day 1 to Day ${physicsTelemetry.stepsChecked}`}>
              Δtcwv {physicsTelemetry.tcwvDrift >= 0 ? "+" : ""}
              {physicsTelemetry.tcwvDrift.toFixed(2)} kg/m²
            </span>
          </div>
        )}

        <button
          onClick={onVerifyDeterminism}
          disabled={!isOnline || detLoading}
          className="flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 font-medium text-slate-700 ring-1 ring-slate-300 transition hover:bg-slate-50 disabled:opacity-50"
          title="Run an explicit zero-shock request and verify exact determinism against Prime"
        >
          {detResult ? (
            <CheckCircle2
              className={`h-3.5 w-3.5 ${detResult.passed ? "text-emerald-600" : "text-rose-600"}`}
            />
          ) : (
            <ShieldCheck className="h-3.5 w-3.5 text-sky-600" />
          )}
          <span>
            {detLoading
              ? "Checking..."
              : detResult
              ? `Det: ${detResult.maxDiff.toExponential(1)} (${detResult.passed ? "PASS" : "FAIL"})`
              : "Verify Determinism"}
          </span>
        </button>
      </div>
    </header>
  );
}
