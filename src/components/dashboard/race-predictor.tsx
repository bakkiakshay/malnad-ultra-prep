"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Activity } from "@/lib/database.types";
import { RACE } from "@/lib/config";

interface RacePredictorProps {
  activities: Activity[];
}

function riegel(timeSec: number, distKm: number, targetKm: number): number {
  return timeSec * Math.pow(targetKm / distKm, 1.06);
}

function formatHM(totalSec: number): string {
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  return `${h}h ${m}m`;
}

function getElevationAdjustment(elevationM: number): number {
  return elevationM * 0.6;
}

export function RacePredictor({ activities }: RacePredictorProps) {
  const longRuns = activities
    .filter((a) => a.distance_km >= 5 && a.duration_sec > 0 && a.avg_pace_min_km != null)
    .sort((a, b) => b.distance_km - a.distance_km);

  if (longRuns.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Race time predictor</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">Need 5km+ runs to predict</p>
        </CardContent>
      </Card>
    );
  }

  const best = longRuns[0];
  const baseTimeSec = riegel(best.duration_sec, best.distance_km, RACE.distance_km);
  const elevAdj = getElevationAdjustment(RACE.elevation_m);
  const predictedSec = baseTimeSec + elevAdj;

  const predictedPace = predictedSec / RACE.distance_km / 60;
  const paceMin = Math.floor(predictedPace);
  const paceSec = Math.round((predictedPace - paceMin) * 60);

  const optimistic = predictedSec * 0.92;
  const conservative = predictedSec * 1.1;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Race time predictor</CardTitle>
        <p className="text-xs text-muted-foreground">
          Based on {best.distance_km.toFixed(1)}km at {best.avg_pace_min_km?.toFixed(1)}/km + {RACE.elevation_m}m elevation
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold tabular-nums" style={{ color: "#fbbf24" }}>
            {formatHM(predictedSec)}
          </span>
          <span className="text-sm text-muted-foreground">
            {paceMin}:{paceSec.toString().padStart(2, "0")} /km avg
          </span>
        </div>

        <div className="space-y-2">
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

        <p className="text-[10px] text-muted-foreground leading-relaxed">
          Riegel formula with trail elevation adjustment. Accuracy improves as your longest run approaches race distance.
        </p>
      </CardContent>
    </Card>
  );
}
