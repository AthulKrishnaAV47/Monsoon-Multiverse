import React, { useRef, useState } from "react";
import {
  Server,
  Layers,
  Sliders,
  Wind,
  MapPin,
  Zap,
  Upload,
  Play,
  Database,
} from "lucide-react";
import {
  CHANNELS,
  SHOCK_PRESETS,
  BUNDLED_WINDOWS,
  QUICK_REGIONS,
  NLAT,
  NLON,
  LAT_MIN,
  LAT_MAX,
  LON_MIN,
  LON_MAX,
  boxToGridIndices,
  gridIndicesToBox,
} from "../data/presets";

export default function ControlSidebar({
  apiUrl,
  onApiUrlChange,
  bundledId,
  initMeta,
  onSelectBundled,
  onUploadInitJson,
  loadingInit,
  steps,
  onStepsChange,
  channelIdx,
  onChannelChange,
  presetId,
  onPresetChange,
  customShock,
  onCustomShockChange,
  onRunCustomNow,
  overlays,
  onOverlaysChange,
}) {
  const [boxMode, setBoxMode] = useState("grid"); // 'grid' (Row/Col) | 'latlon'
  const fileInputRef = useRef(null);

  const gridBox = boxToGridIndices(customShock.box);
  const boxRows = gridBox.rowMax - gridBox.rowMin + 1;
  const boxCols = gridBox.colMax - gridBox.colMin + 1;
  const affectedCells = boxRows * boxCols;

  const updateGridBound = (key, rawVal) => {
    const num = Number(rawVal);
    if (!Number.isFinite(num)) return;
    const next = { ...gridBox, [key]: num };
    onCustomShockChange({
      ...customShock,
      box: gridIndicesToBox(next),
    });
  };

  const updateLatLonBound = (key, rawVal) => {
    const num = Number(rawVal);
    if (!Number.isFinite(num)) return;
    const nextBox = { ...customShock.box, [key]: num };
    onCustomShockChange({
      ...customShock,
      box: gridIndicesToBox(boxToGridIndices(nextBox)),
    });
  };

  const toggleCustomChannel = (idx) => {
    const prev = customShock.channels[idx];
    onCustomShockChange({
      ...customShock,
      channels: {
        ...customShock.channels,
        [idx]: { ...prev, enabled: !prev.enabled },
      },
    });
  };

  const setCustomChannelDelta = (idx, val) => {
    const num = Number(val);
    if (!Number.isFinite(num)) return;
    const prev = customShock.channels[idx];
    onCustomShockChange({
      ...customShock,
      channels: {
        ...customShock.channels,
        [idx]: { ...prev, enabled: true, delta: num },
      },
    });
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      onUploadInitJson(parsed, file.name);
    } catch (err) {
      alert(`Invalid JSON file: ${err.message}`);
    } finally {
      e.target.value = "";
    }
  };

  return (
    <aside className="flex w-full flex-col gap-4 border-b border-slate-800/80 bg-slate-900/50 p-4 lg:w-96 lg:shrink-0 lg:overflow-y-auto lg:border-b-0 lg:border-r">
      {/* Inference Server Endpoint */}
      <section className="space-y-1.5">
        <h2 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400">
          <Server className="h-3.5 w-3.5 text-cyan-400" />
          Inference Endpoint
        </h2>
        <input
          type="text"
          value={apiUrl}
          onChange={(e) => onApiUrlChange(e.target.value)}
          placeholder="http://localhost:8000"
          className="w-full rounded-lg border border-slate-700/80 bg-slate-950 px-2.5 py-1.5 font-mono text-xs text-slate-200 outline-none focus:border-cyan-500"
        />
      </section>

      <hr className="border-slate-800/80" />

      {/* Bundled Initial 3-Day Windows */}
      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400">
            <Database className="h-3.5 w-3.5 text-cyan-400" />
            Initial 3-Day Window
          </h2>
          <span className="rounded bg-slate-800 px-1.5 py-0.5 font-mono text-[10px] text-slate-300">
            {initMeta.label}
          </span>
        </div>

        <div className="grid grid-cols-1 gap-1.5">
          {BUNDLED_WINDOWS.map((w) => {
            const active = bundledId === w.id;
            return (
              <button
                key={w.id}
                disabled={loadingInit}
                onClick={() => onSelectBundled(w)}
                className={`flex items-center justify-between rounded-md px-2.5 py-1.5 text-left text-xs transition ${
                  active
                    ? "bg-cyan-500/20 text-cyan-200 ring-1 ring-cyan-400/60"
                    : "bg-slate-800/70 text-slate-300 ring-1 ring-slate-700/70 hover:bg-slate-800"
                }`}
              >
                <span className="font-medium">{w.label}</span>
                <span className="text-[10px] text-slate-400">{w.file}</span>
              </button>
            );
          })}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".json,application/json"
          onChange={handleFileChange}
          className="hidden"
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex w-full items-center justify-center gap-1.5 rounded-md border border-dashed border-slate-700 bg-slate-950/60 py-1.5 text-[11px] text-slate-300 hover:border-cyan-500/60 hover:text-cyan-200"
        >
          <Upload className="h-3.5 w-3.5" />
          <span>Load Custom init_states JSON</span>
        </button>
      </section>

      <hr className="border-slate-800/80" />

      {/* Forecast & Variable Controls */}
      <section className="space-y-3">
        <h2 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400">
          <Sliders className="h-3.5 w-3.5 text-cyan-400" />
          Forecast & Variable
        </h2>

        <div>
          <div className="mb-1 flex items-center justify-between text-xs">
            <span className="text-slate-300">Forecast Horizon (steps)</span>
            <span className="font-mono font-medium text-cyan-300">{steps} days</span>
          </div>
          <input
            type="range"
            min={1}
            max={14}
            value={steps}
            onChange={(e) => onStepsChange(Number(e.target.value))}
            className="w-full accent-cyan-400"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs text-slate-300">Display Variable</label>
          <select
            value={channelIdx}
            onChange={(e) => onChannelChange(Number(e.target.value))}
            className="w-full rounded-lg border border-slate-700/80 bg-slate-950 px-2.5 py-1.5 text-xs text-slate-200 outline-none focus:border-cyan-500"
          >
            {CHANNELS.map((ch) => (
              <option key={ch.id} value={ch.index}>
                {ch.label} ({ch.unit})
              </option>
            ))}
          </select>
        </div>

        {/* Map Overlays */}
        <div className="space-y-1.5 pt-1">
          <span className="flex items-center gap-1.5 text-[11px] font-medium text-slate-400">
            <Layers className="h-3 w-3" /> Map Overlays
          </span>
          <div className="grid grid-cols-2 gap-1.5 text-xs">
            <label className="flex cursor-pointer items-center gap-1.5 rounded-md bg-slate-950/60 px-2 py-1.5 ring-1 ring-slate-800">
              <input
                type="checkbox"
                checked={overlays.borders}
                onChange={(e) => onOverlaysChange({ ...overlays, borders: e.target.checked })}
                className="accent-cyan-400"
              />
              <span className="text-slate-300">India Borders</span>
            </label>
            <label className="flex cursor-pointer items-center gap-1.5 rounded-md bg-slate-950/60 px-2 py-1.5 ring-1 ring-slate-800">
              <input
                type="checkbox"
                checked={overlays.wind}
                onChange={(e) => onOverlaysChange({ ...overlays, wind: e.target.checked })}
                className="accent-cyan-400"
              />
              <Wind className="h-3 w-3 text-cyan-400" />
              <span className="text-slate-300">Wind (u/v)</span>
            </label>
            <label className="flex cursor-pointer items-center gap-1.5 rounded-md bg-slate-950/60 px-2 py-1.5 ring-1 ring-slate-800">
              <input
                type="checkbox"
                checked={overlays.cities}
                onChange={(e) => onOverlaysChange({ ...overlays, cities: e.target.checked })}
                className="accent-cyan-400"
              />
              <MapPin className="h-3 w-3 text-amber-400" />
              <span className="text-slate-300">Cities</span>
            </label>
            <label className="flex cursor-pointer items-center gap-1.5 rounded-md bg-slate-950/60 px-2 py-1.5 ring-1 ring-slate-800">
              <input
                type="checkbox"
                checked={overlays.shockBox}
                onChange={(e) => onOverlaysChange({ ...overlays, shockBox: e.target.checked })}
                className="accent-cyan-400"
              />
              <span className="text-slate-300">Shock Box</span>
            </label>
          </div>
        </div>
      </section>

      <hr className="border-slate-800/80" />

      {/* Multiverse Shock Presets & Custom Builder */}
      <section className="space-y-2.5">
        <h2 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400">
          <Zap className="h-3.5 w-3.5 text-amber-400" />
          Multiverse Shock Scenario
        </h2>

        <div className="space-y-1.5">
          {SHOCK_PRESETS.map((preset) => {
            const active = preset.id === presetId;
            return (
              <button
                key={preset.id}
                onClick={() => onPresetChange(preset.id)}
                className={`w-full rounded-lg p-2.5 text-left transition ${
                  active
                    ? "bg-amber-500/15 ring-1 ring-amber-400/60"
                    : "bg-slate-950/50 ring-1 ring-slate-800 hover:bg-slate-800/60"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className={`text-xs font-medium ${active ? "text-amber-200" : "text-slate-200"}`}>
                    {preset.name}
                  </span>
                  <span className="shrink-0 rounded bg-slate-800 px-1.5 py-0.5 font-mono text-[10px] text-slate-300">
                    {preset.badge}
                  </span>
                </div>
                <p className="mt-1 text-[11px] leading-snug text-slate-400">
                  {preset.description}
                </p>
              </button>
            );
          })}
        </div>

        {/* Multi-channel Custom Shock Builder */}
        {presetId === "custom" && (
          <div className="space-y-3 rounded-lg bg-slate-950/90 p-3 ring-1 ring-amber-500/40">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-amber-200">
                Custom Shock Builder
              </span>
              <span className="font-mono text-[10px] text-slate-400">
                [6, 32, 36] float32
              </span>
            </div>

            {/* Channel Selection & Magnitude Sliders */}
            <div className="space-y-2">
              <div className="text-[11px] font-medium text-slate-400">
                Target Channels (Raw Physical Units on Day 0)
              </div>
              {CHANNELS.map((ch) => {
                const cfg = customShock.channels[ch.index];
                return (
                  <div
                    key={ch.id}
                    className={`rounded-md p-2 ring-1 transition ${
                      cfg.enabled
                        ? "bg-slate-900/90 ring-amber-500/40"
                        : "bg-slate-900/40 ring-slate-800/80 opacity-75"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <label className="flex cursor-pointer items-center gap-2 text-xs">
                        <input
                          type="checkbox"
                          checked={cfg.enabled}
                          onChange={() => toggleCustomChannel(ch.index)}
                          className="accent-amber-400"
                        />
                        <span className="font-mono font-semibold text-slate-200">
                          {ch.short}
                        </span>
                        <span className="text-[11px] text-slate-400">({ch.rawUnit})</span>
                      </label>
                      <input
                        type="number"
                        step={ch.step}
                        value={cfg.delta}
                        onChange={(e) => setCustomChannelDelta(ch.index, e.target.value)}
                        className="w-20 rounded border border-slate-700 bg-slate-950 px-1.5 py-0.5 text-right font-mono text-xs text-amber-300 outline-none focus:border-amber-400"
                      />
                    </div>
                    {cfg.enabled && (
                      <div className="mt-1.5 flex items-center gap-2">
                        <span className="w-8 font-mono text-[10px] text-slate-500">
                          {ch.sliderMin}
                        </span>
                        <input
                          type="range"
                          min={ch.sliderMin}
                          max={ch.sliderMax}
                          step={ch.step}
                          value={Math.max(ch.sliderMin, Math.min(ch.sliderMax, cfg.delta))}
                          onChange={(e) => setCustomChannelDelta(ch.index, e.target.value)}
                          className="w-full accent-amber-400"
                        />
                        <span className="w-8 text-right font-mono text-[10px] text-slate-500">
                          +{ch.sliderMax}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Bounding Box Controls (Synced with Map Drag) */}
            <div className="space-y-2 border-t border-slate-800 pt-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium text-slate-400">
                  Region Box ({boxRows}×{boxCols} = {affectedCells} cells)
                </span>
                <div className="flex rounded bg-slate-900 p-0.5 ring-1 ring-slate-800 text-[10px]">
                  <button
                    onClick={() => setBoxMode("grid")}
                    className={`rounded px-1.5 py-0.5 ${
                      boxMode === "grid" ? "bg-slate-800 text-amber-300" : "text-slate-400"
                    }`}
                  >
                    Row / Col
                  </button>
                  <button
                    onClick={() => setBoxMode("latlon")}
                    className={`rounded px-1.5 py-0.5 ${
                      boxMode === "latlon" ? "bg-slate-800 text-amber-300" : "text-slate-400"
                    }`}
                  >
                    Lat / Lon
                  </button>
                </div>
              </div>

              <p className="text-[10px] text-slate-500">
                Drag directly on Prime or Multiverse maps, or enter exact bounds:
              </p>

              {boxMode === "grid" ? (
                <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                  <label className="flex flex-col gap-0.5">
                    <span className="text-slate-400">Row Min (0–{NLAT - 1})</span>
                    <input
                      type="number"
                      min={0}
                      max={NLAT - 1}
                      value={gridBox.rowMin}
                      onChange={(e) => updateGridBound("rowMin", e.target.value)}
                      className="rounded border border-slate-700 bg-slate-900 px-2 py-1 font-mono text-xs text-slate-200"
                    />
                  </label>
                  <label className="flex flex-col gap-0.5">
                    <span className="text-slate-400">Row Max (0–{NLAT - 1})</span>
                    <input
                      type="number"
                      min={0}
                      max={NLAT - 1}
                      value={gridBox.rowMax}
                      onChange={(e) => updateGridBound("rowMax", e.target.value)}
                      className="rounded border border-slate-700 bg-slate-900 px-2 py-1 font-mono text-xs text-slate-200"
                    />
                  </label>
                  <label className="flex flex-col gap-0.5">
                    <span className="text-slate-400">Col Min (0–{NLON - 1})</span>
                    <input
                      type="number"
                      min={0}
                      max={NLON - 1}
                      value={gridBox.colMin}
                      onChange={(e) => updateGridBound("colMin", e.target.value)}
                      className="rounded border border-slate-700 bg-slate-900 px-2 py-1 font-mono text-xs text-slate-200"
                    />
                  </label>
                  <label className="flex flex-col gap-0.5">
                    <span className="text-slate-400">Col Max (0–{NLON - 1})</span>
                    <input
                      type="number"
                      min={0}
                      max={NLON - 1}
                      value={gridBox.colMax}
                      onChange={(e) => updateGridBound("colMax", e.target.value)}
                      className="rounded border border-slate-700 bg-slate-900 px-2 py-1 font-mono text-xs text-slate-200"
                    />
                  </label>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                  <label className="flex flex-col gap-0.5">
                    <span className="text-slate-400">Lat Min ({LAT_MIN}–{LAT_MAX}°N)</span>
                    <input
                      type="number"
                      step={1}
                      min={LAT_MIN}
                      max={LAT_MAX}
                      value={customShock.box.latMin}
                      onChange={(e) => updateLatLonBound("latMin", e.target.value)}
                      className="rounded border border-slate-700 bg-slate-900 px-2 py-1 font-mono text-xs text-slate-200"
                    />
                  </label>
                  <label className="flex flex-col gap-0.5">
                    <span className="text-slate-400">Lat Max ({LAT_MIN}–{LAT_MAX}°N)</span>
                    <input
                      type="number"
                      step={1}
                      min={LAT_MIN}
                      max={LAT_MAX}
                      value={customShock.box.latMax}
                      onChange={(e) => updateLatLonBound("latMax", e.target.value)}
                      className="rounded border border-slate-700 bg-slate-900 px-2 py-1 font-mono text-xs text-slate-200"
                    />
                  </label>
                  <label className="flex flex-col gap-0.5">
                    <span className="text-slate-400">Lon Min ({LON_MIN}–{LON_MAX}°E)</span>
                    <input
                      type="number"
                      step={1}
                      min={LON_MIN}
                      max={LON_MAX}
                      value={customShock.box.lonMin}
                      onChange={(e) => updateLatLonBound("lonMin", e.target.value)}
                      className="rounded border border-slate-700 bg-slate-900 px-2 py-1 font-mono text-xs text-slate-200"
                    />
                  </label>
                  <label className="flex flex-col gap-0.5">
                    <span className="text-slate-400">Lon Max ({LON_MIN}–{LON_MAX}°E)</span>
                    <input
                      type="number"
                      step={1}
                      min={LON_MIN}
                      max={LON_MAX}
                      value={customShock.box.lonMax}
                      onChange={(e) => updateLatLonBound("lonMax", e.target.value)}
                      className="rounded border border-slate-700 bg-slate-900 px-2 py-1 font-mono text-xs text-slate-200"
                    />
                  </label>
                </div>
              )}

              {/* Quick Region Shortcuts */}
              <div className="flex flex-wrap gap-1 pt-0.5">
                {QUICK_REGIONS.map((reg) => (
                  <button
                    key={reg.label}
                    onClick={() => onCustomShockChange({ ...customShock, box: reg.box })}
                    className="rounded bg-slate-800/90 px-2 py-0.5 text-[10px] text-slate-300 hover:bg-slate-700"
                  >
                    {reg.label}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={onRunCustomNow}
              className="flex w-full items-center justify-center gap-1.5 rounded-md bg-amber-500/20 py-1.5 text-xs font-semibold text-amber-200 ring-1 ring-amber-400/50 transition hover:bg-amber-500/30"
            >
              <Play className="h-3.5 w-3.5" />
              <span>Run Custom Shock Simulation</span>
            </button>
          </div>
        )}
      </section>
    </aside>
  );
}
