import React, { useEffect, useMemo, useRef, useState } from "react";
import { NLAT, NLON, LAT_MIN, LAT_MAX, LON_MIN, LON_MAX, clampGridIndex } from "../data/presets";
import { COASTLINE_POLYLINES, INDIA_LAND_BORDERS, REFERENCE_CITIES } from "../data/indiaGeo";
import { LUTS, cssGradient, sampleLut } from "../utils/colormaps";

const CELL_PX = 10;
const CANVAS_W = NLON * CELL_PX; // 360
const CANVAS_H = NLAT * CELL_PX; // 320

function lonToX(lon) {
  return ((lon - (LON_MIN - 0.5)) / NLON) * CANVAS_W;
}

function latToY(lat) {
  return (((LAT_MAX + 0.5) - lat) / NLAT) * CANVAS_H;
}

function polylineToPoints(line) {
  return line.map(([lon, lat]) => `${lonToX(lon).toFixed(1)},${latToY(lat).toFixed(1)}`).join(" ");
}

function sampleBilinear(grid, x, y) {
  if (!grid) return 0;
  // Cell centers sit at (c + 0.5) / NLON and (NLAT - 0.5 - r) / NLAT
  const gx = Math.max(0, Math.min(NLON - 1.0001, (x / CANVAS_W) * NLON - 0.5));
  const gy = Math.max(0, Math.min(NLAT - 1.0001, (1 - y / CANVAS_H) * NLAT - 0.5));
  const c0 = Math.floor(gx);
  const r0 = Math.floor(gy);
  const c1 = Math.min(NLON - 1, c0 + 1);
  const r1 = Math.min(NLAT - 1, r0 + 1);
  const tx = gx - c0;
  const ty = gy - r0;

  const v00 = grid[r0][c0];
  const v10 = grid[r0][c1];
  const v01 = grid[r1][c0];
  const v11 = grid[r1][c1];
  return (
    v00 * (1 - tx) * (1 - ty) +
    v10 * tx * (1 - ty) +
    v01 * (1 - tx) * ty +
    v11 * tx * ty
  );
}

function StreamlineCanvas({ active, uGrid, vGrid, isFlux, isDiff }) {
  const flowRef = useRef(null);
  const fieldRef = useRef({ uGrid, vGrid, isFlux, isDiff });

  useEffect(() => {
    fieldRef.current = { uGrid, vGrid, isFlux, isDiff };
  }, [uGrid, vGrid, isFlux, isDiff]);

  useEffect(() => {
    const canvas = flowRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    if (!active) {
      ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
      return;
    }

    const COUNT = 220;
    const particles = Array.from({ length: COUNT }, () => ({
      x: Math.random() * CANVAS_W,
      y: Math.random() * CANVAS_H,
      age: Math.floor(Math.random() * 90),
      maxAge: 70 + Math.floor(Math.random() * 50),
    }));

    let rafId = 0;
    let lastTs = performance.now();
    const step = (ts) => {
      // Normalize frame delta to 60Hz (16.67ms) so 120Hz/144Hz screens stay calm and consistent
      const dtScale = Math.min(2.0, Math.max(0.25, (ts - lastTs) / 16.67));
      lastTs = ts;

      const { uGrid: ug, vGrid: vg, isFlux: fluxMode, isDiff: diffMode } = fieldRef.current;

      // Fade previous particle trails gently without tinting the radar map underneath
      ctx.globalCompositeOperation = "destination-out";
      ctx.fillStyle = "rgba(0, 0, 0, 0.06)";
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

      ctx.globalCompositeOperation = "source-over";
      ctx.lineWidth = fluxMode ? 1.4 : 1.15;
      ctx.lineCap = "round";

      const gain = (fluxMode ? 0.0021 : diffMode ? 0.14 : 0.065) * dtScale;

      if (ug && vg) {
        for (let i = 0; i < COUNT; i++) {
          const p = particles[i];
          const u = sampleBilinear(ug, p.x, p.y);
          const v = sampleBilinear(vg, p.x, p.y);
          const mag = Math.hypot(u, v);

          if (p.age >= p.maxAge || mag < (fluxMode ? 4 : 0.15)) {
            p.x = Math.random() * CANVAS_W;
            p.y = Math.random() * CANVAS_H;
            p.age = 0;
            p.maxAge = 70 + Math.floor(Math.random() * 50);
            continue;
          }

          const nx = p.x + u * gain;
          const ny = p.y - v * gain; // north (+v) moves up (-y)

          if (nx < 0 || nx > CANVAS_W || ny < 0 || ny > CANVAS_H) {
            p.x = Math.random() * CANVAS_W;
            p.y = Math.random() * CANVAS_H;
            p.age = 0;
            continue;
          }

          const alpha = Math.min(0.88, 0.28 + (fluxMode ? mag * 0.0025 : mag * 0.055));
          ctx.strokeStyle = fluxMode
            ? `rgba(13, 148, 136, ${alpha.toFixed(2)})`
            : `rgba(15, 23, 42, ${alpha.toFixed(2)})`;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(nx, ny);
          ctx.stroke();

          p.x = nx;
          p.y = ny;
          p.age++;
        }
      }

      rafId = requestAnimationFrame(step);
    };

    rafId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafId);
  }, [active]);

  return (
    <canvas
      ref={flowRef}
      width={CANVAS_W}
      height={CANVAS_H}
      className="pointer-events-none absolute inset-0 block h-full w-full"
    />
  );
}

