"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Activity } from "@/lib/database.types";
import { PLAN_START } from "@/lib/config";
import { formatPace, formatDuration } from "@/lib/format";

interface WeekComparisonProps {
  activities: Activity[];
}

function getWeekBoundaries(weekOffset: number): { start: string; end: string } {
  // PLAN_START is a Monday. getCurrentWeek returns 1-based week number.
  // We want Monday-Sunday boundaries for the current week and previous week.
  const planStart = new Date(PLAN_START + "T00:00:00");

  // Find today's date and determine which training week we're in
  const today = new Date();
  const diffMs = today.getTime() - planStart.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const currentWeekIndex = Math.floor(diffDays / 7); // 0-based

  const targetWeekIndex = currentWeekIndex + weekOffset;

  const start = new Date(planStart);
  start.setDate(start.getDate() + targetWeekIndex * 7);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);

  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  };
}

function getWeekActivities(
  activities: Activity[],
  weekOffset: number
): Activity[] {
  const { start, end } = getWeekBoundaries(weekOffset);
  return activities.filter(
    (a) => a.activity_date >= start && a.activity_date <= end
  );
}

interface MetricData {
  label: string;
  thisWeek: string;
  lastWeek: string;
  diff: number; // positive = increase
  higherIsBetter: boolean;
}

export function WeekComparison({ activities }: WeekComparisonProps) {
  const thisWeekRuns = getWeekActivities(activities, 0);
  const lastWeekRuns = getWeekActivities(activities, -1);

  const thisDistance = thisWeekRuns.reduce((s, a) => s + a.distance_km, 0);
  const lastDistance = lastWeekRuns.reduce((s, a) => s + a.distance_km, 0);

  const thisTime = thisWeekRuns.reduce((s, a) => s + a.duration_sec, 0);
  const lastTime = lastWeekRuns.reduce((s, a) => s + a.duration_sec, 0);

  const thisAvgPace =
    thisWeekRuns.length > 0
      ? thisWeekRuns.reduce((s, a) => s + (a.avg_pace_min_km ?? 0), 0) /
        thisWeekRuns.filter((a) => a.avg_pace_min_km != null).length
      : 0;
  const lastAvgPace =
    lastWeekRuns.length > 0
      ? lastWeekRuns.reduce((s, a) => s + (a.avg_pace_min_km ?? 0), 0) /
        lastWeekRuns.filter((a) => a.avg_pace_min_km != null).length
      : 0;

  const thisAvgHr =
    thisWeekRuns.length > 0
      ? thisWeekRuns.reduce((s, a) => s + (a.avg_hr ?? 0), 0) /
        thisWeekRuns.filter((a) => a.avg_hr != null).length
      : 0;
  const lastAvgHr =
    lastWeekRuns.length > 0
      ? lastWeekRuns.reduce((s, a) => s + (a.avg_hr ?? 0), 0) /
        lastWeekRuns.filter((a) => a.avg_hr != null).length
      : 0;

  const metrics: MetricData[] = [
    {
      label: "Distance",
      thisWeek: `${thisDistance.toFixed(1)} km`,
      lastWeek: `${lastDistance.toFixed(1)} km`,
      diff: lastDistance > 0 ? thisDistance - lastDistance : 0,
      higherIsBetter: true,
    },
    {
      label: "Time on Feet",
      thisWeek: formatDuration(thisTime),
      lastWeek: formatDuration(lastTime),
      diff: lastTime > 0 ? thisTime - lastTime : 0,
      higherIsBetter: true,
    },
    {
      label: "Avg Pace",
      thisWeek: thisAvgPace > 0 ? formatPace(thisAvgPace) : "—",
      lastWeek: lastAvgPace > 0 ? formatPace(lastAvgPace) : "—",
      diff: lastAvgPace > 0 && thisAvgPace > 0 ? thisAvgPace - lastAvgPace : 0,
      higherIsBetter: false, // lower pace = faster
    },
    {
      label: "Avg HR",
      thisWeek: thisAvgHr > 0 ? `${Math.round(thisAvgHr)} bpm` : "—",
      lastWeek: lastAvgHr > 0 ? `${Math.round(lastAvgHr)} bpm` : "—",
      diff: lastAvgHr > 0 && thisAvgHr > 0 ? thisAvgHr - lastAvgHr : 0,
      higherIsBetter: false, // lower HR at same effort = better
    },
  ];

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">
          This Week vs Last Week
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {metrics.map((m) => {
            const isPositive =
              m.diff === 0
                ? null
                : m.higherIsBetter
                  ? m.diff > 0
                  : m.diff < 0;

            return (
              <div key={m.label} className="text-center">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground font-heading mb-1">
                  {m.label}
                </p>
                <p className="text-lg font-bold tabular-nums" style={{ color: "#e7e5e4" }}>
                  {m.thisWeek}
                </p>
                <div className="flex items-center justify-center gap-1 mt-0.5">
                  <span className="text-[10px] text-muted-foreground tabular-nums">
                    {m.lastWeek}
                  </span>
                  {m.diff !== 0 && isPositive !== null && (
                    <span
                      className="text-[10px] font-medium"
                      style={{
                        color: isPositive ? "#22c55e" : "#ef4444",
                      }}
                    >
                      {m.diff > 0 ? "↑" : "↓"}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
