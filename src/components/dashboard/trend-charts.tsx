"use client";

import { useState } from "react";
import {
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  Area,
  AreaChart,
  Bar,
  BarChart,
  ReferenceLine,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Activity } from "@/lib/database.types";
import { PLAN_START, PLAN_WEEKS, getCurrentWeek, RACE, Z2_RANGE, LTHR } from "@/lib/config";

interface TrendChartsProps {
  activities: Activity[];
}

type Metric = "pace" | "z2pace" | "hr" | "cadence";

const METRIC_CONFIG: Record<Metric, { label: string; color: string }> = {
  pace: { label: "Avg Pace", color: "#22c55e" },
  z2pace: { label: "Z2 Pace", color: "#a3e635" },
  hr: { label: "Avg HR", color: "#ef4444" },
  cadence: { label: "Cadence", color: "#3b82f6" },
};

function formatPaceValue(v: number): string {
  const mins = Math.floor(v);
  const secs = Math.round((v - mins) * 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function getWeekNumber(dateStr: string): number {
  const start = new Date(PLAN_START);
  const d = new Date(dateStr);
  const diff = d.getTime() - start.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  return Math.min(Math.max(Math.ceil((days + 1) / 7), 1), PLAN_WEEKS);
}

const tooltipStyle = {
  background: "#1c1917",
  border: "1px solid #fbbf24",
  borderRadius: "8px",
  fontSize: "12px",
  color: "#e7e5e4",
  padding: "8px 12px",
};

export function TrendCharts({ activities }: TrendChartsProps) {
  const [active, setActive] = useState<Set<Metric>>(new Set(["pace", "z2pace", "hr", "cadence"]));

  function toggle(m: Metric) {
    setActive((prev) => {
      const next = new Set(prev);
      if (next.has(m)) {
        if (next.size > 1) next.delete(m);
      } else {
        next.add(m);
      }
      return next;
    });
  }

  const sorted = [...activities].sort((a, b) => a.activity_date.localeCompare(b.activity_date));

  const chartData = sorted
    .filter((a) => a.avg_pace_min_km != null || a.avg_hr != null || a.avg_cadence != null)
    .map((a) => {
      const isZ2 = a.avg_hr != null && a.avg_hr >= Z2_RANGE.low && a.avg_hr <= Z2_RANGE.high && a.avg_hr < LTHR;
      return {
        date: a.activity_date,
        pace: a.avg_pace_min_km ?? undefined,
        z2pace: isZ2 && a.avg_pace_min_km != null ? a.avg_pace_min_km : undefined,
        hr: a.avg_hr ?? undefined,
        cadence: a.avg_cadence != null ? Math.round(a.avg_cadence * 2) : undefined,
      };
    });

  const hasPaceAxis = active.has("pace") || active.has("z2pace");
  const hasRightAxis = active.has("hr") || active.has("cadence");

  // Weekly elevation data
  const currentWeek = getCurrentWeek();
  const weeklyElevation: { week: string; elevation: number }[] = [];
  for (let w = 1; w <= PLAN_WEEKS; w++) {
    const weekActs = activities.filter((a) => getWeekNumber(a.activity_date) === w);
    const totalElev = weekActs.reduce((s, a) => s + (a.elevation_gain_m ?? 0), 0);
    weeklyElevation.push({ week: `W${w}`, elevation: Math.round(totalElev) });
  }

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {/* Combined metrics chart */}
      <div className="lg:col-span-2">
        <Card>
          <CardHeader className="pb-1">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <CardTitle className="text-sm font-medium font-heading">Training metrics</CardTitle>
              <div className="flex items-center gap-1.5 flex-wrap">
                {(Object.entries(METRIC_CONFIG) as [Metric, (typeof METRIC_CONFIG)[Metric]][]).map(
                  ([key, cfg]) => (
                    <button
                      key={key}
                      onClick={() => toggle(key)}
                      className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium transition-all"
                      style={{
                        background: active.has(key) ? cfg.color + "20" : "transparent",
                        border: `1px solid ${active.has(key) ? cfg.color : "#44403c"}`,
                        color: active.has(key) ? cfg.color : "#78716c",
                      }}
                    >
                      <span
                        className="inline-block h-2 w-2 rounded-full"
                        style={{ background: active.has(key) ? cfg.color : "#44403c" }}
                      />
                      {cfg.label}
                    </button>
                  )
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              {chartData.length === 0 ? (
                <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                  No data yet
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ left: -10, right: 4, top: 4, bottom: 0 }}>
                    <defs>
                      {(Object.entries(METRIC_CONFIG) as [Metric, (typeof METRIC_CONFIG)[Metric]][]).map(
                        ([key, cfg]) => (
                          <linearGradient key={key} id={`grad-${key}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={cfg.color} stopOpacity={0.25} />
                            <stop offset="100%" stopColor={cfg.color} stopOpacity={0} />
                          </linearGradient>
                        )
                      )}
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#44403c" vertical={false} />
                    <XAxis
                      dataKey="date"
                      tick={{ fill: "#78716c", fontSize: 10 }}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v: string) => {
                        const d = new Date(v + "T00:00:00");
                        return d.toLocaleDateString("en-IN", { month: "short", day: "numeric" });
                      }}
                    />
                    {hasPaceAxis && (
                      <YAxis
                        yAxisId="pace"
                        orientation="left"
                        tick={{ fill: "#22c55e", fontSize: 10 }}
                        domain={["dataMin - 0.5", "dataMax + 0.5"]}
                        tickLine={false}
                        axisLine={false}
                        reversed
                        tickFormatter={(v: number) => formatPaceValue(v)}
                      />
                    )}
                    {hasRightAxis && (
                      <YAxis
                        yAxisId="right"
                        orientation="right"
                        tick={{ fill: active.has("hr") ? "#ef4444" : "#3b82f6", fontSize: 10 }}
                        tickLine={false}
                        axisLine={false}
                        domain={["dataMin - 5", "dataMax + 5"]}
                      />
                    )}
                    <Tooltip
                      contentStyle={tooltipStyle}
                      itemStyle={{ color: "#e7e5e4" }}
                      labelStyle={{ color: "#fbbf24", fontWeight: 600, marginBottom: 4 }}
                      cursor={{ stroke: "#fbbf24", strokeWidth: 1, strokeDasharray: "4 4" }}
                      formatter={(value, name) => {
                        const v = Number(value);
                        if (name === "pace") return [formatPaceValue(v) + " /km", "Avg Pace"];
                        if (name === "z2pace") return [formatPaceValue(v) + " /km", "Z2 Pace"];
                        if (name === "hr") return [v + " bpm", "Avg HR"];
                        if (name === "cadence") return [v + " spm", "Cadence"];
                        return [v, String(name)];
                      }}
                      labelFormatter={(label) => {
                        const d = new Date(String(label) + "T00:00:00");
                        return d.toLocaleDateString("en-IN", {
                          month: "short",
                          day: "numeric",
                          weekday: "short",
                        });
                      }}
                    />
                    {active.has("pace") && (
                      <Area
                        yAxisId="pace"
                        type="monotone"
                        dataKey="pace"
                        stroke="#22c55e"
                        strokeWidth={2}
                        fill="url(#grad-pace)"
                        dot={{ r: 3, fill: "#22c55e", stroke: "#292524", strokeWidth: 2 }}
                        activeDot={{ r: 5, fill: "#22c55e" }}
                        connectNulls
                      />
                    )}
                    {active.has("z2pace") && (
                      <Area
                        yAxisId="pace"
                        type="monotone"
                        dataKey="z2pace"
                        stroke="#a3e635"
                        strokeWidth={2}
                        strokeDasharray="6 3"
                        fill="url(#grad-z2pace)"
                        dot={{ r: 3, fill: "#a3e635", stroke: "#292524", strokeWidth: 2 }}
                        activeDot={{ r: 5, fill: "#a3e635" }}
                        connectNulls
                      />
                    )}
                    {active.has("hr") && (
                      <Area
                        yAxisId="right"
                        type="monotone"
                        dataKey="hr"
                        stroke="#ef4444"
                        strokeWidth={2}
                        fill="url(#grad-hr)"
                        dot={{ r: 3, fill: "#ef4444", stroke: "#292524", strokeWidth: 2 }}
                        activeDot={{ r: 5, fill: "#ef4444" }}
                        connectNulls
                      />
                    )}
                    {active.has("cadence") && (
                      <Area
                        yAxisId="right"
                        type="monotone"
                        dataKey="cadence"
                        stroke="#3b82f6"
                        strokeWidth={2}
                        fill="url(#grad-cadence)"
                        dot={{ r: 3, fill: "#3b82f6", stroke: "#292524", strokeWidth: 2 }}
                        activeDot={{ r: 5, fill: "#3b82f6" }}
                        connectNulls
                      />
                    )}
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Weekly elevation chart */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium font-heading">Weekly elevation (m)</CardTitle>
            <span className="text-xs text-muted-foreground">
              Race: {RACE.elevation_m}m D+
            </span>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyElevation} margin={{ left: -20, right: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#44403c" vertical={false} />
                <XAxis
                  dataKey="week"
                  tick={{ fill: "#a8a29e", fontSize: 10 }}
                  tickLine={false}
                  axisLine={{ stroke: "#44403c" }}
                />
                <YAxis
                  tick={{ fill: "#a8a29e", fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  contentStyle={tooltipStyle}
                  itemStyle={{ color: "#e7e5e4" }}
                  labelStyle={{ color: "#fbbf24", fontWeight: 600, marginBottom: 4 }}
                  cursor={{ fill: "rgba(251,191,36,0.08)" }}
                  formatter={(value) => [`${Number(value)} m`, "Elevation"]}
                />
                <ReferenceLine
                  x={`W${currentWeek}`}
                  stroke="#fbbf24"
                  strokeDasharray="3 3"
                  strokeWidth={1}
                  label={{
                    value: "Now",
                    position: "top",
                    fill: "#fbbf24",
                    fontSize: 10,
                  }}
                />
                <Bar
                  dataKey="elevation"
                  fill="#78716c"
                  radius={[3, 3, 0, 0]}
                  name="Elevation"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
