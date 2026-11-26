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
  validateInitPayload,
  validatePerturbationPayload,
} from "./data/presets";
import {
  buildEnsemblePerturbations,
  computeImpactMetrics,
  computeMaxCausalRipple,
  computePhysicsTelemetry,
  computeTemperatureSummary,
} from "./utils/metrics";
import TopBar from "./components/TopBar";
import ControlSidebar from "./components/ControlSidebar";
import TimelineBar from "./components/TimelineBar";
import MapPanel from "./components/MapPanel";
import ImpactStrip from "./components/ImpactStrip";
import EnsembleChartPanel from "./components/EnsembleChartPanel";

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
  const [channelIdx, setChannelIdx] = useState(0); // Default: t2m (Temperature)
  const [chartChannel, setChartChannel] = useState("tp");

  const [presetId, setPresetId] = useState("warm_bob");
  const [customShock, setCustomShock] = useState(createInitialCustomShock);
  const [debouncedCustomShock, setDebouncedCustomShock] = useState(customShock);
  const [customRunNonce, setCustomRunNonce] = useState(0);

  const [overlays, setOverlays] = useState({
    borders: true,
    wind: true,
    moistureFlux: true,
    cities: true,
    shockBox: true,
  });

  const [selectedTarget, setSelectedTarget] = useState({ type: "box" });
  const [hoverCell, setHoverCell] = useState(null);

  const [primeRollout, setPrimeRollout] = useState(null);
  const [multiRollout, setMultiRollout] = useState(null);
  const [primeMs, setPrimeMs] = useState(null);
  const [multiMs, setMultiMs] = useState(null);
  const [simLoading, setSimLoading] = useState(false);
  const [simError, setSimError] = useState(null);

  const [ensembleState, setEnsembleState] = useState({
    loading: false,
    rollouts: null,
    avgMs: null,
    stale: false,
  });

  const [playing, setPlaying] = useState(false);
  const [speedMs, setSpeedMs] = useState(650);

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

  const applyCustomInitJson = useCallback((parsed, label) => {
    try {
      const validated = validateInitPayload(parsed);
      setSimError(null);
      setBundledId("custom_init");
      setInitStates(validated.init_states);
      setDoySincos(validated.doy_sincos);
      setInitMeta({ label });
    } catch (err) {
      setSimError(err.message);
    }
  }, []);

  const applyCustomPertJson = useCallback((parsed, label) => {
    try {
      const tensor = validatePerturbationPayload(parsed);
      setSimError(null);
      setPresetId("custom");
      setCustomShock((prev) => {
        const next = { ...prev, rawPerturbation: tensor, rawLabel: label };
        setDebouncedCustomShock(next);
        return next;
      });
    } catch (err) {
      setSimError(err.message);
    }
  }, []);

  const handleClearRawPert = useCallback(() => {
    setCustomShock((prev) => {
      const next = { ...prev, rawPerturbation: null, rawLabel: null };
      setDebouncedCustomShock(next);
      return next;
    });
  }, []);

  useEffect(() => {
    loadBundled(BUNDLED_WINDOWS[0]);
  }, [loadBundled]);

  useEffect(() => {
    checkHealth();
  }, [checkHealth]);

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

  const effectiveSteps = useMemo(() => {
    if (primeRollout && multiRollout) {
      return Math.min(primeRollout.length, multiRollout.length);
    }
    return primeRollout?.length ?? steps;
  }, [primeRollout, multiRollout, steps]);

  const safeDayIdx = Math.min(dayIdx, Math.max(0, effectiveSteps - 1));

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

  const activeShockBox = useMemo(() => {
    if (presetId === "custom") {
      return customShock.rawPerturbation ? null : customShock.box;
    }
    return activePreset.box;
  }, [presetId, activePreset, customShock.box, customShock.rawPerturbation]);

  const perturbation = useMemo(() => {
    if (!initStates) return null;
    const lastState = initStates[initStates.length - 1];
    return activePreset.build(lastState, debouncedCustomShock);
  }, [initStates, activePreset, debouncedCustomShock]);

  // Clear ensemble if horizon/initStates change; mark stale if only perturbation changes
  useEffect(() => {
    setEnsembleState((prev) => {
      if (!prev.rollouts) return prev;
      if (prev.rollouts[0]?.length !== steps) {
        return { loading: false, rollouts: null, avgMs: null, stale: false };
      }
      return { ...prev, stale: true };
    });
  }, [initStates, steps, perturbation]);

  // Timeline Prime
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

  // Multiverse Shocked
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

  const handleRunEnsemble = useCallback(async () => {
    if (!initStates || !doySincos || !perturbation) return;
    setEnsembleState((prev) => ({ ...prev, loading: true }));
    setSimError(null);
    try {
      const members = buildEnsemblePerturbations(perturbation);
      const responses = await Promise.all(
        members.map((memPert) =>
          runSimulate(apiUrl, { initStates, doySincos, steps, perturbation: memPert })
        )
      );
      const rollouts = responses.map((r) => r.rollout);
      const avgMs =
        responses.reduce((acc, r) => acc + (r.inference_ms || 0), 0) / responses.length;
      setEnsembleState({ loading: false, rollouts, avgMs, stale: false });
    } catch (err) {
      setSimError(`Ensemble failed: ${err.message}`);
      setEnsembleState((prev) => ({ ...prev, loading: false }));
    }
  }, [apiUrl, initStates, doySincos, steps, perturbation]);

  const handleDrawBoxCommit = useCallback((box) => {
    setPresetId("custom");
    setCustomShock((prev) => {
      const next = { ...prev, rawPerturbation: null, rawLabel: null, box };
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

  const physicsTelemetry = useMemo(
    () => computePhysicsTelemetry(primeRollout, multiRollout),
    [primeRollout, multiRollout]
  );

  const metrics = useMemo(
    () => computeImpactMetrics(primeRollout, multiRollout, safeDayIdx),
    [primeRollout, multiRollout, safeDayIdx]
  );

  const tempStats = useMemo(
    () =>
      computeTemperatureSummary(
        primeRollout,
        multiRollout,
        safeDayIdx,
        activeShockBox,
        hoverCell
      ),
    [primeRollout, multiRollout, safeDayIdx, activeShockBox, hoverCell]
  );

  const activeChannel = CHANNELS[channelIdx] || CHANNELS[0];

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900">
      <TopBar
        health={health}
        healthError={healthError}
        onRetryHealth={checkHealth}
        primeMs={primeMs}
        multiMs={multiMs}
        maxRipple={maxRipple}
        physicsTelemetry={physicsTelemetry}
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
          onUploadInitJson={applyCustomInitJson}
          onPasteInitJson={applyCustomInitJson}
          loadingInit={loadingInit}
          steps={steps}
          onStepsChange={handleStepsChange}
          channelIdx={channelIdx}
          onChannelChange={setChannelIdx}
          presetId={presetId}
          onPresetChange={setPresetId}
          customShock={customShock}
          onCustomShockChange={setCustomShock}
          onUploadPertJson={applyCustomPertJson}
          onPastePertJson={applyCustomPertJson}
          onClearRawPert={handleClearRawPert}
          onRunCustomNow={handleRunCustomNow}
          onRunEnsemble={handleRunEnsemble}
          ensembleLoading={ensembleState.loading}
          overlays={overlays}
          onOverlaysChange={setOverlays}
        />

        <main className="flex min-w-0 flex-1 flex-col gap-4 overflow-y-auto p-4 lg:p-5">
          {simError && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-2.5 text-xs text-rose-800">
              <strong>Inference / Data Error:</strong> {simError} — Ensure{" "}
              <code className="rounded bg-white px-1.5 py-0.5 font-mono text-rose-900 ring-1 ring-rose-200">
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
            selectedTarget={selectedTarget}
            onSelectTarget={setSelectedTarget}
            hoverCell={hoverCell}
            onHoverCell={setHoverCell}
          />

          <ImpactStrip
            metrics={metrics}
            tempStats={tempStats}
            dayIdx={safeDayIdx}
            steps={effectiveSteps}
          />

          <EnsembleChartPanel
            primeRollout={primeRollout}
            multiRollout={multiRollout}
            ensembleState={ensembleState}
            onRunEnsemble={handleRunEnsemble}
            selectedTarget={selectedTarget}
            onSelectTarget={setSelectedTarget}
            shockBox={activeShockBox}
            chartChannel={chartChannel}
            onChartChannelChange={setChartChannel}
            dayIdx={safeDayIdx}
          />
        </main>
      </div>
    </div>
  );
}
