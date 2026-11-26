import React, { useEffect, useMemo, useRef, useState } from "react";
import { NLAT, NLON, LAT_MIN, LAT_MAX, LON_MIN, LON_MAX } from "../data/presets";
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

function MapCard({
  title,
  subtitle,
  grid,
  tempGridK,
  uGrid,
  vGrid,
  vmin,
  vmax,
  colormap,
  overlays,
  shockBox,
  allowDraw,
  onDrawBoxCommit,
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

    // Smooth AccuWeather radar-style interpolation while preserving exact grid indices
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
    if (!allowDraw) return;
    const pt = toGridCoords(e.clientX, e.clientY);
    dragStartRef.current = pt;
    onDragPreview({ latMin: pt.lat, latMax: pt.lat, lonMin: pt.lon, lonMax: pt.lon });
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e) => {
    const pt = toGridCoords(e.clientX, e.clientY);
    onHoverCell(pt);
    if (allowDraw && dragStartRef.current) {
      const s = dragStartRef.current;
      onDragPreview({
        latMin: Math.min(s.lat, pt.lat),
        latMax: Math.max(s.lat, pt.lat),
        lonMin: Math.min(s.lon, pt.lon),
        lonMax: Math.max(s.lon, pt.lon),
      });
    }
  };

  const handlePointerUp = (e) => {
    if (!allowDraw || !dragStartRef.current) return;
    const pt = toGridCoords(e.clientX, e.clientY);
    const s = dragStartRef.current;
    dragStartRef.current = null;
    onDragPreview(null);
    onDrawBoxCommit({
      latMin: Math.min(s.lat, pt.lat),
      latMax: Math.max(s.lat, pt.lat),
      lonMin: Math.min(s.lon, pt.lon),
      lonMax: Math.max(s.lon, pt.lon),
    });
  };

  const windArrows = useMemo(() => {
    if (!overlays.wind || !uGrid || !vGrid) return [];
    const arrows = [];
    for (let r = 1; r < NLAT; r += 3) {
      for (let c = 1; c < NLON; c += 3) {
        const u = uGrid[r][c];
        const v = vGrid[r][c];
        const mag = Math.hypot(u, v);
        if (mag < 0.25) continue;
        const x1 = lonToX(LON_MIN + c);
        const y1 = latToY(LAT_MIN + r);
        const scale = Math.min(18, 4 + mag * 1.1) / mag;
        const x2 = x1 + u * scale;
        const y2 = y1 - v * scale;
        arrows.push({ key: `${r}-${c}`, x1, y1, x2, y2 });
      }
    }
    return arrows;
  }, [overlays.wind, uGrid, vGrid]);

  const activeBox = dragPreview || (overlays.shockBox ? shockBox : null);
  const hoverVal = hoverCell && grid ? grid[hoverCell.r]?.[hoverCell.c] : null;
  const hoverTempVal = hoverCell && tempGridK ? tempGridK[hoverCell.r]?.[hoverCell.c] : null;

  return (
    <div className="flex flex-col rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm">
      <div className="mb-2.5 flex min-h-[38px] items-start justify-between gap-2">
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

        <svg
          ref={svgRef}
          viewBox={`0 0 ${CANVAS_W} ${CANVAS_H}`}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={() => onHoverCell(null)}
          className={`absolute inset-0 h-full w-full select-none ${
            allowDraw ? "cursor-crosshair" : "cursor-default"
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

          {/* Wind Vector Arrows */}
          {windArrows.map((a) => {
            const dx = a.x2 - a.x1;
            const dy = a.y2 - a.y1;
            const len = Math.hypot(dx, dy);
            const ux = dx / len;
            const uy = dy / len;
            const head = 3.2;
            const hx1 = a.x2 - ux * head - uy * (head * 0.55);
            const hy1 = a.y2 - uy * head + ux * (head * 0.55);
            const hx2 = a.x2 - ux * head + uy * (head * 0.55);
            const hy2 = a.y2 - uy * head - ux * (head * 0.55);
            return (
              <g key={a.key} stroke="rgba(15,23,42,0.72)" strokeWidth="0.95" strokeLinecap="round">
                <line x1={a.x1} y1={a.y1} x2={a.x2} y2={a.y2} />
                <line x1={a.x2} y1={a.y2} x2={hx1} y2={hy1} />
                <line x1={a.x2} y1={a.y2} x2={hx2} y2={hy2} />
              </g>
            );
          })}

          {/* Reference Cities with collision-free offsets */}
          {overlays.cities &&
            REFERENCE_CITIES.map((city) => {
              const cx = lonToX(city.lon);
              const cy = latToY(city.lat);
              return (
                <g key={city.name}>
                  <circle
                    cx={cx}
                    cy={cy}
                    r="2.4"
                    fill="#ea580c"
                    stroke="#ffffff"
                    strokeWidth="1.0"
                  />
                  <text
                    x={cx + city.dx}
                    y={cy + city.dy}
                    textAnchor={city.anchor}
                    fontSize="8.5"
                    fontWeight="700"
                    fill="#0f172a"
                    paintOrder="stroke"
                    stroke="rgba(255,255,255,0.9)"
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

          {/* Hover Cell Highlight */}
          {hoverCell && (
            <rect
              x={hoverCell.c * CELL_PX}
              y={(NLAT - 1 - hoverCell.r) * CELL_PX}
              width={CELL_PX}
              height={CELL_PX}
              fill="rgba(2,132,199,0.12)"
              stroke="#0284c7"
              strokeWidth="1.4"
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

export default function MapPanel({
  primeRollout,
  multiRollout,
  dayIdx,
  channel,
  overlays,
  shockBox,
  onDrawBoxCommit,
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
        vmin={fields.vmin}
        vmax={fields.vmax}
        colormap={channel.colormap}
        overlays={overlays}
        shockBox={shockBox}
        allowDraw={true}
        onDrawBoxCommit={onDrawBoxCommit}
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
        vmin={fields.vmin}
        vmax={fields.vmax}
        colormap={channel.colormap}
        overlays={overlays}
        shockBox={shockBox}
        allowDraw={true}
        onDrawBoxCommit={onDrawBoxCommit}
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
        vmin={-fields.dmax}
        vmax={fields.dmax}
        colormap="rdbu_r"
        overlays={overlays}
        shockBox={shockBox}
        allowDraw={false}
        onDrawBoxCommit={onDrawBoxCommit}
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
