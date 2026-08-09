"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Activity } from "@/lib/database.types";

const ZONE_LABELS = ["Z1", "Z2", "Z3", "Z4", "Z5a", "Z5b", "Z5c"];
const ZONE_COLORS = [
  "#3b82f6",
  "#22c55e",
  "#eab308",
  "#f97316",
  "#ef4444",
  "#dc2626",
  "#b91c1c",
];

interface HrZoneChartProps {
  activities: Activity[];
}

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export function HrZoneChart({ activities }: HrZoneChartProps) {
  const totals = [0, 0, 0, 0, 0, 0, 0];
  for (const a of activities) {
    if (a.hr_zone_times && a.hr_zone_times.length >= 7) {
      for (let i = 0; i < 7; i++) {
        totals[i] += a.hr_zone_times[i];
      }
    }
  }

  const totalSeconds = totals.reduce((s, v) => s + v, 0);
  const aerobicPct =
    totalSeconds > 0 ? ((totals[0] + totals[1]) / totalSeconds) * 100 : 0;

  const zones = ZONE_LABELS.map((label, i) => ({
    label,
    seconds: totals[i],
    pct: totalSeconds > 0 ? (totals[i] / totalSeconds) * 100 : 0,
    color: ZONE_COLORS[i],
  })).filter((z) => z.seconds > 0);

  const maxPct = Math.max(...zones.map((z) => z.pct), 1);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium font-heading">
          HR zone distribution
        </CardTitle>
      </CardHeader>
      <CardContent>
        {totalSeconds === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">
            No HR zone data available yet.
          </p>
        ) : (
          <>
            <div className="space-y-2.5">
              {zones.map((z) => (
                <div key={z.label} className="flex items-center gap-2">
                  <span
                    className="text-[11px] font-medium tabular-nums w-6 text-right"
                    style={{ color: z.color }}
                  >
                    {z.label}
                  </span>
                  <div className="flex-1 h-4 rounded-sm overflow-hidden" style={{ background: "#44403c" }}>
                    <div
                      className="h-full rounded-sm transition-all"
                      style={{
                        width: `${(z.pct / maxPct) * 100}%`,
                        background: z.color,
                        minWidth: z.pct > 0 ? 4 : 0,
                      }}
                    />
                  </div>
                  <span className="text-[11px] tabular-nums text-muted-foreground w-16 text-right">
                    {z.pct.toFixed(0)}% · {formatTime(z.seconds)}
                  </span>
                </div>
              ))}
            </div>

            {/* Stacked bar summary */}
            <div className="mt-4 h-3 rounded-full overflow-hidden flex" style={{ background: "#44403c" }}>
              {zones.map((z) => (
                <div
                  key={z.label}
                  style={{
                    width: `${z.pct}%`,
                    background: z.color,
                    minWidth: z.pct > 0 ? 2 : 0,
                  }}
                />
              ))}
            </div>

            {/* Aerobic summary */}
            <div className="mt-3 pt-3 border-t" style={{ borderColor: "#44403c" }}>
              <div className="flex items-center justify-center gap-2">
                <span
                  className="inline-block h-2 w-2 rounded-full"
                  style={{ background: aerobicPct >= 80 ? "#22c55e" : "#ef4444" }}
                />
                <span className="text-xs tabular-nums" style={{ color: "#e7e5e4" }}>
                  <span className="font-semibold">{aerobicPct.toFixed(0)}%</span>{" "}
                  aerobic (Z1-Z2)
                </span>
                <span
                  className="text-[10px]"
                  style={{ color: aerobicPct >= 80 ? "#22c55e" : "#ef4444" }}
                >
                  {aerobicPct >= 80 ? "On target" : "Below 80% target"}
                </span>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
