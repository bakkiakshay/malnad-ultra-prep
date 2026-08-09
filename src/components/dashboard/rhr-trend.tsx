"use client";

import {
  AreaChart,
  Area,
  ResponsiveContainer,
  Tooltip,
  XAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface RhrDataPoint {
  date: string;
  rhr: number;
}

interface RhrTrendProps {
  data: RhrDataPoint[];
}

export function RhrTrend({ data }: RhrTrendProps) {
  const sorted = [...data].sort((a, b) => a.date.localeCompare(b.date));

  const latestRhr = sorted.length > 0 ? sorted[sorted.length - 1].rhr : null;
  const firstRhr = sorted.length > 0 ? sorted[0].rhr : null;
  const rhrDiff =
    latestRhr != null && firstRhr != null ? latestRhr - firstRhr : null;

  // Format date for tooltip
  const formatTipDate = (dateStr: string): string => {
    const d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString("en-IN", { month: "short", day: "numeric" });
  };

  return (
    <Card>
      <CardHeader className="pb-1">
        <CardTitle className="text-sm font-medium">
          Resting Heart Rate
        </CardTitle>
      </CardHeader>
      <CardContent>
        {sorted.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">
            No RHR data available.
          </p>
        ) : (
          <>
            {/* Current value */}
            <div className="flex items-baseline gap-2 mb-2">
              <span
                className="text-2xl font-bold tabular-nums"
                style={{ color: "#fbbf24" }}
              >
                {latestRhr}
              </span>
              <span className="text-sm text-muted-foreground">bpm</span>
              {rhrDiff != null && rhrDiff !== 0 && (
                <span
                  className="flex items-center text-xs font-medium tabular-nums"
                  style={{
                    color: rhrDiff < 0 ? "#22c55e" : "#ef4444",
                  }}
                >
                  {rhrDiff < 0 ? "↓" : "↑"}
                  {Math.abs(rhrDiff)} bpm
                </span>
              )}
            </div>

            {/* Sparkline */}
            <div className="h-[100px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={sorted}
                  margin={{ top: 4, right: 4, bottom: 0, left: 4 }}
                >
                  <defs>
                    <linearGradient id="rhrGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#fbbf24" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#fbbf24" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" hide />
                  <Tooltip
                    contentStyle={{
                      background: "#1c1917",
                      border: "1px solid #fbbf24",
                      borderRadius: "8px",
                      fontSize: "12px",
                      color: "#e7e5e4",
                      padding: "8px 12px",
                    }}
                    labelFormatter={(label) => formatTipDate(String(label))}
                    formatter={(value) => {
                      const v = Number(value);
                      return [`${v} bpm`, "RHR"];
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="rhr"
                    stroke="#fbbf24"
                    strokeWidth={2}
                    fill="url(#rhrGradient)"
                    dot={false}
                    activeDot={{ r: 3, fill: "#fbbf24", stroke: "#1c1917", strokeWidth: 2 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <p className="text-[10px] text-muted-foreground mt-1 text-center">
              Since training start &middot; lower is better
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
