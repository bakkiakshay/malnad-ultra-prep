"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface TrackPoint {
  lat: number;
  lon: number;
  ele: number;
}

interface Waypoint {
  lat: number;
  lon: number;
  name: string;
}

function parseGPX(xml: string): { track: TrackPoint[]; waypoints: Waypoint[] } {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xml, "text/xml");

  const track: TrackPoint[] = [];
  const trkpts = doc.getElementsByTagName("trkpt");
  for (let i = 0; i < trkpts.length; i++) {
    const pt = trkpts[i];
    const lat = parseFloat(pt.getAttribute("lat") ?? "0");
    const lon = parseFloat(pt.getAttribute("lon") ?? "0");
    const eleEl = pt.getElementsByTagName("ele")[0];
    const ele = eleEl ? parseFloat(eleEl.textContent ?? "0") : 0;
    track.push({ lat, lon, ele });
  }

  const waypoints: Waypoint[] = [];
  const wpts = doc.getElementsByTagName("wpt");
  for (let i = 0; i < wpts.length; i++) {
    const pt = wpts[i];
    const lat = parseFloat(pt.getAttribute("lat") ?? "0");
    const lon = parseFloat(pt.getAttribute("lon") ?? "0");
    const nameEl = pt.getElementsByTagName("name")[0];
    const name = nameEl?.textContent ?? "";
    waypoints.push({ lat, lon, name });
  }

  return { track, waypoints };
}

function downsample(track: TrackPoint[], maxPoints: number): TrackPoint[] {
  if (track.length <= maxPoints) return track;
  const step = track.length / maxPoints;
  const result: TrackPoint[] = [];
  for (let i = 0; i < maxPoints; i++) {
    result.push(track[Math.floor(i * step)]);
  }
  result.push(track[track.length - 1]);
  return result;
}

function project3D(
  x: number, y: number, z: number,
  rotX: number, rotZ: number,
  cx: number, cy: number, scale: number
): [number, number, number] {
  const cosZ = Math.cos(rotZ);
  const sinZ = Math.sin(rotZ);
  const x1 = x * cosZ - y * sinZ;
  const y1 = x * sinZ + y * cosZ;

  const cosX = Math.cos(rotX);
  const sinX = Math.sin(rotX);
  const y2 = y1 * cosX - z * sinX;
  const z2 = y1 * sinX + z * cosX;

  return [cx + x1 * scale, cy - y2 * scale, z2];
}

function terrainColor(eleNorm: number): string {
  if (eleNorm < 0.15) return "rgb(45,65,45)";
  if (eleNorm < 0.3) return "rgb(55,75,42)";
  if (eleNorm < 0.5) return "rgb(72,82,40)";
  if (eleNorm < 0.7) return "rgb(95,82,48)";
  if (eleNorm < 0.85) return "rgb(110,88,55)";
  return "rgb(125,100,65)";
}

function trackColor(eleNorm: number): string {
  const r = Math.round(251 - eleNorm * 50);
  const g = Math.round(191 - eleNorm * 100);
  const b = Math.round(36 + eleNorm * 30);
  return `rgb(${r},${g},${b})`;
}

const ELEV_EXAGGERATION = 1.4;

