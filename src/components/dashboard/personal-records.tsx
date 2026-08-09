"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Activity } from "@/lib/database.types";
import { formatPace, formatDate } from "@/lib/format";

interface PersonalRecordsProps {
  activities: Activity[];
}

interface PR {
  label: string;
  value: string;
  date: string;
}

export function PersonalRecords({ activities }: PersonalRecordsProps) {
  const prs: PR[] = [];

  // Longest Run (km)
  if (activities.length > 0) {
    const longest = activities.reduce((best, a) =>
      a.distance_km > best.distance_km ? a : best
    );
    if (longest.distance_km > 0) {
      prs.push({
        label: "Longest Run",
        value: `${longest.distance_km.toFixed(1)} km`,
        date: formatDate(longest.activity_date),
      });
    }
  }

  // Fastest Pace (from runs >= 5km)
  const qualifyingRuns = activities.filter(
    (a) => a.distance_km >= 5 && a.avg_pace_min_km != null && a.avg_pace_min_km > 0
  );
  if (qualifyingRuns.length > 0) {
    const fastest = qualifyingRuns.reduce((best, a) =>
      (a.avg_pace_min_km ?? Infinity) < (best.avg_pace_min_km ?? Infinity) ? a : best
    );
    prs.push({
      label: "Fastest Pace",
      value: `${formatPace(fastest.avg_pace_min_km)} /km`,
      date: formatDate(fastest.activity_date),
    });
  }

  // Most Elevation (single run)
  const withElevation = activities.filter(
    (a) => a.elevation_gain_m != null && a.elevation_gain_m > 0
  );
  if (withElevation.length > 0) {
    const mostElev = withElevation.reduce((best, a) =>
      (a.elevation_gain_m ?? 0) > (best.elevation_gain_m ?? 0) ? a : best
    );
    prs.push({
      label: "Most Elevation",
      value: `${Math.round(mostElev.elevation_gain_m ?? 0)}m D+`,
      date: formatDate(mostElev.activity_date),
    });
  }

  if (prs.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">
          Personal Records
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {prs.map((pr) => (
            <div key={pr.label} className="text-center sm:text-left">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground font-heading mb-1">
                {pr.label}
              </p>
              <p
                className="text-xl font-bold tabular-nums"
                style={{ color: "#fbbf24" }}
              >
                {pr.value}
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {pr.date}
              </p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
