import React from "react";
import { Activity, CheckCircle2, Cpu, ShieldCheck, AlertTriangle, RefreshCw } from "lucide-react";

export default function TopBar({
  health,
  healthError,
  onRetryHealth,
  primeMs,
  multiMs,
  maxRipple,
  activeChannel,
  detResult,
  detLoading,
  onVerifyDeterminism,
}) {
  const isOnline = health?.status === "ready";

  return (
    <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 bg-slate-900/80 px-5 py-3 backdrop-blur">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-500/20 to-blue-600/20 ring-1 ring-cyan-400/30">
          <Activity className="h-5 w-5 text-cyan-400" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base font-semibold tracking-tight text-slate-100">
              Monsoon-Multiverse
            </h1>
            <span className="rounded bg-slate-800 px-1.5 py-0.5 font-mono text-[11px] text-cyan-300 ring-1 ring-slate-700">
              {health?.model_name || "monsoon-resunet-v1"}
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Climate Digital Twin of India • Autoregressive Causal Shock Explorer
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2.5 text-xs">
        {/* Server Health Pill */}
        {isOnline ? (
          <div className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-emerald-300 ring-1 ring-emerald-500/30">
            <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
            <span>API Ready</span>
          </div>
        ) : (
          <button
            onClick={onRetryHealth}
            title={healthError || "Click to reconnect to serve.py"}
            className="flex items-center gap-1.5 rounded-full bg-rose-500/10 px-2.5 py-1 text-rose-300 ring-1 ring-rose-500/30 hover:bg-rose-500/20"
          >
            <AlertTriangle className="h-3.5 w-3.5" />
            <span>API Offline (Retry)</span>
            <RefreshCw className="h-3 w-3" />
          </button>
        )}

        {/* Latency Telemetry */}
        <div className="flex items-center gap-3 rounded-lg bg-slate-950/70 px-3 py-1.5 font-mono ring-1 ring-slate-800">
          <div className="flex items-center gap-1.5 text-slate-300">
            <Cpu className="h-3.5 w-3.5 text-cyan-400" />
            <span className="text-slate-500">Prime:</span>
            <span className="text-cyan-300">{primeMs != null ? `${primeMs.toFixed(1)} ms` : "—"}</span>
          </div>
          <span className="text-slate-700">|</span>
          <div className="flex items-center gap-1.5 text-slate-300">
            <span className="text-slate-500">Multi:</span>
            <span className="text-amber-300">{multiMs != null ? `${multiMs.toFixed(1)} ms` : "—"}</span>
          </div>
          <span className="text-slate-700">|</span>
          <div className="flex items-center gap-1.5 text-slate-300" title="Max absolute difference across all 6 channels & forecast days">
            <span className="text-slate-500">Max Ripple:</span>
            <span className="text-fuchsia-300">
              {maxRipple != null ? maxRipple.toFixed(3) : "—"}
            </span>
          </div>
        </div>

        {/* Determinism Proof Button */}
        <button
          onClick={onVerifyDeterminism}
          disabled={!isOnline || detLoading}
          className="flex items-center gap-1.5 rounded-lg bg-slate-800 px-3 py-1.5 font-medium text-slate-200 ring-1 ring-slate-700 transition hover:bg-slate-700/80 disabled:opacity-50"
          title="Run an explicit zero-shock request and verify exact bitwise determinism against Prime"
        >
          {detResult ? (
            <CheckCircle2
              className={`h-3.5 w-3.5 ${detResult.passed ? "text-emerald-400" : "text-rose-400"}`}
            />
          ) : (
            <ShieldCheck className="h-3.5 w-3.5 text-cyan-400" />
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
