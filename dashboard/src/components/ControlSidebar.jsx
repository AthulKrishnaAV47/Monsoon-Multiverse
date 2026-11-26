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
  FileCode2,
  X,
  Droplets,
  GitBranch,
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
  onPasteInitJson,
  loadingInit,
  steps,
  onStepsChange,
  channelIdx,
  onChannelChange,
  presetId,
  onPresetChange,
  customShock,
  onCustomShockChange,
  onUploadPertJson,
  onPastePertJson,
  onClearRawPert,
  onRunCustomNow,
  onRunEnsemble,
  ensembleLoading,
  overlays,
  onOverlaysChange,
}) {
  const [boxMode, setBoxMode] = useState("grid");
  const [showInitPaste, setShowInitPaste] = useState(false);
  const [initPasteText, setInitPasteText] = useState("");
  const [showPertPaste, setShowPertPaste] = useState(false);
  const [pertPasteText, setPertPasteText] = useState("");

  const initFileRef = useRef(null);
  const pertFileRef = useRef(null);

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
      rawPerturbation: null,
      rawLabel: null,
      box: gridIndicesToBox(next),
    });
  };

  const updateLatLonBound = (key, rawVal) => {
    const num = Number(rawVal);
    if (!Number.isFinite(num)) return;
    const nextBox = { ...customShock.box, [key]: num };
    onCustomShockChange({
      ...customShock,
      rawPerturbation: null,
      rawLabel: null,
      box: gridIndicesToBox(boxToGridIndices(nextBox)),
    });
  };

  const toggleCustomChannel = (idx) => {
    const prev = customShock.channels[idx];
    onCustomShockChange({
      ...customShock,
      rawPerturbation: null,
      rawLabel: null,
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
      rawPerturbation: null,
      rawLabel: null,
      channels: {
        ...customShock.channels,
        [idx]: { ...prev, enabled: true, delta: num },
      },
    });
  };

  const handleInitFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text());
      onUploadInitJson(parsed, file.name);
    } catch (err) {
      alert(`Invalid init_states JSON: ${err.message}`);
    } finally {
      e.target.value = "";
    }
  };

  const handlePertFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text());
      onUploadPertJson(parsed, file.name);
    } catch (err) {
      alert(`Invalid perturbation JSON: ${err.message}`);
    } finally {
      e.target.value = "";
    }
  };

  return (
    <aside className="flex w-full flex-col gap-4 border-b border-slate-200 bg-white p-4 lg:w-96 lg:shrink-0 lg:overflow-y-auto lg:border-b-0 lg:border-r">
      {/* Inference Server Endpoint */}
      <section className="space-y-1.5">
        <h2 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
          <Server className="h-3.5 w-3.5 text-sky-600" />
          Inference Endpoint
        </h2>
        <input
          type="text"
          value={apiUrl}
          onChange={(e) => onApiUrlChange(e.target.value)}
          placeholder="http://localhost:8000"
          className="w-full rounded-lg border border-slate-300 bg-slate-50 px-2.5 py-1.5 font-mono text-xs text-slate-800 outline-none focus:border-sky-500 focus:bg-white"
        />
      </section>

      <hr className="border-slate-200" />

      {/* Initial 3-Day Window */}
      <section className="space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <h2 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
            <Database className="h-3.5 w-3.5 text-sky-600" />
            Initial 3-Day Window
          </h2>
          <span className="truncate rounded bg-slate-100 px-2 py-0.5 font-mono text-[10px] font-medium text-slate-600 ring-1 ring-slate-200">
            {initMeta.label}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-1.5">
          {BUNDLED_WINDOWS.map((w) => {
            const active = bundledId === w.id;
            return (
              <button
                key={w.id}
                disabled={loadingInit}
                onClick={() => onSelectBundled(w)}
                title={w.note}
                className={`rounded-lg px-2.5 py-2 text-left text-xs font-medium transition ${
                  active
                    ? "bg-sky-50 text-sky-800 ring-1 ring-sky-400"
                    : "bg-slate-50 text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100"
                }`}
              >
                {w.label}
              </button>
            );
          })}
        </div>

        <input
          ref={initFileRef}
          type="file"
          accept=".json,application/json"
          onChange={handleInitFile}
          className="hidden"
        />
        <div className="grid grid-cols-2 gap-1.5">
          <button
            onClick={() => initFileRef.current?.click()}
            className="flex items-center justify-center gap-1.5 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-2 py-1.5 text-[11px] font-medium text-slate-700 hover:border-sky-400 hover:bg-sky-50/50"
          >
            <Upload className="h-3.5 w-3.5 text-sky-600" />
            <span>Upload init JSON</span>
          </button>
          <button
            onClick={() => setShowInitPaste((s) => !s)}
            className="flex items-center justify-center gap-1.5 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-2 py-1.5 text-[11px] font-medium text-slate-700 hover:border-sky-400 hover:bg-sky-50/50"
          >
            <FileCode2 className="h-3.5 w-3.5 text-sky-600" />
            <span>Paste init JSON</span>
          </button>
        </div>

        {showInitPaste && (
          <div className="space-y-2 rounded-lg bg-slate-50 p-2.5 ring-1 ring-slate-200">
            <textarea
              rows={3}
              value={initPasteText}
              onChange={(e) => setInitPasteText(e.target.value)}
              placeholder='{"init_states": [[[...]]], "doy_sincos": [sin, cos]}'
              className="w-full rounded border border-slate-300 bg-white p-2 font-mono text-[11px] text-slate-800 outline-none focus:border-sky-500"
            />
            <div className="flex justify-end gap-1.5">
              <button
                onClick={() => setShowInitPaste(false)}
                className="rounded px-2 py-1 text-[11px] text-slate-500 hover:bg-slate-200/60"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  try {
                    const parsed = JSON.parse(initPasteText);
                    onPasteInitJson(parsed, "pasted_init.json");
                    setShowInitPaste(false);
                  } catch (err) {
                    alert(`Invalid JSON: ${err.message}`);
                  }
                }}
                className="rounded bg-sky-600 px-2.5 py-1 text-[11px] font-medium text-white hover:bg-sky-700"
              >
                Apply init_states
              </button>
            </div>
          </div>
        )}
      </section>

      <hr className="border-slate-200" />

      {/* Forecast & Variable Controls */}
      <section className="space-y-3">
        <h2 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
          <Sliders className="h-3.5 w-3.5 text-sky-600" />
          Forecast & Variable
        </h2>

        <div>
          <div className="mb-1 flex items-center justify-between text-xs">
            <span className="font-medium text-slate-700">Forecast Horizon</span>
            <span className="font-mono font-semibold text-sky-700">{steps} days</span>
          </div>
          <input
            type="range"
            min={1}
            max={14}
            value={steps}
            onChange={(e) => onStepsChange(Number(e.target.value))}
            className="w-full accent-sky-600"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-slate-700">
            Display Variable
          </label>
          <select
            value={channelIdx}
            onChange={(e) => onChannelChange(Number(e.target.value))}
            className="w-full rounded-lg border border-slate-300 bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-slate-800 outline-none focus:border-sky-500 focus:bg-white"
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
          <span className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500">
            <Layers className="h-3 w-3" /> Map Overlays
          </span>
          <div className="grid grid-cols-2 gap-1.5 text-xs">
            <label className="flex cursor-pointer items-center gap-1.5 rounded-md bg-slate-50 px-2.5 py-1.5 ring-1 ring-slate-200">
              <input
                type="checkbox"
                checked={overlays.borders}
                onChange={(e) => onOverlaysChange({ ...overlays, borders: e.target.checked })}
                className="accent-sky-600"
              />
              <span className="text-slate-700">India Borders</span>
            </label>
            <label className="flex cursor-pointer items-center gap-1.5 rounded-md bg-slate-50 px-2.5 py-1.5 ring-1 ring-slate-200">
              <input
                type="checkbox"
                checked={overlays.wind}
                onChange={(e) => onOverlaysChange({ ...overlays, wind: e.target.checked })}
                className="accent-sky-600"
              />
              <Wind className="h-3 w-3 text-sky-600" />
              <span className="text-slate-700">Wind (u/v)</span>
            </label>
            <label className="col-span-2 flex cursor-pointer items-center gap-1.5 rounded-md bg-teal-50/60 px-2.5 py-1.5 ring-1 ring-teal-200">
              <input
                type="checkbox"
                checked={overlays.moistureFlux}
                onChange={(e) =>
                  onOverlaysChange({ ...overlays, moistureFlux: e.target.checked })
                }
                className="accent-teal-600"
              />
              <Droplets className="h-3.5 w-3.5 text-teal-600" />
              <span className="font-medium text-teal-900">Moisture Flux (tcwv × V)</span>
            </label>
            <label className="flex cursor-pointer items-center gap-1.5 rounded-md bg-slate-50 px-2.5 py-1.5 ring-1 ring-slate-200">
              <input
                type="checkbox"
                checked={overlays.cities}
                onChange={(e) => onOverlaysChange({ ...overlays, cities: e.target.checked })}
                className="accent-sky-600"
              />
              <MapPin className="h-3 w-3 text-orange-600" />
              <span className="text-slate-700">Cities</span>
            </label>
            <label className="flex cursor-pointer items-center gap-1.5 rounded-md bg-slate-50 px-2.5 py-1.5 ring-1 ring-slate-200">
              <input
                type="checkbox"
                checked={overlays.shockBox}
                onChange={(e) => onOverlaysChange({ ...overlays, shockBox: e.target.checked })}
                className="accent-orange-600"
              />
              <span className="text-slate-700">Shock Box</span>
            </label>
          </div>
        </div>
      </section>

      <hr className="border-slate-200" />

      {/* Multiverse Shock Scenarios */}
      <section className="space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <h2 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
            <Zap className="h-3.5 w-3.5 text-orange-500" />
            Multiverse Shock Scenarios
          </h2>
          <button
            onClick={onRunEnsemble}
            disabled={ensembleLoading}
            className="flex items-center gap-1 rounded-md bg-sky-600 px-2.5 py-1 text-[11px] font-semibold text-white shadow-sm transition hover:bg-sky-700 disabled:opacity-50"
            title="Run 5 jittered perturbation members (0.85x–1.15x) to visualize forecast spread"
          >
            <GitBranch className="h-3 w-3" />
            <span>{ensembleLoading ? "Running..." : "5-Member Ensemble"}</span>
          </button>
        </div>

        <div className="space-y-1.5">
          {SHOCK_PRESETS.map((preset) => {
            const active = preset.id === presetId;
            return (
              <button
                key={preset.id}
                onClick={() => onPresetChange(preset.id)}
                className={`w-full rounded-lg p-2.5 text-left transition ${
                  active
                    ? "bg-orange-50 ring-1 ring-orange-400"
                    : "bg-slate-50 ring-1 ring-slate-200 hover:bg-slate-100"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className={`text-xs font-semibold ${active ? "text-orange-900" : "text-slate-800"}`}>
                    {preset.name}
                  </span>
                  <span className="shrink-0 rounded bg-white px-2 py-0.5 font-mono text-[10px] font-medium text-slate-600 ring-1 ring-slate-200">
                    {preset.badge}
                  </span>
                </div>
                <p className="mt-1 text-[11px] leading-snug text-slate-500">
                  {preset.description}
                </p>
              </button>
            );
          })}
        </div>

        {/* Custom Shock Builder */}
        {presetId === "custom" && (
          <div className="space-y-3 rounded-xl bg-slate-50 p-3 ring-1 ring-orange-300">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-orange-900">
                Custom Shock Builder
              </span>
              <span className="font-mono text-[10px] text-slate-500">
                [6, 32, 36] float32
              </span>
            </div>

            {customShock.rawPerturbation && (
              <div className="flex items-center justify-between rounded-md bg-orange-100 px-2.5 py-1.5 text-[11px] text-orange-900 ring-1 ring-orange-300">
                <span className="truncate font-medium">
                  Active JSON: {customShock.rawLabel || "custom_perturbation.json"}
                </span>
                <button
                  onClick={onClearRawPert}
                  className="ml-2 rounded p-0.5 hover:bg-orange-200"
                  title="Return to slider/box builder"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )}

            <div className="space-y-2">
              <div className="text-[11px] font-medium text-slate-600">
                Target Channels (Raw Physical Units on Day 0)
              </div>
              {CHANNELS.map((ch) => {
                const cfg = customShock.channels[ch.index];
                return (
                  <div
                    key={ch.id}
                    className={`rounded-lg p-2 ring-1 transition ${
                      cfg.enabled && !customShock.rawPerturbation
                        ? "bg-white ring-orange-300"
                        : "bg-white/60 ring-slate-200 opacity-80"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <label className="flex cursor-pointer items-center gap-2 text-xs">
                        <input
                          type="checkbox"
                          checked={cfg.enabled}
                          onChange={() => toggleCustomChannel(ch.index)}
                          className="accent-orange-600"
                        />
                        <span className="font-mono font-semibold text-slate-800">
                          {ch.short}
                        </span>
                        <span className="text-[11px] text-slate-500">({ch.rawUnit})</span>
                      </label>
                      <input
                        type="number"
                        step={ch.step}
                        value={cfg.delta}
                        onChange={(e) => setCustomChannelDelta(ch.index, e.target.value)}
                        className="w-20 rounded border border-slate-300 bg-slate-50 px-2 py-0.5 text-right font-mono text-xs font-semibold text-orange-700 outline-none focus:border-orange-500 focus:bg-white"
                      />
                    </div>
                    {cfg.enabled && (
                      <div className="mt-1.5 flex items-center gap-2">
                        <span className="w-8 font-mono text-[10px] text-slate-400">
                          {ch.sliderMin}
                        </span>
                        <input
                          type="range"
                          min={ch.sliderMin}
                          max={ch.sliderMax}
                          step={ch.step}
                          value={Math.max(ch.sliderMin, Math.min(ch.sliderMax, cfg.delta))}
                          onChange={(e) => setCustomChannelDelta(ch.index, e.target.value)}
                          className="w-full accent-orange-500"
                        />
                        <span className="w-8 text-right font-mono text-[10px] text-slate-400">
                          +{ch.sliderMax}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="space-y-2 border-t border-slate-200 pt-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium text-slate-600">
                  Region Box ({boxRows} × {boxCols} = {affectedCells} cells)
                </span>
                <div className="flex rounded-md bg-white p-0.5 ring-1 ring-slate-200 text-[10px]">
                  <button
                    onClick={() => setBoxMode("grid")}
                    className={`rounded px-2 py-0.5 font-medium ${
                      boxMode === "grid" ? "bg-orange-50 text-orange-700" : "text-slate-500"
                    }`}
                  >
                    Row / Col
                  </button>
                  <button
                    onClick={() => setBoxMode("latlon")}
                    className={`rounded px-2 py-0.5 font-medium ${
                      boxMode === "latlon" ? "bg-orange-50 text-orange-700" : "text-slate-500"
                    }`}
                  >
                    Lat / Lon
                  </button>
                </div>
              </div>

              <p className="text-[10px] text-slate-500">
                Drag on Prime/Multiverse maps for a box (or click a cell to inspect time-series):
              </p>

              {boxMode === "grid" ? (
                <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                  <label className="flex flex-col gap-0.5">
                    <span className="text-slate-500">Row Min (0–{NLAT - 1})</span>
                    <input
                      type="number"
                      min={0}
                      max={NLAT - 1}
                      value={gridBox.rowMin}
                      onChange={(e) => updateGridBound("rowMin", e.target.value)}
                      className="rounded border border-slate-300 bg-white px-2 py-1 font-mono text-xs text-slate-800"
                    />
                  </label>
                  <label className="flex flex-col gap-0.5">
                    <span className="text-slate-500">Row Max (0–{NLAT - 1})</span>
                    <input
                      type="number"
                      min={0}
                      max={NLAT - 1}
                      value={gridBox.rowMax}
                      onChange={(e) => updateGridBound("rowMax", e.target.value)}
                      className="rounded border border-slate-300 bg-white px-2 py-1 font-mono text-xs text-slate-800"
                    />
                  </label>
                  <label className="flex flex-col gap-0.5">
                    <span className="text-slate-500">Col Min (0–{NLON - 1})</span>
                    <input
                      type="number"
                      min={0}
                      max={NLON - 1}
                      value={gridBox.colMin}
                      onChange={(e) => updateGridBound("colMin", e.target.value)}
                      className="rounded border border-slate-300 bg-white px-2 py-1 font-mono text-xs text-slate-800"
                    />
                  </label>
                  <label className="flex flex-col gap-0.5">
                    <span className="text-slate-500">Col Max (0–{NLON - 1})</span>
                    <input
                      type="number"
                      min={0}
                      max={NLON - 1}
                      value={gridBox.colMax}
                      onChange={(e) => updateGridBound("colMax", e.target.value)}
                      className="rounded border border-slate-300 bg-white px-2 py-1 font-mono text-xs text-slate-800"
                    />
                  </label>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                  <label className="flex flex-col gap-0.5">
                    <span className="text-slate-500">Lat Min ({LAT_MIN}–{LAT_MAX}°N)</span>
                    <input
                      type="number"
                      step={1}
                      min={LAT_MIN}
                      max={LAT_MAX}
                      value={customShock.box.latMin}
                      onChange={(e) => updateLatLonBound("latMin", e.target.value)}
                      className="rounded border border-slate-300 bg-white px-2 py-1 font-mono text-xs text-slate-800"
                    />
                  </label>
                  <label className="flex flex-col gap-0.5">
                    <span className="text-slate-500">Lat Max ({LAT_MIN}–{LAT_MAX}°N)</span>
                    <input
                      type="number"
                      step={1}
                      min={LAT_MIN}
                      max={LAT_MAX}
                      value={customShock.box.latMax}
                      onChange={(e) => updateLatLonBound("latMax", e.target.value)}
                      className="rounded border border-slate-300 bg-white px-2 py-1 font-mono text-xs text-slate-800"
                    />
                  </label>
                  <label className="flex flex-col gap-0.5">
                    <span className="text-slate-500">Lon Min ({LON_MIN}–{LON_MAX}°E)</span>
                    <input
                      type="number"
                      step={1}
                      min={LON_MIN}
                      max={LON_MAX}
                      value={customShock.box.lonMin}
                      onChange={(e) => updateLatLonBound("lonMin", e.target.value)}
                      className="rounded border border-slate-300 bg-white px-2 py-1 font-mono text-xs text-slate-800"
                    />
                  </label>
                  <label className="flex flex-col gap-0.5">
                    <span className="text-slate-500">Lon Max ({LON_MIN}–{LON_MAX}°E)</span>
                    <input
                      type="number"
                      step={1}
                      min={LON_MIN}
                      max={LON_MAX}
                      value={customShock.box.lonMax}
                      onChange={(e) => updateLatLonBound("lonMax", e.target.value)}
                      className="rounded border border-slate-300 bg-white px-2 py-1 font-mono text-xs text-slate-800"
                    />
                  </label>
                </div>
              )}

              <div className="flex flex-wrap gap-1 pt-0.5">
                {QUICK_REGIONS.map((reg) => (
                  <button
                    key={reg.label}
                    onClick={() =>
                      onCustomShockChange({
                        ...customShock,
                        rawPerturbation: null,
                        rawLabel: null,
                        box: reg.box,
                      })
                    }
                    className="rounded bg-white px-2 py-0.5 text-[10px] font-medium text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100"
                  >
                    {reg.label}
                  </button>
                ))}
              </div>
            </div>

            <input
              ref={pertFileRef}
              type="file"
              accept=".json,application/json"
              onChange={handlePertFile}
              className="hidden"
            />
            <div className="grid grid-cols-2 gap-1.5 border-t border-slate-200 pt-2.5">
              <button
                onClick={() => pertFileRef.current?.click()}
                className="flex items-center justify-center gap-1 rounded-md border border-dashed border-slate-300 bg-white px-2 py-1.5 text-[11px] font-medium text-slate-700 hover:border-orange-400"
              >
                <Upload className="h-3 w-3 text-orange-600" />
                <span>Upload shock JSON</span>
              </button>
              <button
                onClick={() => setShowPertPaste((s) => !s)}
                className="flex items-center justify-center gap-1 rounded-md border border-dashed border-slate-300 bg-white px-2 py-1.5 text-[11px] font-medium text-slate-700 hover:border-orange-400"
              >
                <FileCode2 className="h-3 w-3 text-orange-600" />
                <span>Paste shock JSON</span>
              </button>
            </div>

            {showPertPaste && (
              <div className="space-y-2 rounded-lg bg-white p-2 ring-1 ring-slate-200">
                <textarea
                  rows={3}
                  value={pertPasteText}
                  onChange={(e) => setPertPasteText(e.target.value)}
                  placeholder='Paste [6, 32, 36] array or {"perturbation": [...]}'
                  className="w-full rounded border border-slate-300 bg-slate-50 p-1.5 font-mono text-[11px] text-slate-800 outline-none focus:border-orange-500"
                />
                <div className="flex justify-end gap-1.5">
                  <button
                    onClick={() => setShowPertPaste(false)}
                    className="rounded px-2 py-1 text-[11px] text-slate-500 hover:bg-slate-100"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      try {
                        const parsed = JSON.parse(pertPasteText);
                        onPastePertJson(parsed, "pasted_shock.json");
                        setShowPertPaste(false);
                      } catch (err) {
                        alert(`Invalid perturbation JSON: ${err.message}`);
                      }
                    }}
                    className="rounded bg-orange-600 px-2.5 py-1 text-[11px] font-medium text-white hover:bg-orange-700"
                  >
                    Apply Shock Tensor
                  </button>
                </div>
              </div>
            )}

            <button
              onClick={onRunCustomNow}
              className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-orange-600 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-orange-700"
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
