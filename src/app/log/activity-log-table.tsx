"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
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
import { PLAN_START, PLAN_WEEKS } from "@/lib/config";

/* ------------------------------------------------------------------ */
/*  HR Zone color coding                                              */
/* ------------------------------------------------------------------ */

function hrZoneColor(avgHr: number | null): string | undefined {
  if (avgHr == null) return undefined;
  if (avgHr <= 134) return "#3b82f6"; // Z1 blue
  if (avgHr <= 147) return "#22c55e"; // Z2 green
  if (avgHr <= 155) return "#eab308"; // Z3 yellow
  if (avgHr <= 165) return "#f97316"; // Z4 orange
  return "#ef4444"; // Z5+ red
}

/* ------------------------------------------------------------------ */
/*  Run type classification                                           */
/* ------------------------------------------------------------------ */

interface RunTag {
  label: string;
  bg: string;
  text: string;
}

function classifyRun(a: Activity): RunTag {
  if (a.distance_km < 5 || (a.avg_hr != null && a.avg_hr < 134)) {
    return { label: "Recovery", bg: "#3b82f620", text: "#3b82f6" };
  }
  if (a.avg_hr != null && a.avg_hr >= 134 && a.avg_hr <= 147 && a.distance_km < 15) {
    return { label: "Easy", bg: "#22c55e20", text: "#22c55e" };
  }
  if (a.avg_hr != null && a.avg_hr > 155) {
    return { label: "Tempo", bg: "#f9731620", text: "#f97316" };
  }
  if (a.distance_km >= 15) {
    return { label: "Long", bg: "#a855f720", text: "#a855f7" };
  }
  return { label: "Run", bg: "#a8a29e20", text: "#a8a29e" };
}

/* ------------------------------------------------------------------ */
/*  Sorting                                                           */
/* ------------------------------------------------------------------ */

type SortKey =
  | "activity_date"
  | "distance_km"
  | "duration_sec"
  | "avg_pace_min_km"
  | "avg_hr"
  | "elevation_gain_m"
  | "training_load"
  | "gap_min_km";

type SortDir = "asc" | "desc";

function sortActivities(
  list: Activity[],
  key: SortKey,
  dir: SortDir
): Activity[] {
  return [...list].sort((a, b) => {
    const av = a[key];
    const bv = b[key];
    if (av == null && bv == null) return 0;
    if (av == null) return 1;
    if (bv == null) return -1;
    const cmp = av < bv ? -1 : av > bv ? 1 : 0;
    return dir === "asc" ? cmp : -cmp;
  });
}

/* ------------------------------------------------------------------ */
/*  Week filter helper                                                */
/* ------------------------------------------------------------------ */

function getActivityWeek(dateStr: string): number | null {
  const start = new Date(PLAN_START + "T00:00:00");
  const d = new Date(dateStr + "T00:00:00");
  const diffMs = d.getTime() - start.getTime();
  if (diffMs < 0) return null;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const week = Math.ceil((diffDays + 1) / 7);
  return week > PLAN_WEEKS ? null : week;
}

/* ------------------------------------------------------------------ */
/*  Distance filter ranges                                            */
/* ------------------------------------------------------------------ */

type DistanceFilter = "all" | "lt5" | "5to10" | "10to20" | "gt20";

const DISTANCE_FILTERS: { key: DistanceFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "lt5", label: "<5km" },
  { key: "5to10", label: "5-10km" },
  { key: "10to20", label: "10-20km" },
  { key: "gt20", label: "20km+" },
];

function matchesDistanceFilter(km: number, f: DistanceFilter): boolean {
  switch (f) {
    case "all":
      return true;
    case "lt5":
      return km < 5;
    case "5to10":
      return km >= 5 && km <= 10;
    case "10to20":
      return km > 10 && km <= 20;
    case "gt20":
      return km > 20;
  }
}

/* ------------------------------------------------------------------ */
/*  Sortable header component                                         */
/* ------------------------------------------------------------------ */

function SortableHead({
  label,
  sortKey,
  currentKey,
  currentDir,
  onSort,
  className,
}: {
  label: string;
  sortKey: SortKey;
  currentKey: SortKey;
  currentDir: SortDir;
  onSort: (key: SortKey) => void;
  className?: string;
}) {
  const isActive = currentKey === sortKey;
  return (
    <TableHead
      className={`text-xs cursor-pointer select-none hover:text-[#fbbf24] transition-colors ${className ?? ""}`}
      onClick={() => onSort(sortKey)}
    >
      {label}
      {isActive && (
        <span className="ml-1">{currentDir === "asc" ? "▲" : "▼"}</span>
      )}
    </TableHead>
  );
}

/* ------------------------------------------------------------------ */
/*  Main component                                                    */
/* ------------------------------------------------------------------ */

interface ActivityLogTableProps {
  activities: Activity[];
}

