"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Activity } from "@/lib/database.types";
import { RACE } from "@/lib/config";

interface RacePredictorProps {
  activities: Activity[];
}

function getElevationAdjustment(elevationM: number): number {
  return elevationM * 0.6;
}

function formatHM(totalSec: number): string {
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  return `${h}h ${m}m`;
}

function paceToLabel(paceMinKm: number): string {
  const mins = Math.floor(paceMinKm);
  const secs = Math.round((paceMinKm - mins) * 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export function RacePredictor({ activities }: RacePredictorProps) {
  const longRuns = activities
    .filter((a) => a.distance_km >= 5 && a.duration_sec > 0 && a.avg_pace_min_km != null)
    .sort((a, b) => b.distance_km - a.distance_km);

  const bestRun = longRuns[0] ?? null;
  const defaultPace = bestRun
    ? Math.round(bestRun.avg_pace_min_km! * 10) / 10
    : 8.0;

  const [paceMinKm, setPaceMinKm] = useState(defaultPace);

  const flatTimeSec = paceMinKm * 60 * RACE.distance_km;
  const elevAdj = getElevationAdjustment(RACE.elevation_m);
  const predictedSec = flatTimeSec + elevAdj;

  const optimistic = predictedSec * 0.92;
  const conservative = predictedSec * 1.1;

  const actualPace = predictedSec / RACE.distance_km / 60;

  const MIN_PACE = 5.0;
  const MAX_PACE = 12.0;
  const pctSlider = ((paceMinKm - MIN_PACE) / (MAX_PACE - MIN_PACE)) * 100;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium font-heading">Race time predictor</CardTitle>
        <p className="text-xs text-muted-foreground">
          Drag the pace slider to explore finish times for {RACE.distance_km}km + {RACE.elevation_m}m D+
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Predicted time */}
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold tabular-nums" style={{ color: "#fbbf24" }}>
            {formatHM(predictedSec)}
          </span>
          <span className="text-sm text-muted-foreground tabular-nums">
            {paceToLabel(actualPace)} /km avg
          </span>
        </div>

        {/* Pace slider */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              Target flat pace
            </span>
            <span className="text-sm font-bold tabular-nums" style={{ color: "#fbbf24" }}>
              {paceToLabel(paceMinKm)} /km
            </span>
          </div>
          <div className="relative">
            <input
              type="range"
              min={MIN_PACE * 10}
              max={MAX_PACE * 10}
              step={1}
              value={paceMinKm * 10}
              onChange={(e) => setPaceMinKm(Number(e.target.value) / 10)}
              className="w-full h-2 rounded-full appearance-none cursor-pointer"
              style={{
                background: `linear-gradient(to right, #22c55e ${pctSlider * 0.5}%, #fbbf24 ${pctSlider}%, #44403c ${pctSlider}%)`,
              }}
            />
            <style>{`
              input[type="range"]::-webkit-slider-thumb {
                -webkit-appearance: none;
                appearance: none;
                width: 18px;
                height: 18px;
                border-radius: 50%;
                background: #fbbf24;
                border: 2px solid #1c1917;
                cursor: pointer;
                box-shadow: 0 0 0 3px rgba(251,191,36,0.25);
              }
              input[type="range"]::-moz-range-thumb {
                width: 18px;
                height: 18px;
                border-radius: 50%;
                background: #fbbf24;
                border: 2px solid #1c1917;
                cursor: pointer;
                box-shadow: 0 0 0 3px rgba(251,191,36,0.25);
              }
            `}</style>
          </div>
          <div className="flex justify-between mt-1 text-[10px] text-muted-foreground tabular-nums">
            <span>5:00 (fast)</span>
            <span>12:00 (hike)</span>
          </div>
        </div>

        {/* Best/conservative range */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Best case</span>
            <span className="tabular-nums font-medium">{formatHM(optimistic)}</span>
          </div>
          <div className="relative h-2 rounded-full" style={{ background: "#44403c" }}>
            <div
              className="absolute inset-y-0 left-0 rounded-full"
              style={{
                width: `${((optimistic / conservative) * 100).toFixed(0)}%`,
                background: "linear-gradient(to right, #22c55e, #fbbf24, #ef4444)",
              }}
            />
            <div
              className="absolute top-1/2 -translate-y-1/2 h-4 w-1 rounded-full bg-white"
              style={{
                left: `${((predictedSec / conservative) * 100).toFixed(0)}%`,
              }}
            />
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Conservative</span>
            <span className="tabular-nums font-medium">{formatHM(conservative)}</span>
          </div>
        </div>

        {bestRun && (
          <div
            className="rounded-md px-2.5 py-1.5 text-[10px] leading-relaxed"
            style={{ background: "rgba(251,191,36,0.08)", borderLeft: "2px solid #fbbf24" }}
          >
            Your longest run: {bestRun.distance_km.toFixed(1)}km at {paceToLabel(bestRun.avg_pace_min_km!)} /km.
            Elevation adds ~{Math.round(elevAdj / 60)} min to the flat prediction.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
