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

export function RouteMap() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gpxData, setGpxData] = useState<{ track: TrackPoint[]; waypoints: Waypoint[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rotX, setRotX] = useState(0.75);
  const [rotZ, setRotZ] = useState(-0.3);
  const dragRef = useRef<{ startX: number; startY: number; startRotX: number; startRotZ: number } | null>(null);
  const [hoverInfo, setHoverInfo] = useState<{ km: number; ele: number; x: number; y: number } | null>(null);

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

    const track = downsample(gpxData.track, 600);
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

    const normalize = (p: TrackPoint) => ({
      x: ((p.lon - minLon) * cosLat / lonRange - 0.5),
      y: ((p.lat - minLat) / latRange - 0.5),
      z: ((p.ele - minEle) / eleRange) * 0.35,
    });

    ctx.fillStyle = "#1c1917";
    ctx.fillRect(0, 0, w, h);

    const scale = Math.min(w, h) * 0.7;
    const cx = w / 2;
    const cy = h / 2 + 10;

    const projected = track.map((p) => {
      const n = normalize(p);
      return project3D(n.x, n.y, n.z, rotX, rotZ, cx, cy, scale);
    });

    // Shadow/ground line
    const ground = track.map((p) => {
      const n = normalize(p);
      return project3D(n.x, n.y, 0, rotX, rotZ, cx, cy, scale);
    });

    // Ground shadow
    ctx.beginPath();
    ground.forEach(([px, py], i) => {
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    });
    ctx.strokeStyle = "rgba(120,113,108,0.15)";
    ctx.lineWidth = 1;
    ctx.stroke();

    // Vertical lines from ground to track (every Nth point)
    ctx.strokeStyle = "rgba(120,113,108,0.08)";
    ctx.lineWidth = 0.5;
    for (let i = 0; i < projected.length; i += 15) {
      ctx.beginPath();
      ctx.moveTo(ground[i][0], ground[i][1]);
      ctx.lineTo(projected[i][0], projected[i][1]);
      ctx.stroke();
    }

    // Track glow
    ctx.beginPath();
    projected.forEach(([px, py], i) => {
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    });
    ctx.strokeStyle = "rgba(251,191,36,0.12)";
    ctx.lineWidth = 6;
    ctx.stroke();

    // Track line with elevation-based color
    for (let i = 1; i < projected.length; i++) {
      const eleNorm = (track[i].ele - minEle) / eleRange;
      const r = Math.round(34 + eleNorm * 217);
      const g = Math.round(197 - eleNorm * 60);
      const b = Math.round(94 - eleNorm * 58);
      ctx.beginPath();
      ctx.moveTo(projected[i - 1][0], projected[i - 1][1]);
      ctx.lineTo(projected[i][0], projected[i][1]);
      ctx.strokeStyle = `rgb(${r},${g},${b})`;
      ctx.lineWidth = 2.5;
      ctx.lineCap = "round";
      ctx.stroke();
    }

    // Start/finish
    const [sx, sy] = projected[0];
    ctx.beginPath();
    ctx.arc(sx, sy, 5, 0, Math.PI * 2);
    ctx.fillStyle = "#22c55e";
    ctx.fill();
    ctx.strokeStyle = "#1c1917";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Aid stations
    waypoints.forEach((wp) => {
      const n = normalize({ lat: wp.lat, lon: wp.lon, ele: minEle + eleRange * 0.5 });
      const closestTrack = gpxData.track.reduce((best, p, idx) => {
        const d = Math.hypot(p.lat - wp.lat, p.lon - wp.lon);
        return d < best.d ? { d, idx } : best;
      }, { d: Infinity, idx: 0 });
      const wpEle = gpxData.track[closestTrack.idx]?.ele ?? (minEle + eleRange * 0.5);
      const nw = normalize({ lat: wp.lat, lon: wp.lon, ele: wpEle });
      const [wx, wy] = project3D(nw.x, nw.y, nw.z, rotX, rotZ, cx, cy, scale);
      ctx.beginPath();
      ctx.arc(wx, wy, 3.5, 0, Math.PI * 2);
      ctx.fillStyle = "#ef4444";
      ctx.fill();
      ctx.strokeStyle = "#1c1917";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.font = "9px system-ui, sans-serif";
      ctx.fillStyle = "#a8a29e";
      ctx.textAlign = "left";
      const shortName = wp.name.replace(/Aid Station /, "AS");
      ctx.fillText(shortName, wx + 6, wy + 3);
    });

    // Labels
    ctx.font = "10px system-ui, sans-serif";
    ctx.fillStyle = "#22c55e";
    ctx.textAlign = "left";
    ctx.fillText("Start/Finish", sx + 8, sy + 3);

    // Elevation label
    ctx.font = "9px system-ui, sans-serif";
    ctx.fillStyle = "#78716c";
    ctx.textAlign = "right";
    ctx.fillText(`${Math.round(minEle)}m – ${Math.round(maxEle)}m`, w - 8, h - 6);
  }, [gpxData, rotX, rotZ]);

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
      setRotX(Math.max(0.3, Math.min(1.4, dragRef.current.startRotX - dy * 0.005)));
      return;
    }

    if (!gpxData || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    const track = downsample(gpxData.track, 600);
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

    const scale = Math.min(rect.width, rect.height) * 0.7;
    const cx = rect.width / 2;
    const cy = rect.height / 2 + 10;

    let closest = -1;
    let minDist = Infinity;
    for (let i = 0; i < track.length; i += 3) {
      const n = {
        x: (track[i].lon - minLon) * cosLat / lonRange - 0.5,
        y: (track[i].lat - minLat) / latRange - 0.5,
        z: (track[i].ele - minEle) / eleRange * 0.35,
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
      setHoverInfo({ km: Math.round(km * 10) / 10, ele: track[closest].ele, x: mx, y: my });
    } else {
      setHoverInfo(null);
    }
  }

  function handleMouseUp() {
    dragRef.current = null;
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
    setRotX(Math.max(0.3, Math.min(1.4, dragRef.current.startRotX - dy * 0.005)));
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
    <Card>
      <CardHeader className="pb-1">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-sm font-medium font-heading">Malnad Ultra 100K Course</CardTitle>
            <p className="text-xs text-muted-foreground">
              2 laps &times; 50km &middot; Drag to rotate
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
          </div>
        </div>
      </CardHeader>
      <CardContent className="relative">
        <div className="relative" style={{ height: 320 }}>
          {!gpxData && (
            <div className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground">
              Loading route...
            </div>
          )}
          <canvas
            ref={canvasRef}
            className="h-full w-full rounded-md touch-none"
            style={{ background: "#1c1917", cursor: dragRef.current ? "grabbing" : "grab" }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={() => { dragRef.current = null; setHoverInfo(null); }}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={() => { dragRef.current = null; }}
          />
          {hoverInfo && (
            <div
              className="pointer-events-none absolute z-10 rounded-md px-2 py-1 text-xs tabular-nums"
              style={{
                left: hoverInfo.x + 12,
                top: hoverInfo.y - 30,
                background: "#1c1917",
                border: "1px solid #fbbf24",
                color: "#e7e5e4",
              }}
            >
              {hoverInfo.km} km &middot; {Math.round(hoverInfo.ele)}m
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
