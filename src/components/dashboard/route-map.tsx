"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface TrackPoint { lat: number; lon: number; ele: number }
interface Waypoint { lat: number; lon: number; name: string }

function parseGPX(xml: string): { track: TrackPoint[]; waypoints: Waypoint[] } {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xml, "text/xml");
  const track: TrackPoint[] = [];
  const trkpts = doc.getElementsByTagName("trkpt");
  for (let i = 0; i < trkpts.length; i++) {
    const pt = trkpts[i];
    track.push({
      lat: parseFloat(pt.getAttribute("lat") ?? "0"),
      lon: parseFloat(pt.getAttribute("lon") ?? "0"),
      ele: parseFloat(pt.getElementsByTagName("ele")[0]?.textContent ?? "0"),
    });
  }
  const waypoints: Waypoint[] = [];
  const wpts = doc.getElementsByTagName("wpt");
  for (let i = 0; i < wpts.length; i++) {
    const pt = wpts[i];
    waypoints.push({
      lat: parseFloat(pt.getAttribute("lat") ?? "0"),
      lon: parseFloat(pt.getAttribute("lon") ?? "0"),
      name: pt.getElementsByTagName("name")[0]?.textContent ?? "",
    });
  }
  return { track, waypoints };
}

function downsample(track: TrackPoint[], n: number): TrackPoint[] {
  if (track.length <= n) return track;
  const step = track.length / n;
  const out: TrackPoint[] = [];
  for (let i = 0; i < n; i++) out.push(track[Math.floor(i * step)]);
  out.push(track[track.length - 1]);
  return out;
}

function project(
  x: number, y: number, z: number,
  rX: number, rZ: number,
  cx: number, cy: number, s: number
): [number, number, number] {
  const cz = Math.cos(rZ), sz = Math.sin(rZ);
  const x1 = x * cz - y * sz, y1 = x * sz + y * cz;
  const cx2 = Math.cos(rX), sx2 = Math.sin(rX);
  return [cx + x1 * s, cy - (y1 * cx2 - z * sx2) * s, y1 * sx2 + z * cx2];
}

// Terrain color: lush green at low, forest green mid, brown-grey at peaks
function terrainRGB(t: number): [number, number, number] {
  if (t < 0.2) return [38 + t * 80, 62 + t * 50, 32 + t * 20];
  if (t < 0.5) return [54 + t * 40, 72 + t * 10, 36];
  if (t < 0.75) return [70 + t * 30, 68 - t * 10, 38 + t * 15];
  return [90 + t * 20, 75 - t * 5, 50 + t * 10];
}

const ELE_EX = 1.6;

