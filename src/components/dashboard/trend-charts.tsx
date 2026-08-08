"use client";

import {
  Line,
  LineChart,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Activity } from "@/lib/database.types";
import { Z2_RANGE, LTHR } from "@/lib/config";

interface TrendChartsProps {
  activities: Activity[];
}

function MiniTrend({
  title,
  data,
  dataKey,
  color,
  unit,
}: {
  title: string;
  data: { date: string; value: number }[];
  dataKey: string;
  color: string;
  unit?: string;
}) {
  if (data.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">No data yet</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-32">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ left: -20, right: 4 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis
                dataKey="date"
                tick={{ fill: "var(--color-muted-foreground)", fontSize: 10 }}
                tickFormatter={(v: string) => {
                  const d = new Date(v + "T00:00:00");
                  return d.toLocaleDateString("en-IN", {
                    month: "short",
                    day: "numeric",
                  });
                }}
              />
              <YAxis
                tick={{ fill: "var(--color-muted-foreground)", fontSize: 10 }}
                domain={["dataMin - 1", "dataMax + 1"]}
              />
              <Tooltip
                contentStyle={{
                  background: "var(--color-card)",
                  border: "1px solid var(--color-border)",
                  borderRadius: "6px",
                  fontSize: "12px",
                }}
                formatter={(value) => [
                  `${Number(value).toFixed(1)}${unit ?? ""}`,
                  title,
                ]}
                labelFormatter={(label) => {
                  const d = new Date(String(label) + "T00:00:00");
                  return d.toLocaleDateString("en-IN", {
                    month: "short",
                    day: "numeric",
                    weekday: "short",
                  });
                }}
              />
              <Line
                type="monotone"
                dataKey={dataKey}
                stroke={color}
                strokeWidth={2}
                dot={{ r: 3, fill: color }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

export function TrendCharts({ activities }: TrendChartsProps) {
  const z2Runs = activities
    .filter((a) => a.avg_hr != null && a.avg_hr < LTHR && a.avg_pace_min_km != null)
    .filter((a) => a.avg_hr! >= Z2_RANGE.low && a.avg_hr! <= Z2_RANGE.high)
    .map((a) => ({
      date: a.activity_date,
      value: a.avg_pace_min_km!,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const cadenceData = activities
    .filter((a) => a.avg_cadence != null && a.avg_cadence > 0)
    .map((a) => ({
      date: a.activity_date,
      value: Math.round(a.avg_cadence! * 2),
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const hrData = activities
    .filter((a) => a.avg_hr != null)
    .map((a) => ({
      date: a.activity_date,
      value: a.avg_hr!,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <MiniTrend
        title="Z2 Pace Trend"
        data={z2Runs}
        dataKey="value"
        color="#2D5F3E"
        unit=" min/km"
      />
      <MiniTrend
        title="Avg HR per Run"
        data={hrData}
        dataKey="value"
        color="#C4564A"
        unit=" bpm"
      />
      <MiniTrend
        title="Cadence Trend"
        data={cadenceData}
        dataKey="value"
        color="#5A7D9A"
        unit=" spm"
      />
    </div>
  );
}
