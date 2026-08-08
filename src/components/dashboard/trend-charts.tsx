"use client";

import {
  Line,
  LineChart,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  CartesianGrid,
  Area,
  AreaChart,
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
  fill,
}: {
  title: string;
  data: { date: string; value: number }[];
  dataKey: string;
  color: string;
  unit?: string;
  fill?: string;
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

  const latest = data[data.length - 1]?.value;

  return (
    <Card>
      <CardHeader className="pb-1">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
          <span className="text-lg font-bold tabular-nums" style={{ color }}>
            {typeof latest === "number" ? latest.toFixed(1) : "—"}
            <span className="ml-0.5 text-xs font-normal text-muted-foreground">{unit}</span>
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-28">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ left: -20, right: 4, top: 4, bottom: 0 }}>
              <defs>
                <linearGradient id={`grad-${dataKey}-${color.replace("#","")}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={color} stopOpacity={0.3} />
                  <stop offset="100%" stopColor={color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#44403c" vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fill: "#78716c", fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v: string) => {
                  const d = new Date(v + "T00:00:00");
                  return d.toLocaleDateString("en-IN", {
                    month: "short",
                    day: "numeric",
                  });
                }}
              />
              <YAxis
                tick={{ fill: "#78716c", fontSize: 10 }}
                domain={["dataMin - 1", "dataMax + 1"]}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                contentStyle={{
                  background: "#292524",
                  border: "1px solid #44403c",
                  borderRadius: "6px",
                  fontSize: "12px",
                  color: "#e7e5e4",
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
              <Area
                type="monotone"
                dataKey={dataKey}
                stroke={color}
                strokeWidth={2}
                fill={`url(#grad-${dataKey}-${color.replace("#","")})`}
                dot={{ r: 3, fill: color, stroke: "#292524", strokeWidth: 2 }}
                activeDot={{ r: 5, fill: color }}
              />
            </AreaChart>
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
        title="Z2 pace"
        data={z2Runs}
        dataKey="value"
        color="#22c55e"
        unit=" min/km"
      />
      <MiniTrend
        title="Avg HR"
        data={hrData}
        dataKey="value"
        color="#ef4444"
        unit=" bpm"
      />
      <MiniTrend
        title="Cadence"
        data={cadenceData}
        dataKey="value"
        color="#3b82f6"
        unit=" spm"
      />
    </div>
  );
}