export function ActivityLogTable({ activities }: ActivityLogTableProps) {
  const router = useRouter();
  const [sortKey, setSortKey] = useState<SortKey>("activity_date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [weekFilter, setWeekFilter] = useState<number | null>(null);
  const [distFilter, setDistFilter] = useState<DistanceFilter>("all");

  function handleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  const filtered = useMemo(() => {
    let list = activities;
    if (weekFilter != null) {
      list = list.filter((a) => getActivityWeek(a.activity_date) === weekFilter);
    }
    if (distFilter !== "all") {
      list = list.filter((a) => matchesDistanceFilter(a.distance_km, distFilter));
    }
    return list;
  }, [activities, weekFilter, distFilter]);

  const sorted = useMemo(
    () => sortActivities(filtered, sortKey, sortDir),
    [filtered, sortKey, sortDir]
  );

  const weekOptions = Array.from({ length: PLAN_WEEKS }, (_, i) => i + 1);

  const colSpan = 12;

  return (
    <div className="space-y-3">
      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Week dropdown */}
        <select
          value={weekFilter ?? ""}
          onChange={(e) =>
            setWeekFilter(e.target.value ? Number(e.target.value) : null)
          }
          className="rounded-md border border-[#44403c] bg-[#292524] px-3 py-1.5 text-sm text-[#e7e5e4] outline-none focus:border-[#fbbf24]"
        >
          <option value="">All Weeks</option>
          {weekOptions.map((w) => (
            <option key={w} value={w}>
              W{w}
            </option>
          ))}
        </select>

        {/* Distance range buttons */}
        <div className="flex gap-1">
          {DISTANCE_FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setDistFilter(f.key)}
              className={`rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${
                distFilter === f.key
                  ? "border-[#fbbf24] bg-[#fbbf24]/10 text-[#fbbf24]"
                  : "border-[#44403c] bg-[#292524] text-[#a8a29e] hover:text-[#e7e5e4]"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <SortableHead label="Date" sortKey="activity_date" currentKey={sortKey} currentDir={sortDir} onSort={handleSort} />
                  <TableHead className="text-xs">Name</TableHead>
                  <TableHead className="text-xs">Type</TableHead>
                  <SortableHead label="Distance" sortKey="distance_km" currentKey={sortKey} currentDir={sortDir} onSort={handleSort} className="text-right" />
                  <SortableHead label="Duration" sortKey="duration_sec" currentKey={sortKey} currentDir={sortDir} onSort={handleSort} className="text-right" />
                  <SortableHead label="Pace" sortKey="avg_pace_min_km" currentKey={sortKey} currentDir={sortDir} onSort={handleSort} className="text-right" />
                  <SortableHead label="GAP" sortKey="gap_min_km" currentKey={sortKey} currentDir={sortDir} onSort={handleSort} className="text-right" />
                  <SortableHead label="Avg HR" sortKey="avg_hr" currentKey={sortKey} currentDir={sortDir} onSort={handleSort} className="text-right" />
                  <SortableHead label="Load" sortKey="training_load" currentKey={sortKey} currentDir={sortDir} onSort={handleSort} className="text-right" />
                  <SortableHead label="Elevation" sortKey="elevation_gain_m" currentKey={sortKey} currentDir={sortDir} onSort={handleSort} className="text-right" />
                  <TableHead className="text-xs text-right">Cadence</TableHead>
                  <TableHead className="text-xs text-right">Temp</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sorted.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={colSpan}
                      className="py-12 text-center text-sm text-muted-foreground"
                    >
                      No runs found yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  sorted.map((a) => {
                    const tag = classifyRun(a);
                    return (
                      <TableRow
                        key={a.id}
                        className="cursor-pointer transition-colors hover:bg-[#44403c]/40"
                        onClick={() => router.push(`/log/${a.id}`)}
                      >
                        <TableCell className="text-sm font-medium">
                          {formatDate(a.activity_date)}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-[160px] truncate">
                          {a.name}
                        </TableCell>
                        <TableCell>
                          <span
                            className="inline-block rounded-full px-2 py-0.5 text-xs font-medium"
                            style={{ backgroundColor: tag.bg, color: tag.text }}
                          >
                            {tag.label}
                          </span>
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
                          {a.gap_min_km != null
                            ? `${formatPace(a.gap_min_km)} /km`
                            : "—"}
                        </TableCell>
                        <TableCell className="text-right text-sm tabular-nums">
                          {a.avg_hr != null ? (
                            <span style={{ color: hrZoneColor(a.avg_hr) }}>
                              {a.avg_hr}
                            </span>
                          ) : (
                            "—"
                          )}
                        </TableCell>
                        <TableCell className="text-right text-sm tabular-nums">
                          {a.training_load != null
                            ? a.training_load.toFixed(0)
                            : "—"}
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
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