function MapCard({
  title,
  subtitle,
  grid,
  tempGridK,
  uGrid,
  vGrid,
  fluxUGrid,
  fluxVGrid,
  vmin,
  vmax,
  colormap,
  overlays,
  shockBox,
  allowDraw,
  onDrawBoxCommit,
  onSelectTarget,
  selectedTarget,
  hoverCell,
  onHoverCell,
  dragPreview,
  onDragPreview,
  unit,
  isDiff,
}) {
  const canvasRef = useRef(null);
  const svgRef = useRef(null);
  const dragStartRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !grid) return;
    const ctx = canvas.getContext("2d");

    const off = document.createElement("canvas");
    off.width = NLON;
    off.height = NLAT;
    const offCtx = off.getContext("2d");
    const img = offCtx.createImageData(NLON, NLAT);
    const lut = LUTS[colormap] || LUTS.accu_temp;
    const span = Math.max(vmax - vmin, 1e-6);

    for (let r = 0; r < NLAT; r++) {
      const y = NLAT - 1 - r;
      for (let c = 0; c < NLON; c++) {
        const val = grid[r][c];
        const norm = (val - vmin) / span;
        const [red, green, blue] = sampleLut(lut, norm);
        const p = (y * NLON + c) * 4;
        img.data[p] = red;
        img.data[p + 1] = green;
        img.data[p + 2] = blue;
        img.data[p + 3] = 255;
      }
    }
    offCtx.putImageData(img, 0, 0);

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
    ctx.drawImage(off, 0, 0, CANVAS_W, CANVAS_H);
  }, [grid, vmin, vmax, colormap]);

  const toGridCoords = (clientX, clientY) => {
    const rect = svgRef.current.getBoundingClientRect();
    const xNorm = Math.max(0, Math.min(0.9999, (clientX - rect.left) / rect.width));
    const yNorm = Math.max(0, Math.min(0.9999, (clientY - rect.top) / rect.height));
    const c = Math.floor(xNorm * NLON);
    const r = NLAT - 1 - Math.floor(yNorm * NLAT);
    return { r, c, lat: LAT_MIN + r, lon: LON_MIN + c };
  };

  const handlePointerDown = (e) => {
    const pt = toGridCoords(e.clientX, e.clientY);
    dragStartRef.current = { pt, clientX: e.clientX, clientY: e.clientY, dragged: false };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e) => {
    const pt = toGridCoords(e.clientX, e.clientY);
    onHoverCell(pt);
    const start = dragStartRef.current;
    if (allowDraw && start) {
      const movedPx = Math.hypot(e.clientX - start.clientX, e.clientY - start.clientY);
      if (movedPx >= 5) {
        start.dragged = true;
        onDragPreview({
          latMin: Math.min(start.pt.lat, pt.lat),
          latMax: Math.max(start.pt.lat, pt.lat),
          lonMin: Math.min(start.pt.lon, pt.lon),
          lonMax: Math.max(start.pt.lon, pt.lon),
        });
      }
    }
  };

  const handlePointerUp = (e) => {
    const start = dragStartRef.current;
    if (!start) return;
    const pt = toGridCoords(e.clientX, e.clientY);
    dragStartRef.current = null;
    onDragPreview(null);

    if (allowDraw && start.dragged) {
      onDrawBoxCommit({
        latMin: Math.min(start.pt.lat, pt.lat),
        latMax: Math.max(start.pt.lat, pt.lat),
        lonMin: Math.min(start.pt.lon, pt.lon),
        lonMax: Math.max(start.pt.lon, pt.lon),
      });
    } else {
      onSelectTarget({ type: "cell", r: pt.r, c: pt.c, lat: pt.lat, lon: pt.lon });
    }
  };

  const activeBox = dragPreview || (overlays.shockBox ? shockBox : null);
  const hoverVal = hoverCell && grid ? grid[hoverCell.r]?.[hoverCell.c] : null;
  const hoverTempVal = hoverCell && tempGridK ? tempGridK[hoverCell.r]?.[hoverCell.c] : null;
  const hoverFluxMag =
    hoverCell && fluxUGrid && fluxVGrid
      ? Math.hypot(fluxUGrid[hoverCell.r][hoverCell.c], fluxVGrid[hoverCell.r][hoverCell.c])
      : null;

  const selectedCellCoords = useMemo(() => {
    if (selectedTarget?.type === "cell") {
      return { r: selectedTarget.r, c: selectedTarget.c };
    }
    if (selectedTarget?.type === "city") {
      return {
        r: clampGridIndex(selectedTarget.lat - LAT_MIN, NLAT - 1),
        c: clampGridIndex(selectedTarget.lon - LON_MIN, NLON - 1),
      };
    }
    return null;
  }, [selectedTarget]);

  return (
    <div className="flex flex-col rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm">
      <div className="mb-2.5 flex min-h-[42px] items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-xs font-bold text-slate-900">{title}</h3>
          <p className="text-[11px] text-slate-500">{subtitle}</p>
        </div>
        {hoverCell && hoverVal != null && (
          <div className="shrink-0 rounded-md bg-slate-50 px-2 py-1 text-right font-mono text-[10px] leading-tight text-slate-800 ring-1 ring-slate-200">
            <div className="font-semibold text-sky-700">
              [{hoverCell.r},{hoverCell.c}] {hoverCell.lat.toFixed(1)}°N {hoverCell.lon.toFixed(1)}°E
            </div>
            <div>
              {isDiff && hoverVal > 0 ? `+${hoverVal.toFixed(2)}` : hoverVal.toFixed(2)} {unit}
              {hoverTempVal != null && (
                <span className="ml-1.5 text-orange-700">
                  •{" "}
                  {isDiff
                    ? `${hoverTempVal > 0 ? "+" : ""}${hoverTempVal.toFixed(2)} K`
                    : `${(hoverTempVal - 273.15).toFixed(1)}°C (${hoverTempVal.toFixed(1)} K)`}
                </span>
              )}
              {overlays.moistureFlux && hoverFluxMag != null && (
                <span className="ml-1.5 text-teal-700">
                  • IVT {hoverFluxMag.toFixed(0)}
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="relative aspect-[36/32] w-full overflow-hidden rounded-lg bg-sky-50 ring-1 ring-slate-200">
        <canvas
          ref={canvasRef}
          width={CANVAS_W}
          height={CANVAS_H}
          className="block h-full w-full"
        />

        <StreamlineCanvas
          active={overlays.wind || overlays.moistureFlux}
          uGrid={overlays.moistureFlux ? fluxUGrid : uGrid}
          vGrid={overlays.moistureFlux ? fluxVGrid : vGrid}
          isFlux={overlays.moistureFlux}
          isDiff={isDiff}
        />

        <svg
          ref={svgRef}
          viewBox={`0 0 ${CANVAS_W} ${CANVAS_H}`}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={() => onHoverCell(null)}
          className={`absolute inset-0 h-full w-full select-none ${
            allowDraw ? "cursor-crosshair" : "cursor-pointer"
          }`}
        >
          {/* Lat/Lon subtle graticule */}
          {[10, 15, 20, 25, 30, 35].map((lat) => (
            <line
              key={`lat-${lat}`}
              x1={0}
              x2={CANVAS_W}
              y1={latToY(lat)}
              y2={latToY(lat)}
              stroke="rgba(15,23,42,0.12)"
              strokeDasharray="2 3"
              strokeWidth="0.65"
            />
          ))}
          {[70, 75, 80, 85, 90, 95, 100].map((lon) => (
            <line
              key={`lon-${lon}`}
              y1={0}
              y2={CANVAS_H}
              x1={lonToX(lon)}
              x2={lonToX(lon)}
              stroke="rgba(15,23,42,0.12)"
              strokeDasharray="2 3"
              strokeWidth="0.65"
            />
          ))}

          {/* India Coastline & Borders */}
          {overlays.borders && (
            <g fill="none" strokeLinecap="round" strokeLinejoin="round">
              {COASTLINE_POLYLINES.map((line, idx) => (
                <polyline
                  key={`coast-${idx}`}
                  points={polylineToPoints(line)}
                  stroke="rgba(255,255,255,0.7)"
                  strokeWidth="2.2"
                />
              ))}
              {COASTLINE_POLYLINES.map((line, idx) => (
                <polyline
                  key={`coast-ink-${idx}`}
                  points={polylineToPoints(line)}
                  stroke="#1e293b"
                  strokeWidth="1.15"
                />
              ))}
              {INDIA_LAND_BORDERS.map((line, idx) => (
                <polyline
                  key={`border-${idx}`}
                  points={polylineToPoints(line)}
                  stroke="#334155"
                  strokeDasharray="3 2"
                  strokeWidth="1.05"
                />
              ))}
            </g>
          )}

          {/* Reference Cities (clickable to focus time-series chart) */}
          {overlays.cities &&
            REFERENCE_CITIES.map((city) => {
              const cx = lonToX(city.lon);
              const cy = latToY(city.lat);
              const isSelected =
                selectedTarget?.type === "city" && selectedTarget.name === city.name;
              return (
                <g
                  key={city.name}
                  className="cursor-pointer"
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectTarget({ type: "city", ...city });
                  }}
                >
                  <circle
                    cx={cx}
                    cy={cy}
                    r={isSelected ? "3.6" : "2.5"}
                    fill={isSelected ? "#0284c7" : "#ea580c"}
                    stroke="#ffffff"
                    strokeWidth="1.1"
                  />
                  <text
                    x={cx + city.dx}
                    y={cy + city.dy}
                    textAnchor={city.anchor}
                    fontSize="8.5"
                    fontWeight="700"
                    fill={isSelected ? "#0369a1" : "#0f172a"}
                    paintOrder="stroke"
                    stroke="rgba(255,255,255,0.92)"
                    strokeWidth="2.4"
                  >
                    {city.name}
                  </text>
                </g>
              );
            })}

          {/* Active / Dragged Shock Box */}
          {activeBox && (
            <rect
              x={lonToX(activeBox.lonMin - 0.5)}
              y={latToY(activeBox.latMax + 0.5)}
              width={Math.max(CELL_PX, lonToX(activeBox.lonMax + 0.5) - lonToX(activeBox.lonMin - 0.5))}
              height={Math.max(CELL_PX, latToY(activeBox.latMin - 0.5) - latToY(activeBox.latMax + 0.5))}
              fill={dragPreview ? "rgba(234,88,12,0.22)" : "rgba(234,88,12,0.08)"}
              stroke="#ea580c"
              strokeWidth="1.75"
              strokeDasharray="4 2"
            />
          )}

          {/* Selected Time-Series Cell Marker */}
          {selectedCellCoords && (
            <rect
              x={selectedCellCoords.c * CELL_PX}
              y={(NLAT - 1 - selectedCellCoords.r) * CELL_PX}
              width={CELL_PX}
              height={CELL_PX}
              fill="rgba(2,132,199,0.18)"
              stroke="#0284c7"
              strokeWidth="1.6"
            />
          )}

          {/* Hover Cell Highlight */}
          {hoverCell && (
            <rect
              x={hoverCell.c * CELL_PX}
              y={(NLAT - 1 - hoverCell.r) * CELL_PX}
              width={CELL_PX}
              height={CELL_PX}
              fill="rgba(2,132,199,0.10)"
              stroke="#0284c7"
              strokeWidth="1.2"
            />
          )}
        </svg>
      </div>

      {/* Colorbar */}
      <div className="mt-2.5 flex items-center gap-2 font-mono text-[10px] font-medium text-slate-600">
        <span className="w-12 text-right">{vmin.toFixed(1)}</span>
        <div
          className="h-2.5 flex-1 rounded-full ring-1 ring-slate-300"
          style={{ background: cssGradient(colormap) }}
        />
        <span className="w-12">{vmax.toFixed(1)}</span>
      </div>
    </div>
  );
}

function computeFluxPair(rollDay) {
  const u = rollDay[2];
  const v = rollDay[3];
  const tcwv = rollDay[5];
  const fu = u.map((row, r) => row.map((uv, c) => uv * tcwv[r][c]));
  const fv = v.map((row, r) => row.map((vv, c) => vv * tcwv[r][c]));
  return { fu, fv };
}

export default function MapPanel({
  primeRollout,
  multiRollout,
  dayIdx,
  channel,
  overlays,
  shockBox,
  onDrawBoxCommit,
  selectedTarget,
  onSelectTarget,
  hoverCell,
  onHoverCell,
}) {
  const [dragPreview, setDragPreview] = useState(null);

  const fields = useMemo(() => {
    if (!primeRollout?.[dayIdx] || !multiRollout?.[dayIdx]) return null;
    const ch = channel.index;
    const primeRaw = primeRollout[dayIdx][ch];
    const multiRaw = multiRollout[dayIdx][ch];

    const primeDisp = primeRaw.map((row) => row.map((v) => channel.toDisplay(v)));
    const multiDisp = multiRaw.map((row) => row.map((v) => channel.toDisplay(v)));
    const diffDisp = multiDisp.map((row, r) => row.map((v, c) => v - primeDisp[r][c]));

    const primeTempK = primeRollout[dayIdx][0];
    const multiTempK = multiRollout[dayIdx][0];
    const diffTempK = multiTempK.map((row, r) => row.map((v, c) => v - primeTempK[r][c]));

    let vmin = Infinity;
    let vmax = -Infinity;
    let dmax = 1e-4;
    for (let r = 0; r < NLAT; r++) {
      for (let c = 0; c < NLON; c++) {
        vmin = Math.min(vmin, primeDisp[r][c], multiDisp[r][c]);
        vmax = Math.max(vmax, primeDisp[r][c], multiDisp[r][c]);
        dmax = Math.max(dmax, Math.abs(diffDisp[r][c]));
      }
    }

    const primeU = primeRollout[dayIdx][2];
    const primeV = primeRollout[dayIdx][3];
    const multiU = multiRollout[dayIdx][2];
    const multiV = multiRollout[dayIdx][3];
    const diffU = multiU.map((row, r) => row.map((v, c) => v - primeU[r][c]));
    const diffV = multiV.map((row, r) => row.map((v, c) => v - primeV[r][c]));

    const primeFlux = computeFluxPair(primeRollout[dayIdx]);
    const multiFlux = computeFluxPair(multiRollout[dayIdx]);
    const diffFluxU = multiFlux.fu.map((row, r) => row.map((v, c) => v - primeFlux.fu[r][c]));
    const diffFluxV = multiFlux.fv.map((row, r) => row.map((v, c) => v - primeFlux.fv[r][c]));

    return {
      primeDisp,
      multiDisp,
      diffDisp,
      primeTempK,
      multiTempK,
      diffTempK,
      vmin,
      vmax,
      dmax,
      primeU,
      primeV,
      multiU,
      multiV,
      diffU,
      diffV,
      primeFlux,
      multiFlux,
      diffFluxU,
      diffFluxV,
    };
  }, [primeRollout, multiRollout, dayIdx, channel]);

  if (!fields) {
    return (
      <div className="flex h-72 items-center justify-center rounded-xl border border-slate-200 bg-white text-sm text-slate-500 shadow-sm">
        Waiting for simulation rollout from inference server...
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
      <MapCard
        title={`Timeline Prime • Day ${dayIdx + 1}`}
        subtitle={`${channel.label} (Unperturbed)`}
        grid={fields.primeDisp}
        tempGridK={fields.primeTempK}
        uGrid={fields.primeU}
        vGrid={fields.primeV}
        fluxUGrid={fields.primeFlux.fu}
        fluxVGrid={fields.primeFlux.fv}
        vmin={fields.vmin}
        vmax={fields.vmax}
        colormap={channel.colormap}
        overlays={overlays}
        shockBox={shockBox}
        allowDraw={true}
        onDrawBoxCommit={onDrawBoxCommit}
        onSelectTarget={onSelectTarget}
        selectedTarget={selectedTarget}
        hoverCell={hoverCell}
        onHoverCell={onHoverCell}
        dragPreview={dragPreview}
        onDragPreview={setDragPreview}
        unit={channel.unit}
        isDiff={false}
      />
      <MapCard
        title={`Multiverse Shocked • Day ${dayIdx + 1}`}
        subtitle={`${channel.label} (Branched)`}
        grid={fields.multiDisp}
        tempGridK={fields.multiTempK}
        uGrid={fields.multiU}
        vGrid={fields.multiV}
        fluxUGrid={fields.multiFlux.fu}
        fluxVGrid={fields.multiFlux.fv}
        vmin={fields.vmin}
        vmax={fields.vmax}
        colormap={channel.colormap}
        overlays={overlays}
        shockBox={shockBox}
        allowDraw={true}
        onDrawBoxCommit={onDrawBoxCommit}
        onSelectTarget={onSelectTarget}
        selectedTarget={selectedTarget}
        hoverCell={hoverCell}
        onHoverCell={onHoverCell}
        dragPreview={dragPreview}
        onDragPreview={setDragPreview}
        unit={channel.unit}
        isDiff={false}
      />
      <MapCard
        title={`Causal Difference • Day ${dayIdx + 1}`}
        subtitle={`Multiverse − Prime (${channel.unit})`}
        grid={fields.diffDisp}
        tempGridK={fields.diffTempK}
        uGrid={fields.diffU}
        vGrid={fields.diffV}
        fluxUGrid={fields.diffFluxU}
        fluxVGrid={fields.diffFluxV}
        vmin={-fields.dmax}
        vmax={fields.dmax}
        colormap="rdbu_r"
        overlays={overlays}
        shockBox={shockBox}
        allowDraw={false}
        onDrawBoxCommit={onDrawBoxCommit}
        onSelectTarget={onSelectTarget}
        selectedTarget={selectedTarget}
        hoverCell={hoverCell}
        onHoverCell={onHoverCell}
        dragPreview={dragPreview}
        onDragPreview={setDragPreview}
        unit={channel.unit}
        isDiff={true}
      />
    </div>
  );
}
