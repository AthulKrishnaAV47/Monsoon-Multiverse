import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  DEFAULT_API_URL,
  fetchBundledWindow,
  fetchHealth,
  runSimulate,
} from "./api/client";
import {
  BUNDLED_WINDOWS,
  CHANNELS,
  SHOCK_PRESETS,
  createInitialCustomShock,
} from "./data/presets";
import { computeImpactMetrics, computeMaxCausalRipple } from "./utils/metrics";
import TopBar from "./components/TopBar";
import ControlSidebar from "./components/ControlSidebar";
import TimelineBar from "./components/TimelineBar";
import MapPanel from "./components/MapPanel";
import ImpactStrip from "./components/ImpactStrip";

export default function App() {
  const [apiUrl, setApiUrl] = useState(DEFAULT_API_URL);
  const [health, setHealth] = useState(null);
  const [healthError, setHealthError] = useState(null);

  const [bundledId, setBundledId] = useState(BUNDLED_WINDOWS[0].id);
  const [loadingInit, setLoadingInit] = useState(false);

  const [initStates, setInitStates] = useState(null);
  const [doySincos, setDoySincos] = useState(null);
  const [initMeta, setInitMeta] = useState({ label: BUNDLED_WINDOWS[0].label });

  const [steps, setSteps] = useState(10);
  const [dayIdx, setDayIdx] = useState(3);
  const [channelIdx, setChannelIdx] = useState(1); // Default: tp (Daily Precipitation)

  const [presetId, setPresetId] = useState("warm_bob");
  const [customShock, setCustomShock] = useState(createInitialCustomShock);
  const [debouncedCustomShock, setDebouncedCustomShock] = useState(customShock);
  const [customRunNonce, setCustomRunNonce] = useState(0);

  const [overlays, setOverlays] = useState({
    borders: true,
    wind: true,
    cities: true,
    shockBox: true,
  });

  const [primeRollout, setPrimeRollout] = useState(null);
  const [multiRollout, setMultiRollout] = useState(null);
  const [primeMs, setPrimeMs] = useState(null);
  const [multiMs, setMultiMs] = useState(null);
  const [simLoading, setSimLoading] = useState(false);
  const [simError, setSimError] = useState(null);

  const [playing, setPlaying] = useState(false);
  const [speedMs, setSpeedMs] = useState(600);

  const [detResult, setDetResult] = useState(null);
  const [detLoading, setDetLoading] = useState(false);

  const checkHealth = useCallback(async () => {
    try {
      const h = await fetchHealth(apiUrl);
      setHealth(h);
      setHealthError(null);
    } catch (err) {
      setHealth(null);
      setHealthError(err.message);
    }
  }, [apiUrl]);

  const loadBundled = useCallback(async (win) => {
    setLoadingInit(true);
    setSimError(null);
    try {
      const data = await fetchBundledWindow(win.file);
      setBundledId(win.id);
      setInitStates(data.init_states);
      setDoySincos(data.doy_sincos);
      setInitMeta({ label: win.label });
    } catch (err) {
      setSimError(err.message);
    } finally {
      setLoadingInit(false);
    }
  }, []);

  const handleUploadInitJson = useCallback((parsed, filename) => {
    if (!Array.isArray(parsed?.init_states) || !Array.isArray(parsed?.doy_sincos)) {
      setSimError("Uploaded JSON must contain 'init_states' [3,6,32,36] and 'doy_sincos' [sin,cos].");
      return;
    }
    setSimError(null);
    setBundledId("uploaded");
    setInitStates(parsed.init_states);
    setDoySincos(parsed.doy_sincos);
    setInitMeta({ label: filename });
  }, []);

  // Load default bundled window on mount
  useEffect(() => {
    loadBundled(BUNDLED_WINDOWS[0]);
  }, [loadBundled]);

  // Check health whenever API URL changes
  useEffect(() => {
    checkHealth();
  }, [checkHealth]);

  // Debounce custom shock edits slightly so slider drags don't flood /simulate
  useEffect(() => {
    const id = setTimeout(() => {
      setDebouncedCustomShock(customShock);
    }, 150);
    return () => clearTimeout(id);
  }, [customShock]);

  const handleStepsChange = useCallback((newSteps) => {
    setSteps(newSteps);
    setDayIdx((prev) => Math.min(prev, Math.max(0, newSteps - 1)));
  }, []);

  // Keep effectiveSteps strictly tied to the rendered rollout length so Day X / N always matches
  const effectiveSteps = primeRollout?.length ?? steps;
  const safeDayIdx = Math.min(dayIdx, Math.max(0, effectiveSteps - 1));

  // Animation loop synced to effectiveSteps
  useEffect(() => {
    if (!playing || effectiveSteps <= 1) return;
    const id = setInterval(() => {
      setDayIdx((prev) => (prev + 1) % effectiveSteps);
    }, speedMs);
    return () => clearInterval(id);
  }, [playing, speedMs, effectiveSteps]);

  const activePreset = useMemo(
    () => SHOCK_PRESETS.find((p) => p.id === presetId) || SHOCK_PRESETS[0],
    [presetId]
  );

  // Active box displayed on map updates immediately while dragging/typing
  const activeShockBox = useMemo(() => {
    if (presetId === "custom") return customShock.box;
    return activePreset.box;
  }, [presetId, activePreset, customShock.box]);

  // Perturbation sent to /simulate uses debounced customShock (or immediate on Run Now)
  const perturbation = useMemo(() => {
    if (!initStates) return null;
    const lastState = initStates[initStates.length - 1];
    return activePreset.build(lastState, debouncedCustomShock);
  }, [initStates, activePreset, debouncedCustomShock]);

  // Run Timeline Prime (perturbation: null)
  useEffect(() => {
    if (!initStates || !doySincos) return;
    let cancelled = false;
    setSimLoading(true);
    setSimError(null);
    setDetResult(null);

    runSimulate(apiUrl, { initStates, doySincos, steps, perturbation: null })
      .then((res) => {
        if (cancelled) return;
        setPrimeRollout(res.rollout);
        setPrimeMs(res.inference_ms);
        setHealth((prev) => prev || { status: "ready", model_name: "monsoon-resunet-v1" });
      })
      .catch((err) => {
        if (!cancelled) setSimError(err.message);
      })
      .finally(() => {
        if (!cancelled) setSimLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [apiUrl, initStates, doySincos, steps]);

  // Run Multiverse Shocked (perturbation: [6, 32, 36] float32)
  useEffect(() => {
    if (!initStates || !doySincos || !perturbation) return;
    let cancelled = false;
    setSimLoading(true);

    runSimulate(apiUrl, { initStates, doySincos, steps, perturbation })
      .then((res) => {
        if (cancelled) return;
        setMultiRollout(res.rollout);
        setMultiMs(res.inference_ms);
      })
      .catch((err) => {
        if (!cancelled) setSimError(err.message);
      })
      .finally(() => {
        if (!cancelled) setSimLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [apiUrl, initStates, doySincos, steps, perturbation, customRunNonce]);

  const handleDrawBoxCommit = useCallback((box) => {
    setPresetId("custom");
    setCustomShock((prev) => {
      const next = { ...prev, box };
      setDebouncedCustomShock(next);
      return next;
    });
  }, []);

  const handleRunCustomNow = useCallback(() => {
    setDebouncedCustomShock(customShock);
    setCustomRunNonce((n) => n + 1);
  }, [customShock]);

  const handleVerifyDeterminism = useCallback(async () => {
    if (!initStates || !doySincos || !primeRollout) return;
    setDetLoading(true);
    try {
      const zeroPreset = SHOCK_PRESETS.find((p) => p.id === "zero_shock");
      const zeroPert = zeroPreset.build(initStates[initStates.length - 1]);
      const res = await runSimulate(apiUrl, {
        initStates,
        doySincos,
        steps: effectiveSteps,
        perturbation: zeroPert,
      });
      const maxDiff = computeMaxCausalRipple(primeRollout, res.rollout);
      setDetResult({ maxDiff, passed: maxDiff === 0 });
    } catch (err) {
      setSimError(err.message);
    } finally {
      setDetLoading(false);
    }
  }, [apiUrl, initStates, doySincos, primeRollout, effectiveSteps]);

  const maxRipple = useMemo(
    () => computeMaxCausalRipple(primeRollout, multiRollout),
    [primeRollout, multiRollout]
  );

  const metrics = useMemo(
    () => computeImpactMetrics(primeRollout, multiRollout, safeDayIdx),
    [primeRollout, multiRollout, safeDayIdx]
  );

  const activeChannel = CHANNELS[channelIdx] || CHANNELS[1];

  return (
    <div className="flex min-h-screen flex-col bg-slate-950 text-slate-100">
      <TopBar
        health={health}
        healthError={healthError}
        onRetryHealth={checkHealth}
        primeMs={primeMs}
        multiMs={multiMs}
        maxRipple={maxRipple}
        activeChannel={activeChannel}
        detResult={detResult}
        detLoading={detLoading}
        onVerifyDeterminism={handleVerifyDeterminism}
      />

      <div className="flex flex-1 flex-col lg:flex-row lg:overflow-hidden">
        <ControlSidebar
          apiUrl={apiUrl}
          onApiUrlChange={setApiUrl}
          bundledId={bundledId}
          initMeta={initMeta}
          onSelectBundled={loadBundled}
          onUploadInitJson={handleUploadInitJson}
          loadingInit={loadingInit}
          steps={steps}
          onStepsChange={handleStepsChange}
          channelIdx={channelIdx}
          onChannelChange={setChannelIdx}
          presetId={presetId}
          onPresetChange={setPresetId}
          customShock={customShock}
          onCustomShockChange={setCustomShock}
          onRunCustomNow={handleRunCustomNow}
          overlays={overlays}
          onOverlaysChange={setOverlays}
        />

        <main className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
          {simError && (
            <div className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-4 py-2.5 text-xs text-rose-200">
              <strong>Inference / Data Error:</strong> {simError} — Ensure{" "}
              <code className="rounded bg-slate-900 px-1.5 py-0.5 text-rose-100">
                .venvv/bin/python serve.py --port 8000
              </code>{" "}
              is running.
            </div>
          )}

          <TimelineBar
            steps={effectiveSteps}
            requestedSteps={steps}
            dayIdx={safeDayIdx}
            onDayChange={(d) => {
              setPlaying(false);
              setDayIdx(d);
            }}
            playing={playing}
            onTogglePlay={() => setPlaying((p) => !p)}
            speedMs={speedMs}
            onSpeedChange={setSpeedMs}
            simLoading={simLoading}
          />

          <MapPanel
            primeRollout={primeRollout}
            multiRollout={multiRollout}
            dayIdx={safeDayIdx}
            channel={activeChannel}
            overlays={overlays}
            shockBox={activeShockBox}
            onDrawBoxCommit={handleDrawBoxCommit}
          />

          <ImpactStrip metrics={metrics} dayIdx={safeDayIdx} steps={effectiveSteps} />
        </main>
      </div>
    </div>
  );
}
