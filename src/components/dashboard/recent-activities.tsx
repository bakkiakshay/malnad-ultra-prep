"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Activity } from "@/lib/database.types";
import { formatPace, formatDuration, formatDistance, formatDate } from "@/lib/format";
import { HR_ZONES } from "@/lib/config";

interface RecentActivitiesProps {
  activities: Activity[];
}

/** Return the HR zone color for a given average HR value */
function getHrZoneColor(avgHr: number | null): string | null {
  if (avgHr == null) return null;
  // HR_ZONES = [134, 147, 155, 165, 170, 175, 192]
  // Z1 <= 134, Z2 134-147, Z3 147-155, Z4 155-165, Z5a 165-170, Z5b 170-175, Z5c 175-192
  const colors = [
    "#3b82f6", // Z1 blue
    "#22c55e", // Z2 green
    "#eab308", // Z3 yellow
    "#f97316", // Z4 orange
    "#ef4444", // Z5a red
    "#dc2626", // Z5b
    "#b91c1c", // Z5c
  ];
  if (avgHr <= HR_ZONES[0]) return colors[0];
  if (avgHr <= HR_ZONES[1]) return colors[1];
  if (avgHr <= HR_ZONES[2]) return colors[2];
  if (avgHr <= HR_ZONES[3]) return colors[3];
  if (avgHr <= HR_ZONES[4]) return colors[4];
  if (avgHr <= HR_ZONES[5]) return colors[5];
  return colors[6];
}

export function RecentActivities({ activities }: RecentActivitiesProps) {
  const sorted = [...activities]
    .sort((a, b) => b.activity_date.localeCompare(a.activity_date))
    .slice(0, 10);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">
            Recent Runs
          </CardTitle>
          <Link
            href="/log"
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            View all
          </Link>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Date</TableHead>
                <TableHead className="text-xs">Distance</TableHead>
                <TableHead className="text-xs">Pace</TableHead>
                <TableHead className="text-xs">GAP</TableHead>
                <TableHead className="text-xs">HR</TableHead>
                <TableHead className="text-xs">Load</TableHead>
                <TableHead className="text-xs">Elevation</TableHead>
                <TableHead className="text-xs">Duration</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-sm text-muted-foreground py-8">
                    No runs found. Activities will appear once synced from Intervals.icu.
                  </TableCell>
                </TableRow>
              ) : (
                sorted.map((a) => {
                  const zoneColor = getHrZoneColor(a.avg_hr);
                  return (
                    <TableRow key={a.id} className="relative cursor-pointer hover:bg-accent/50">
                      <TableCell>
                        <Link
                          href={`/log/${a.id}`}
                          className="text-sm hover:underline after:absolute after:inset-0"
                        >
                          {formatDate(a.activity_date)}
                        </Link>
                      </TableCell>
                      <TableCell className="text-sm tabular-nums">
                        {formatDistance(a.distance_km)} km
                      </TableCell>
                      <TableCell className="text-sm tabular-nums">
                        {formatPace(a.avg_pace_min_km)}
                      </TableCell>
                      <TableCell className="text-sm tabular-nums">
                        {formatPace(a.gap_min_km)}
                      </TableCell>
                      <TableCell className="text-sm tabular-nums">
                        <span className="flex items-center gap-1.5">
                          {zoneColor && (
                            <span
                              className="inline-block h-2 w-2 rounded-full flex-shrink-0"
                              style={{ background: zoneColor }}
                            />
                          )}
                          {a.avg_hr ?? "—"} bpm
                        </span>
                      </TableCell>
                      <TableCell className="text-sm tabular-nums">
                        {a.training_load != null
                          ? Math.round(a.training_load)
                          : "—"}
                      </TableCell>
                      <TableCell className="text-sm tabular-nums">
                        {a.elevation_gain_m != null
                          ? `${Math.round(a.elevation_gain_m)}m`
                          : "—"}
                      </TableCell>
                      <TableCell className="text-sm tabular-nums">
                        {formatDuration(a.duration_sec)}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