export function RouteMap() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gpx, setGpx] = useState<{ track: TrackPoint[]; waypoints: Waypoint[] } | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [rX, setRX] = useState(0.7);
  const [rZ, setRZ] = useState(2.4);
  const [zoom, setZoom] = useState(1.15);
  const drag = useRef<{ sx: number; sy: number; irX: number; irZ: number } | null>(null);
  const [hover, setHover] = useState<{ km: number; ele: number; x: number; y: number } | null>(null);

  useEffect(() => {
    fetch("/malnad-ultra-route.gpx")
      .then((r) => { if (!r.ok) throw new Error(); return r.text(); })
      .then((xml) => setGpx(parseGPX(xml)))
      .catch(() => setErr("Route file not available"));
  }, []);

  const draw = useCallback(() => {
    if (!gpx || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    const w = rect.width, h = rect.height;

    const track = downsample(gpx.track, 800);
    if (track.length === 0) return;

    const lats = track.map((p) => p.lat), lons = track.map((p) => p.lon), eles = track.map((p) => p.ele);
    const mnLat = Math.min(...lats), mxLat = Math.max(...lats);
    const mnLon = Math.min(...lons), mxLon = Math.max(...lons);
    const mnE = Math.min(...eles), mxE = Math.max(...eles);
    const cosL = Math.cos(((mnLat + mxLat) / 2 * Math.PI) / 180);
    const latR = mxLat - mnLat || 0.01;
    const lonR = (mxLon - mnLon) * cosL || 0.01;
    const eleR = mxE - mnE || 1;

    const norm = (lat: number, lon: number, ele: number) => ({
      x: (lon - mnLon) * cosL / lonR - 0.5,
      y: (lat - mnLat) / latR - 0.5,
      z: ((ele - mnE) / eleR) * ELE_EX,
    });

    const sc = Math.min(w, h) * 0.6 * zoom;
    const cx = w / 2, cy = h / 2 + 20;

    // Sky
    const sky = ctx.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, "#070d18");
    sky.addColorStop(0.5, "#0e1824");
    sky.addColorStop(1, "#141210");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, h);

    // Build terrain grid with proximity-based elevation
    const G = 28;
    const pad = 0.2;
    const grid: number[][] = [];
    for (let gy = 0; gy <= G; gy++) {
      const row: number[] = [];
      for (let gx = 0; gx <= G; gx++) {
        const nx = (gx / G) * (1 + pad * 2) - 0.5 - pad;
        const ny = (gy / G) * (1 + pad * 2) - 0.5 - pad;
        const gLat = mnLat + (ny + 0.5) * latR;
        const gLon = mnLon + (nx + 0.5) * lonR / cosL;

        let bestD = Infinity, nearE = mnE;
        for (let i = 0; i < track.length; i += 3) {
          const d = Math.hypot((track[i].lat - gLat) / latR, (track[i].lon - gLon) * cosL / lonR);
          if (d < bestD) { bestD = d; nearE = track[i].ele; }
        }
        const inf = Math.max(0, 1 - bestD * 4);
        const base = mnE + (mxE - mnE) * 0.2;
        row.push(base + (nearE - base) * inf * 0.7);
      }
      grid.push(row);
    }

    // Render terrain quads sorted back-to-front
    const quads: { z: number; fn: () => void }[] = [];
    for (let gy = 0; gy < G; gy++) {
      for (let gx = 0; gx < G; gx++) {
        const corners = [
          { gx, gy }, { gx: gx + 1, gy },
          { gx: gx + 1, gy: gy + 1 }, { gx, gy: gy + 1 },
        ].map((c) => {
          const nx = (c.gx / G) * (1 + pad * 2) - 0.5 - pad;
          const ny = (c.gy / G) * (1 + pad * 2) - 0.5 - pad;
          const e = grid[c.gy][c.gx];
          return project(nx, ny, ((e - mnE) / eleR) * ELE_EX, rX, rZ, cx, cy, sc);
        });
        const avgE = [grid[gy][gx], grid[gy][gx + 1], grid[gy + 1][gx + 1], grid[gy + 1][gx]]
          .reduce((s, v) => s + v, 0) / 4;
        const eNorm = (avgE - mnE) / eleR;
        const avgZ = corners.reduce((s, c) => s + c[2], 0) / 4;

        quads.push({
          z: avgZ,
          fn: () => {
            ctx.beginPath();
            ctx.moveTo(corners[0][0], corners[0][1]);
            for (let i = 1; i < 4; i++) ctx.lineTo(corners[i][0], corners[i][1]);
            ctx.closePath();

            const [r, g, b] = terrainRGB(eNorm);
            // Directional shading: lighter from top-right
            const slopeX = (grid[gy][Math.min(gx + 1, G)] - grid[gy][Math.max(gx - 1, 0)]) / eleR;
            const slopeY = (grid[Math.min(gy + 1, G)][gx] - grid[Math.max(gy - 1, 0)][gx]) / eleR;
            const shade = Math.max(0.4, Math.min(1.2, 1 + slopeX * 2 - slopeY * 1.5));
            ctx.fillStyle = `rgb(${Math.round(r * shade)},${Math.round(g * shade)},${Math.round(b * shade)})`;
            ctx.fill();
            ctx.strokeStyle = `rgba(0,0,0,0.12)`;
            ctx.lineWidth = 0.3;
            ctx.stroke();
          },
        });
      }
    }
    quads.sort((a, b) => a.z - b.z);
    quads.forEach((q) => q.fn());

    // Scattered trees/texture dots on lower elevations
    for (let i = 0; i < 300; i++) {
      const nx = (Math.random() - 0.5) * 1.1;
      const ny = (Math.random() - 0.5) * 1.1;
      const gLat = mnLat + (ny + 0.5) * latR;
      const gLon = mnLon + (nx + 0.5) * lonR / cosL;
      let bestD = Infinity, nearE = mnE;
      for (let j = 0; j < track.length; j += 20) {
        const d = Math.hypot((track[j].lat - gLat) / latR, (track[j].lon - gLon) * cosL / lonR);
        if (d < bestD) { bestD = d; nearE = track[j].ele; }
      }
      const inf = Math.max(0, 1 - bestD * 4);
      const base = mnE + (mxE - mnE) * 0.2;
      const e = base + (nearE - base) * inf * 0.7;
      const eNorm = (e - mnE) / eleR;
      if (eNorm > 0.6 || bestD > 0.3) continue;
      const [px, py] = project(nx, ny, ((e - mnE) / eleR) * ELE_EX + 0.02, rX, rZ, cx, cy, sc);
      const size = 1.5 + Math.random() * 2.5;
      ctx.beginPath();
      ctx.arc(px, py, size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${30 + Math.random() * 20},${50 + Math.random() * 30},${20 + Math.random() * 15},${0.3 + Math.random() * 0.3})`;
      ctx.fill();
    }

    // Track shadow on terrain surface
    const groundP = track.map((p) => {
      let bestD = Infinity, gE = mnE;
      for (let j = 0; j < track.length; j += 10) {
        const d = Math.hypot(track[j].lat - p.lat, track[j].lon - p.lon);
        if (d < bestD) { bestD = d; gE = track[j].ele; }
      }
      const n = norm(p.lat, p.lon, gE * 0.95);
      return project(n.x, n.y, n.z * 0.5, rX, rZ, cx, cy, sc);
    });
    ctx.beginPath();
    groundP.forEach(([px, py], i) => { if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py); });
    ctx.strokeStyle = "rgba(0,0,0,0.35)";
    ctx.lineWidth = 5;
    ctx.lineJoin = "round";
    ctx.stroke();

    // Vertical drop lines
    const trackP = track.map((p) => {
      const n = norm(p.lat, p.lon, p.ele);
      return project(n.x, n.y, n.z, rX, rZ, cx, cy, sc);
    });
    ctx.strokeStyle = "rgba(251,191,36,0.04)";
    ctx.lineWidth = 0.5;
    for (let i = 0; i < trackP.length; i += 15) {
      ctx.beginPath();
      ctx.moveTo(groundP[i][0], groundP[i][1]);
      ctx.lineTo(trackP[i][0], trackP[i][1]);
      ctx.stroke();
    }

    // Track glow
    ctx.beginPath();
    trackP.forEach(([px, py], i) => { if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py); });
    ctx.strokeStyle = "rgba(251,191,36,0.12)";
    ctx.lineWidth = 8;
    ctx.lineJoin = "round";
    ctx.stroke();

    // Track colored by elevation
    for (let i = 1; i < trackP.length; i++) {
      const t = (track[i].ele - mnE) / eleR;
      ctx.beginPath();
      ctx.moveTo(trackP[i - 1][0], trackP[i - 1][1]);
      ctx.lineTo(trackP[i][0], trackP[i][1]);
      ctx.strokeStyle = `rgb(${Math.round(251 - t * 60)},${Math.round(191 - t * 110)},${Math.round(36 + t * 40)})`;
      ctx.lineWidth = 3;
      ctx.lineCap = "round";
      ctx.stroke();
    }

    // Start marker
    const [sx, sy] = trackP[0];
    ctx.beginPath();
    ctx.arc(sx, sy, 7, 0, Math.PI * 2);
    ctx.fillStyle = "#22c55e";
    ctx.shadowColor = "#22c55e";
    ctx.shadowBlur = 12;
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = "#0a0f18";
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Aid stations
    gpx.waypoints.forEach((wp) => {
      const ci = gpx.track.reduce((b, p, i) => {
        const d = Math.hypot(p.lat - wp.lat, p.lon - wp.lon);
        return d < b.d ? { d, i } : b;
      }, { d: Infinity, i: 0 }).i;
      const n = norm(wp.lat, wp.lon, gpx.track[ci]?.ele ?? mnE);
      const [wx, wy] = project(n.x, n.y, n.z, rX, rZ, cx, cy, sc);
      ctx.beginPath();
      ctx.arc(wx, wy, 4.5, 0, Math.PI * 2);
      ctx.fillStyle = "#ef4444";
      ctx.shadowColor = "#ef4444";
      ctx.shadowBlur = 8;
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = "#0a0f18";
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.font = "bold 9px system-ui, sans-serif";
      ctx.fillStyle = "#e7e5e4";
      ctx.textAlign = "left";
      ctx.fillText(wp.name.replace(/Aid Station /, "AS"), wx + 7, wy + 3);
    });

    ctx.font = "bold 10px system-ui, sans-serif";
    ctx.fillStyle = "#4ade80";
    ctx.textAlign = "left";
    ctx.fillText("Start / Finish", sx + 10, sy + 4);

    // Atmospheric fog
    const fog = ctx.createRadialGradient(cx, cy, sc * 0.45, cx, cy, sc * 1.0);
    fog.addColorStop(0, "rgba(7,13,24,0)");
    fog.addColorStop(0.65, "rgba(7,13,24,0)");
    fog.addColorStop(1, "rgba(7,13,24,0.85)");
    ctx.fillStyle = fog;
    ctx.fillRect(0, 0, w, h);

    // Info bar
    ctx.font = "10px system-ui, sans-serif";
    ctx.fillStyle = "#57534e";
    ctx.textAlign = "left";
    ctx.fillText(`${Math.round(mxE - mnE)}m gain`, 10, h - 8);
    ctx.textAlign = "right";
    ctx.fillText(`${Math.round(mnE)}m – ${Math.round(mxE)}m`, w - 10, h - 8);
  }, [gpx, rX, rZ, zoom]);

  useEffect(() => { draw(); }, [draw]);

  const updateDrag = useCallback((clientX: number, clientY: number) => {
    if (!drag.current) return;
    setRZ(drag.current.irZ + (clientX - drag.current.sx) * 0.006);
    setRX(Math.max(0.15, Math.min(1.45, drag.current.irX - (clientY - drag.current.sy) * 0.006)));
  }, []);

  function onDown(x: number, y: number) {
    drag.current = { sx: x, sy: y, irX: rX, irZ: rZ };
    setHover(null);
  }

  function onMove(cx2: number, cy2: number, canvasX: number, canvasY: number) {
    if (drag.current) { updateDrag(cx2, cy2); return; }
    if (!gpx || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const track = downsample(gpx.track, 800);
    const lats = track.map((p) => p.lat), lons = track.map((p) => p.lon), eles = track.map((p) => p.ele);
    const mnLat = Math.min(...lats), mxLat = Math.max(...lats);
    const mnLon = Math.min(...lons), mxLon = Math.max(...lons);
    const mnE = Math.min(...eles), mxE = Math.max(...eles);
    const cosL = Math.cos(((mnLat + mxLat) / 2 * Math.PI) / 180);
    const latR = mxLat - mnLat || 0.01, lonR = (mxLon - mnLon) * cosL || 0.01, eleR = mxE - mnE || 1;
    const sc = Math.min(rect.width, rect.height) * 0.6 * zoom;
    const cxC = rect.width / 2, cyC = rect.height / 2 + 20;

    let best = -1, bestD = Infinity;
    for (let i = 0; i < track.length; i += 2) {
      const n = {
        x: (track[i].lon - mnLon) * cosL / lonR - 0.5,
        y: (track[i].lat - mnLat) / latR - 0.5,
        z: ((track[i].ele - mnE) / eleR) * ELE_EX,
      };
      const [px, py] = project(n.x, n.y, n.z, rX, rZ, cxC, cyC, sc);
      const d = Math.hypot(px - canvasX, py - canvasY);
      if (d < bestD) { bestD = d; best = i; }
    }

    if (bestD < 20 && best >= 0) {
      let km = 0;
      const full = gpx.track;
      const step = Math.max(1, Math.floor(full.length / track.length));
      const ri = Math.min(best * step, full.length - 1);
      for (let i = 1; i <= ri; i++) {
        const dl = (full[i].lat - full[i - 1].lat) * 111320;
        const dn = (full[i].lon - full[i - 1].lon) * 111320 * cosL;
        km += Math.sqrt(dl * dl + dn * dn) / 1000;
      }
      setHover({ km: Math.round(km * 10) / 10, ele: track[best].ele, x: canvasX, y: canvasY });
    } else {
      setHover(null);
    }
  }

  if (err) {
    return (
      <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium font-heading">Course Map</CardTitle></CardHeader>
        <CardContent><p className="text-xs text-muted-foreground">{err}</p></CardContent></Card>
    );
  }

  return (
    <Card style={{ background: "#070d18" }}>
      <CardHeader className="pb-1">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-sm font-medium font-heading">Malnad Ultra 100K Course</CardTitle>
            <p className="text-xs text-muted-foreground">
              2 laps &times; 50km &middot; Western Ghats &middot; Drag to rotate &middot; Scroll to zoom
            </p>
          </div>
          <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <span className="inline-block h-2 w-2 rounded-full" style={{ background: "#22c55e" }} /> Start
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block h-2 w-2 rounded-full" style={{ background: "#ef4444" }} /> Aid
            </span>
            <button
              onClick={() => { setRX(0.7); setRZ(2.4); setZoom(1.15); }}
              className="text-muted-foreground hover:text-[#fbbf24] transition-colors ml-1"
            >Reset</button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="relative px-0 pb-0">
        <div className="relative" style={{ height: 400 }}>
          {!gpx && (
            <div className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground">
              Loading route...
            </div>
          )}
          <canvas
            ref={canvasRef}
            className="h-full w-full touch-none"
            style={{ cursor: drag.current ? "grabbing" : "grab" }}
            onMouseDown={(e) => onDown(e.clientX, e.clientY)}
            onMouseMove={(e) => {
              const r = canvasRef.current?.getBoundingClientRect();
              if (r) onMove(e.clientX, e.clientY, e.clientX - r.left, e.clientY - r.top);
            }}
            onMouseUp={() => { drag.current = null; }}
            onMouseLeave={() => { drag.current = null; setHover(null); }}
            onWheel={(e) => { e.preventDefault(); setZoom((z) => Math.max(0.5, Math.min(3, z - e.deltaY * 0.002))); }}
            onTouchStart={(e) => onDown(e.touches[0].clientX, e.touches[0].clientY)}
            onTouchMove={(e) => updateDrag(e.touches[0].clientX, e.touches[0].clientY)}
            onTouchEnd={() => { drag.current = null; }}
          />
          {hover && (
            <div
              className="pointer-events-none absolute z-10 rounded-md px-2.5 py-1.5 text-xs tabular-nums"
              style={{
                left: Math.min(hover.x + 12, 300),
                top: hover.y - 36,
                background: "rgba(7,13,24,0.92)",
                border: "1px solid #fbbf24",
                color: "#e7e5e4",
              }}
            >
              <span style={{ color: "#fbbf24" }}>{hover.km} km</span> &middot; {Math.round(hover.ele)}m
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
