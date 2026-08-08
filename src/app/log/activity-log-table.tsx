"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Activity } from "@/lib/database.types";
import {
  formatPace,
  formatDuration,
  formatDistance,
  formatDate,
} from "@/lib/format";

interface ActivityLogTableProps {
  activities: Activity[];
}

export function ActivityLogTable({ activities }: ActivityLogTableProps) {
  const sorted = [...activities].sort((a, b) =>
    b.activity_date.localeCompare(a.activity_date)
  );

  return (
    <Card>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Date</TableHead>
                <TableHead className="text-xs">Name</TableHead>
                <TableHead className="text-xs text-right">Distance</TableHead>
                <TableHead className="text-xs text-right">Duration</TableHead>
                <TableHead className="text-xs text-right">Pace</TableHead>
                <TableHead className="text-xs text-right">Avg HR</TableHead>
                <TableHead className="text-xs text-right">Elevation</TableHead>
                <TableHead className="text-xs text-right">Cadence</TableHead>
                <TableHead className="text-xs text-right">Temp</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={9}
                    className="py-12 text-center text-sm text-muted-foreground"
                  >
                    No runs found yet.
                  </TableCell>
                </TableRow>
              ) : (
                sorted.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="text-sm">
                      <Link
                        href={`/log/${a.id}`}
                        className="font-medium hover:underline"
                      >
                        {formatDate(a.activity_date)}
                      </Link>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[160px] truncate">
                      {a.name}
                    </TableCell>
                    <TableCell className="text-right text-sm tabular-nums">
                      {formatDistance(a.distance_km)} km
                    </TableCell>
                    <TableCell className="text-right text-sm tabular-nums">
                      {formatDuration(a.duration_sec)}
                    </TableCell>
                    <TableCell className="text-right text-sm tabular-nums">
                      {formatPace(a.avg_pace_min_km)} /km
                    </TableCell>
                    <TableCell className="text-right text-sm tabular-nums">
                      {a.avg_hr ?? "—"}
                    </TableCell>
                    <TableCell className="text-right text-sm tabular-nums">
                      {a.elevation_gain_m != null
                        ? `${Math.round(a.elevation_gain_m)}m`
                        : "—"}
                    </TableCell>
                    <TableCell className="text-right text-sm tabular-nums">
                      {a.avg_cadence != null
                        ? Math.round(a.avg_cadence * 2)
                        : "—"}
                    </TableCell>
                    <TableCell className="text-right text-sm tabular-nums">
                      {a.avg_temp_c != null
                        ? `${Math.round(a.avg_temp_c)}°C`
                        : "—"}
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
