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

interface RecentActivitiesProps {
  activities: Activity[];
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
                <TableHead className="text-xs">HR</TableHead>
                <TableHead className="text-xs">Elevation</TableHead>
                <TableHead className="text-xs">Duration</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-8">
                    No runs found. Activities will appear once synced from Intervals.icu.
                  </TableCell>
                </TableRow>
              ) : (
                sorted.map((a) => (
                  <TableRow key={a.id} className="cursor-pointer hover:bg-accent/50">
                    <TableCell>
                      <Link
                        href={`/log/${a.id}`}
                        className="text-sm hover:underline"
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
                      {a.avg_hr ?? "—"} bpm
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
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
