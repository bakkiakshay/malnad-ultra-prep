"use client";

import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface TrackPoint {
  lat: number;
  lon: number;
  ele?: number;
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
    const ele = eleEl ? parseFloat(eleEl.textContent ?? "0") : undefined;
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

export function RouteMap() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gpxData, setGpxData] = useState<{ track: TrackPoint[]; waypoints: Waypoint[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
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

  useEffect(() => {
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

    const { track, waypoints } = gpxData;
    if (track.length === 0) return;

    const lats = track.map((p) => p.lat);
    const lons = track.map((p) => p.lon);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLon = Math.min(...lons);
    const maxLon = Math.max(...lons);

    const pad = 24;
    const mapW = w - pad * 2;
    const mapH = h - pad * 2;

    const latRange = maxLat - minLat || 0.01;
    const lonRange = maxLon - minLon || 0.01;
    const latMid = (minLat + maxLat) / 2;
    const cosLat = Math.cos((latMid * Math.PI) / 180);
    const scaledLonRange = lonRange * cosLat;

    const scaleX = mapW / scaledLonRange;
    const scaleY = mapH / latRange;
    const scale = Math.min(scaleX, scaleY);

    function project(lat: number, lon: number): [number, number] {
      const x = pad + (lon - minLon) * cosLat * scale + (mapW - scaledLonRange * scale) / 2;
      const y = pad + (maxLat - lat) * scale + (mapH - latRange * scale) / 2;
      return [x, y];
    }

    // Background
    ctx.fillStyle = "#1c1917";
    ctx.fillRect(0, 0, w, h);

    // Track glow
    ctx.beginPath();
    track.forEach((p, i) => {
      const [x, y] = project(p.lat, p.lon);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.strokeStyle = "rgba(251,191,36,0.15)";
    ctx.lineWidth = 6;
    ctx.stroke();

    // Track line
    ctx.beginPath();
    track.forEach((p, i) => {
      const [x, y] = project(p.lat, p.lon);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.strokeStyle = "#fbbf24";
    ctx.lineWidth = 2;
    ctx.lineJoin = "round";
    ctx.stroke();

    // Start/finish marker
    const [sx, sy] = project(track[0].lat, track[0].lon);
    ctx.beginPath();
    ctx.arc(sx, sy, 5, 0, Math.PI * 2);
    ctx.fillStyle = "#22c55e";
    ctx.fill();
    ctx.strokeStyle = "#1c1917";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Aid station markers
    waypoints.forEach((wp) => {
      const [wx, wy] = project(wp.lat, wp.lon);
      ctx.beginPath();
      ctx.arc(wx, wy, 3.5, 0, Math.PI * 2);
      ctx.fillStyle = "#ef4444";
      ctx.fill();
      ctx.strokeStyle = "#1c1917";
      ctx.lineWidth = 1.5;
      ctx.stroke();
    });

    // Labels
    ctx.font = "10px system-ui, sans-serif";
    ctx.textAlign = "left";
    ctx.fillStyle = "#22c55e";
    ctx.fillText("Start/Finish", sx + 8, sy + 3);

    ctx.fillStyle = "#a8a29e";
    ctx.font = "9px system-ui, sans-serif";
    waypoints.forEach((wp) => {
      const [wx, wy] = project(wp.lat, wp.lon);
      const shortName = wp.name.replace(/Aid Station /, "AS");
      ctx.fillText(shortName, wx + 6, wy + 3);
    });

    // North indicator
    ctx.fillStyle = "#78716c";
    ctx.font = "10px system-ui, sans-serif";
    ctx.textAlign = "right";
    ctx.fillText("N ↑", w - 8, 16);
  }, [gpxData]);

  function handleMouseMove(e: React.MouseEvent<HTMLCanvasElement>) {
    if (!gpxData || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    const { track } = gpxData;
    const lats = track.map((p) => p.lat);
    const lons = track.map((p) => p.lon);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLon = Math.min(...lons);
    const maxLon = Math.max(...lons);

    const pad = 24;
    const w = rect.width;
    const h = rect.height;
    const mapW = w - pad * 2;
    const mapH = h - pad * 2;
    const latRange = maxLat - minLat || 0.01;
    const lonRange = maxLon - minLon || 0.01;
    const latMid = (minLat + maxLat) / 2;
    const cosLat = Math.cos((latMid * Math.PI) / 180);
    const scaledLonRange = lonRange * cosLat;
    const scaleX = mapW / scaledLonRange;
    const scaleY = mapH / latRange;
    const scale = Math.min(scaleX, scaleY);

    function project(lat: number, lon: number): [number, number] {
      const x = pad + (lon - minLon) * cosLat * scale + (mapW - scaledLonRange * scale) / 2;
      const y = pad + (maxLat - lat) * scale + (mapH - latRange * scale) / 2;
      return [x, y];
    }

    let closest = -1;
    let minDist = Infinity;
    for (let i = 0; i < track.length; i += 10) {
      const [px, py] = project(track[i].lat, track[i].lon);
      const d = Math.hypot(px - mx, py - my);
      if (d < minDist) {
        minDist = d;
        closest = i;
      }
    }

    if (minDist < 20 && closest >= 0) {
      let km = 0;
      for (let i = 1; i <= closest; i++) {
        const dlat = (track[i].lat - track[i - 1].lat) * 111320;
        const dlon = (track[i].lon - track[i - 1].lon) * 111320 * cosLat;
        km += Math.sqrt(dlat * dlat + dlon * dlon) / 1000;
      }
      setHoverInfo({
        km: Math.round(km * 10) / 10,
        ele: track[closest].ele ?? 0,
        x: mx,
        y: my,
      });
    } else {
      setHoverInfo(null);
    }
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
              2 laps &times; 50km loop &middot; Sakleshpur, Western Ghats
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
        <div className="relative" style={{ height: 280 }}>
          {!gpxData && (
            <div className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground">
              Loading route...
            </div>
          )}
          <canvas
            ref={canvasRef}
            className="h-full w-full rounded-md"
            style={{ background: "#1c1917" }}
            onMouseMove={handleMouseMove}
            onMouseLeave={() => setHoverInfo(null)}
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
