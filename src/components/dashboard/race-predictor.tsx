"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Activity } from "@/lib/database.types";
import { RACE } from "@/lib/config";

interface RacePredictorProps {
  activities: Activity[];
}

// Riegel formula: T2 = T1 × (D2/D1)^exponent
// Standard marathon uses 1.06; ultra trail needs higher exponent
// to account for cumulative fatigue over 100K
const ULTRA_EXPONENT = 1.14;
const ELEV_SEC_PER_M = 5;

function formatHM(totalSec: number): string {
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  return `${h}h ${String(m).padStart(2, "0")}m`;
}

function paceFromTime(totalSec: number): string {
  const paceMinKm = totalSec / RACE.distance_km / 60;
  const mins = Math.floor(paceMinKm);
  const secs = Math.round((paceMinKm - mins) * 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

const MIN_TIME_H = 10;
const MAX_TIME_H = 24;
const MIN_SEC = MIN_TIME_H * 3600;
const MAX_SEC = MAX_TIME_H * 3600;

export function RacePredictor({ activities }: RacePredictorProps) {
  const longRuns = activities
    .filter((a) => a.distance_km >= 5 && a.duration_sec > 0)
    .sort((a, b) => b.distance_km - a.distance_km);

  const refRun = longRuns[0] ?? null;

  let calculatedSec: number;
  if (refRun && refRun.distance_km > 0) {
    const riegelTime = refRun.duration_sec * Math.pow(RACE.distance_km / refRun.distance_km, ULTRA_EXPONENT);
    const elevAdj = RACE.elevation_m * ELEV_SEC_PER_M;
    calculatedSec = Math.round(riegelTime + elevAdj);
  } else {
    calculatedSec = 18 * 3600;
  }
  const clampedDefault = Math.max(MIN_SEC, Math.min(MAX_SEC, calculatedSec));

  const [timeSec, setTimeSec] = useState(clampedDefault);
  const [dragging, setDragging] = useState(false);
  const barRef = useRef<HTMLDivElement>(null);

  const pct = ((timeSec - MIN_SEC) / (MAX_SEC - MIN_SEC)) * 100;
  const isDefault = timeSec === clampedDefault;

  const updateFromX = useCallback((clientX: number) => {
    if (!barRef.current) return;
    const rect = barRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    const ratio = x / rect.width;
    const newSec = Math.round((MIN_SEC + ratio * (MAX_SEC - MIN_SEC)) / 60) * 60;
    setTimeSec(Math.max(MIN_SEC, Math.min(MAX_SEC, newSec)));
  }, []);

  useEffect(() => {
    if (!dragging) return;
    const onMove = (e: MouseEvent) => { e.preventDefault(); updateFromX(e.clientX); };
    const onUp = () => setDragging(false);
    const onTouchMove = (e: TouchEvent) => { e.preventDefault(); updateFromX(e.touches[0].clientX); };
    const onTouchEnd = () => setDragging(false);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("touchend", onTouchEnd);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, [dragging, updateFromX]);

  const tickHours = [];
  for (let h = MIN_TIME_H; h <= MAX_TIME_H; h += 2) {
    tickHours.push(h);
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium font-heading">Race time predictor</CardTitle>
          {!isDefault && (
            <button
              onClick={() => setTimeSec(clampedDefault)}
              className="text-[10px] text-muted-foreground hover:text-[#fbbf24] transition-colors"
            >
              Reset
            </button>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          {RACE.distance_km}km + {RACE.elevation_m}m D+ &middot; Drag the bar to explore
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Time display */}
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold tabular-nums" style={{ color: "#fbbf24" }}>
            {formatHM(timeSec)}
          </span>
          <span className="text-sm text-muted-foreground tabular-nums">
            {paceFromTime(timeSec)} /km avg
          </span>
        </div>

        {/* Single draggable bar */}
        <div>
          <div
            ref={barRef}
            className="relative h-5 rounded-full cursor-pointer select-none"
            style={{ background: "#44403c" }}
            onMouseDown={(e) => { setDragging(true); updateFromX(e.clientX); }}
            onTouchStart={(e) => { setDragging(true); updateFromX(e.touches[0].clientX); }}
          >
            {/* Filled portion */}
            <div
              className="absolute inset-y-0 left-0 rounded-full transition-[width] duration-75"
              style={{
                width: `${pct}%`,
                background: pct < 30
                  ? "linear-gradient(to right, #22c55e, #fbbf24)"
                  : pct < 60
                  ? "linear-gradient(to right, #22c55e, #fbbf24, #f97316)"
                  : "linear-gradient(to right, #22c55e, #fbbf24, #f97316, #ef4444)",
              }}
            />
            {/* Calculated marker */}
            <div
              className="absolute top-1/2 -translate-y-1/2 w-0.5 h-7 rounded-full"
              style={{
                left: `${((clampedDefault - MIN_SEC) / (MAX_SEC - MIN_SEC)) * 100}%`,
                background: "rgba(255,255,255,0.5)",
              }}
              title={`Calculated: ${formatHM(clampedDefault)}`}
            />
            {/* Thumb */}
            <div
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 transition-[left] duration-75"
              style={{
                left: `${pct}%`,
                width: 22,
                height: 22,
                borderRadius: "50%",
                background: "#fbbf24",
                border: "3px solid #1c1917",
                boxShadow: dragging
                  ? "0 0 0 4px rgba(251,191,36,0.35)"
                  : "0 0 0 2px rgba(251,191,36,0.2)",
                cursor: "grab",
              }}
            />
          </div>
          {/* Hour ticks */}
          <div className="relative mt-1 h-3">
            {tickHours.map((h) => {
              const tickPct = ((h * 3600 - MIN_SEC) / (MAX_SEC - MIN_SEC)) * 100;
              return (
                <span
                  key={h}
                  className="absolute text-[9px] tabular-nums text-muted-foreground -translate-x-1/2"
                  style={{ left: `${tickPct}%` }}
                >
                  {h}h
                </span>
              );
            })}
          </div>
        </div>

        {/* Best/conservative range */}
        <div className="flex items-center justify-between text-xs">
          <div>
            <span className="text-muted-foreground">Best case </span>
            <span className="tabular-nums font-medium" style={{ color: "#22c55e" }}>
              {formatHM(timeSec * 0.92)}
            </span>
          </div>
          <div>
            <span className="text-muted-foreground">Conservative </span>
            <span className="tabular-nums font-medium" style={{ color: "#f97316" }}>
              {formatHM(timeSec * 1.1)}
            </span>
          </div>
        </div>

        {refRun && (
          <div
            className="rounded-md px-2.5 py-1.5 text-[10px] leading-relaxed"
            style={{ background: "rgba(251,191,36,0.08)", borderLeft: "2px solid #fbbf24" }}
          >
            Riegel extrapolation from {refRun.distance_km.toFixed(1)}km run.
            Elevation adds ~{Math.round((RACE.elevation_m * ELEV_SEC_PER_M) / 60)} min.
            Prediction improves as you log longer runs.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