export function RouteMap() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gpxData, setGpxData] = useState<{ track: TrackPoint[]; waypoints: Waypoint[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rotX, setRotX] = useState(0.85);
  const [rotZ, setRotZ] = useState(-0.4);
  const [zoom, setZoom] = useState(1.0);
  const dragRef = useRef<{ startX: number; startY: number; startRotX: number; startRotZ: number } | null>(null);
  const [hoverInfo, setHoverInfo] = useState<{ km: number; ele: number; grade: string; x: number; y: number } | null>(null);

  useEffect(() => {
    fetch("/malnad-ultra-route.gpx")
      .then((res) => {
        if (!res.ok) throw new Error("GPX not found");
        return res.text();
      })
      .then((xml) => setGpxData(parseGPX(xml)))
      .catch(() => setError("Route file not available"));
  }, []);

  const draw = useCallback(() => {
    if (!gpxData || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    const w = rect.width;
    const h = rect.height;

    const track = downsample(gpxData.track, 800);
    const { waypoints } = gpxData;
    if (track.length === 0) return;

    const lats = track.map((p) => p.lat);
    const lons = track.map((p) => p.lon);
    const eles = track.map((p) => p.ele);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLon = Math.min(...lons);
    const maxLon = Math.max(...lons);
    const minEle = Math.min(...eles);
    const maxEle = Math.max(...eles);
    const latMid = (minLat + maxLat) / 2;
    const cosLat = Math.cos((latMid * Math.PI) / 180);

    const latRange = maxLat - minLat || 0.01;
    const lonRange = (maxLon - minLon) * cosLat || 0.01;
    const eleRange = maxEle - minEle || 1;

    const normalize = (lat: number, lon: number, ele: number) => ({
      x: ((lon - minLon) * cosLat / lonRange - 0.5),
      y: ((lat - minLat) / latRange - 0.5),
      z: ((ele - minEle) / eleRange) * ELEV_EXAGGERATION,
    });

    const scale = Math.min(w, h) * 0.65 * zoom;
    const cx = w / 2;
    const cy = h / 2 + 15;

    // Sky gradient
    const skyGrad = ctx.createLinearGradient(0, 0, 0, h);
    skyGrad.addColorStop(0, "#0a0f1a");
    skyGrad.addColorStop(0.4, "#121a2e");
    skyGrad.addColorStop(1, "#1a1510");
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, w, h);

    // Terrain mesh grid
    const gridRes = 20;
    const gridPad = 0.15;
    const terrainGrid: { ele: number; x: number; y: number }[][] = [];

    for (let gy = 0; gy <= gridRes; gy++) {
      const row: { ele: number; x: number; y: number }[] = [];
      for (let gx = 0; gx <= gridRes; gx++) {
        const nx = (gx / gridRes) * (1 + gridPad * 2) - 0.5 - gridPad;
        const ny = (gy / gridRes) * (1 + gridPad * 2) - 0.5 - gridPad;
        const gLat = minLat + (ny + 0.5) * latRange;
        const gLon = minLon + (nx + 0.5) * lonRange / cosLat;

        let nearestEle = minEle;
        let bestDist = Infinity;
        for (let i = 0; i < track.length; i += 4) {
          const d = Math.hypot(
            (track[i].lat - gLat) / latRange,
            (track[i].lon - gLon) * cosLat / lonRange
          );
          if (d < bestDist) {
            bestDist = d;
            nearestEle = track[i].ele;
          }
        }
        const influence = Math.max(0, 1 - bestDist * 6);
        const ele = minEle + (nearestEle - minEle) * influence * 0.6;

        row.push({ ele, x: nx, y: ny });
      }
      terrainGrid.push(row);
    }

    // Draw terrain quads back-to-front
    const terrainQuads: { avgZ: number; draw: () => void }[] = [];
    for (let gy = 0; gy < gridRes; gy++) {
      for (let gx = 0; gx < gridRes; gx++) {
        const corners = [
          terrainGrid[gy][gx],
          terrainGrid[gy][gx + 1],
          terrainGrid[gy + 1][gx + 1],
          terrainGrid[gy + 1][gx],
        ];
        const projected = corners.map((c) => {
          const nz = ((c.ele - minEle) / eleRange) * ELEV_EXAGGERATION;
          return project3D(c.x, c.y, nz, rotX, rotZ, cx, cy, scale);
        });
        const avgEle = corners.reduce((s, c) => s + c.ele, 0) / 4;
        const eleNorm = (avgEle - minEle) / eleRange;
        const avgZ = projected.reduce((s, p) => s + p[2], 0) / 4;

        terrainQuads.push({
          avgZ,
          draw: () => {
            ctx.beginPath();
            ctx.moveTo(projected[0][0], projected[0][1]);
            for (let i = 1; i < 4; i++) ctx.lineTo(projected[i][0], projected[i][1]);
            ctx.closePath();

            const tiltShade = Math.max(0.5, 1 - (gy / gridRes) * 0.4);
            ctx.fillStyle = terrainColor(eleNorm);
            ctx.globalAlpha = tiltShade * 0.85;
            ctx.fill();
            ctx.globalAlpha = 1;

            ctx.strokeStyle = "rgba(255,255,255,0.04)";
            ctx.lineWidth = 0.5;
            ctx.stroke();
          },
        });
      }
    }
    terrainQuads.sort((a, b) => a.avgZ - b.avgZ);
    terrainQuads.forEach((q) => q.draw());

    // Track shadow on ground
    const groundProj = track.map((p) => {
      const n = normalize(p.lat, p.lon, minEle);
      return project3D(n.x, n.y, 0, rotX, rotZ, cx, cy, scale);
    });
    ctx.beginPath();
    groundProj.forEach(([px, py], i) => {
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    });
    ctx.strokeStyle = "rgba(0,0,0,0.4)";
    ctx.lineWidth = 4;
    ctx.stroke();

    // Vertical drop lines
    const projected = track.map((p) => {
      const n = normalize(p.lat, p.lon, p.ele);
      return project3D(n.x, n.y, n.z, rotX, rotZ, cx, cy, scale);
    });

    ctx.strokeStyle = "rgba(251,191,36,0.06)";
    ctx.lineWidth = 0.5;
    for (let i = 0; i < projected.length; i += 12) {
      ctx.beginPath();
      ctx.moveTo(groundProj[i][0], groundProj[i][1]);
      ctx.lineTo(projected[i][0], projected[i][1]);
      ctx.stroke();
    }

    // Track glow
    ctx.beginPath();
    projected.forEach(([px, py], i) => {
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    });
    ctx.strokeStyle = "rgba(251,191,36,0.15)";
    ctx.lineWidth = 8;
    ctx.lineJoin = "round";
    ctx.stroke();

    // Track line colored by elevation
    for (let i = 1; i < projected.length; i++) {
      const eleNorm = (track[i].ele - minEle) / eleRange;
      ctx.beginPath();
      ctx.moveTo(projected[i - 1][0], projected[i - 1][1]);
      ctx.lineTo(projected[i][0], projected[i][1]);
      ctx.strokeStyle = trackColor(eleNorm);
      ctx.lineWidth = 3;
      ctx.lineCap = "round";
      ctx.stroke();
    }

    // Start/finish marker
    const [sx, sy] = projected[0];
    ctx.beginPath();
    ctx.arc(sx, sy, 6, 0, Math.PI * 2);
    ctx.fillStyle = "#22c55e";
    ctx.shadowColor = "#22c55e";
    ctx.shadowBlur = 8;
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = "#1c1917";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Aid stations
    waypoints.forEach((wp) => {
      const closestIdx = gpxData.track.reduce((best, p, idx) => {
        const d = Math.hypot(p.lat - wp.lat, p.lon - wp.lon);
        return d < best.d ? { d, idx } : best;
      }, { d: Infinity, idx: 0 }).idx;
      const wpEle = gpxData.track[closestIdx]?.ele ?? (minEle + eleRange * 0.5);
      const n = normalize(wp.lat, wp.lon, wpEle);
      const [wx, wy] = project3D(n.x, n.y, n.z, rotX, rotZ, cx, cy, scale);

      ctx.beginPath();
      ctx.arc(wx, wy, 4, 0, Math.PI * 2);
      ctx.fillStyle = "#ef4444";
      ctx.shadowColor = "#ef4444";
      ctx.shadowBlur = 6;
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = "#1c1917";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.font = "bold 9px system-ui, sans-serif";
      ctx.fillStyle = "#d6d3d1";
      ctx.textAlign = "left";
      ctx.fillText(wp.name.replace(/Aid Station /, "AS"), wx + 7, wy + 3);
    });

    // Start label
    ctx.font = "bold 10px system-ui, sans-serif";
    ctx.fillStyle = "#22c55e";
    ctx.textAlign = "left";
    ctx.fillText("Start / Finish", sx + 9, sy + 4);

    // Atmospheric fog at edges
    const fogGrad = ctx.createRadialGradient(cx, cy, scale * 0.5, cx, cy, scale * 1.1);
    fogGrad.addColorStop(0, "rgba(10,15,26,0)");
    fogGrad.addColorStop(0.7, "rgba(10,15,26,0)");
    fogGrad.addColorStop(1, "rgba(10,15,26,0.7)");
    ctx.fillStyle = fogGrad;
    ctx.fillRect(0, 0, w, h);

    // Elevation info
    ctx.font = "10px system-ui, sans-serif";
    ctx.fillStyle = "#78716c";
    ctx.textAlign = "right";
    ctx.fillText(`${Math.round(minEle)}m – ${Math.round(maxEle)}m elev`, w - 10, h - 8);
    ctx.textAlign = "left";
    ctx.fillText(`${Math.round(maxEle - minEle)}m gain`, 10, h - 8);
  }, [gpxData, rotX, rotZ, zoom]);

  useEffect(() => { draw(); }, [draw]);

  function handleMouseDown(e: React.MouseEvent) {
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startRotX: rotX,
      startRotZ: rotZ,
    };
    setHoverInfo(null);
  }

  function handleMouseMove(e: React.MouseEvent) {
    if (dragRef.current) {
      const dx = e.clientX - dragRef.current.startX;
      const dy = e.clientY - dragRef.current.startY;
      setRotZ(dragRef.current.startRotZ + dx * 0.005);
      setRotX(Math.max(0.2, Math.min(1.5, dragRef.current.startRotX - dy * 0.005)));
      return;
    }

    if (!gpxData || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    const track = downsample(gpxData.track, 800);
    const lats = track.map((p) => p.lat);
    const lons = track.map((p) => p.lon);
    const eles = track.map((p) => p.ele);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLon = Math.min(...lons);
    const maxLon = Math.max(...lons);
    const minEle = Math.min(...eles);
    const maxEle = Math.max(...eles);
    const latMid = (minLat + maxLat) / 2;
    const cosLat = Math.cos((latMid * Math.PI) / 180);
    const latRange = maxLat - minLat || 0.01;
    const lonRange = (maxLon - minLon) * cosLat || 0.01;
    const eleRange = maxEle - minEle || 1;

    const scale = Math.min(rect.width, rect.height) * 0.65 * zoom;
    const cx = rect.width / 2;
    const cy = rect.height / 2 + 15;

    let closest = -1;
    let minDist = Infinity;
    for (let i = 0; i < track.length; i += 2) {
      const n = {
        x: (track[i].lon - minLon) * cosLat / lonRange - 0.5,
        y: (track[i].lat - minLat) / latRange - 0.5,
        z: (track[i].ele - minEle) / eleRange * ELEV_EXAGGERATION,
      };
      const [px, py] = project3D(n.x, n.y, n.z, rotX, rotZ, cx, cy, scale);
      const d = Math.hypot(px - mx, py - my);
      if (d < minDist) { minDist = d; closest = i; }
    }

    if (minDist < 20 && closest >= 0) {
      let km = 0;
      const fullTrack = gpxData.track;
      const step = Math.max(1, Math.floor(fullTrack.length / track.length));
      const realIdx = Math.min(closest * step, fullTrack.length - 1);
      for (let i = 1; i <= realIdx; i++) {
        const dlat = (fullTrack[i].lat - fullTrack[i - 1].lat) * 111320;
        const dlon = (fullTrack[i].lon - fullTrack[i - 1].lon) * 111320 * cosLat;
        km += Math.sqrt(dlat * dlat + dlon * dlon) / 1000;
      }
      const prevIdx = Math.max(0, realIdx - 5);
      const dEle = fullTrack[realIdx].ele - fullTrack[prevIdx].ele;
      const dDist = km > 0 ? 0.05 : 0;
      const grade = dDist > 0 ? `${dEle > 0 ? "+" : ""}${((dEle / (dDist * 1000)) * 100).toFixed(0)}%` : "";
      setHoverInfo({ km: Math.round(km * 10) / 10, ele: track[closest].ele, grade, x: mx, y: my });
    } else {
      setHoverInfo(null);
    }
  }

  function handleMouseUp() {
    dragRef.current = null;
  }

  function handleWheel(e: React.WheelEvent) {
    e.preventDefault();
    setZoom((prev) => Math.max(0.5, Math.min(3.0, prev - e.deltaY * 0.001)));
  }

  function handleTouchStart(e: React.TouchEvent) {
    const t = e.touches[0];
    dragRef.current = { startX: t.clientX, startY: t.clientY, startRotX: rotX, startRotZ: rotZ };
  }

  function handleTouchMove(e: React.TouchEvent) {
    if (!dragRef.current) return;
    const t = e.touches[0];
    const dx = t.clientX - dragRef.current.startX;
    const dy = t.clientY - dragRef.current.startY;
    setRotZ(dragRef.current.startRotZ + dx * 0.005);
    setRotX(Math.max(0.2, Math.min(1.5, dragRef.current.startRotX - dy * 0.005)));
  }

  if (error) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium font-heading">Course Map</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">{error}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card style={{ background: "#0a0f1a" }}>
      <CardHeader className="pb-1">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-sm font-medium font-heading">Malnad Ultra 100K Course</CardTitle>
            <p className="text-xs text-muted-foreground">
              2 laps &times; 50km &middot; Drag to rotate &middot; Scroll to zoom
            </p>
          </div>
          <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <span className="inline-block h-2 w-2 rounded-full" style={{ background: "#22c55e" }} />
              Start
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block h-2 w-2 rounded-full" style={{ background: "#ef4444" }} />
              Aid
            </span>
            <button
              onClick={() => { setRotX(0.85); setRotZ(-0.4); setZoom(1.0); }}
              className="text-muted-foreground hover:text-[#fbbf24] transition-colors ml-1"
              title="Reset view"
            >
              Reset
            </button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="relative px-0 pb-0">
        <div className="relative" style={{ height: 380 }}>
          {!gpxData && (
            <div className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground">
              Loading route...
            </div>
          )}
          <canvas
            ref={canvasRef}
            className="h-full w-full touch-none"
            style={{ cursor: dragRef.current ? "grabbing" : "grab" }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={() => { dragRef.current = null; setHoverInfo(null); }}
            onWheel={handleWheel}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={() => { dragRef.current = null; }}
          />
          {hoverInfo && (
            <div
              className="pointer-events-none absolute z-10 rounded-md px-2.5 py-1.5 text-xs tabular-nums"
              style={{
                left: Math.min(hoverInfo.x + 12, 280),
                top: hoverInfo.y - 36,
                background: "rgba(28,25,23,0.95)",
                border: "1px solid #fbbf24",
                color: "#e7e5e4",
                backdropFilter: "blur(4px)",
              }}
            >
              <span style={{ color: "#fbbf24" }}>{hoverInfo.km} km</span>
              {" "}&middot; {Math.round(hoverInfo.ele)}m
              {hoverInfo.grade && <> &middot; {hoverInfo.grade}</>}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
