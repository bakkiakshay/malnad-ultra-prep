"use client";

import {
  Bar,
  BarChart,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  Legend,
  ReferenceLine,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Activity } from "@/lib/database.types";
import { PLAN_START, PLAN_WEEKS, WEEKLY_TARGETS_KM, getCurrentWeek } from "@/lib/config";

interface WeeklyChartProps {
  activities: Activity[];
}

function getWeekNumber(dateStr: string): number {
  const start = new Date(PLAN_START);
  const d = new Date(dateStr);
  const diff = d.getTime() - start.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  return Math.min(Math.max(Math.ceil((days + 1) / 7), 1), PLAN_WEEKS);
}

export function WeeklyChart({ activities }: WeeklyChartProps) {
  const currentWeek = getCurrentWeek();
  const weeklyData: { week: string; actual: number; planned: number }[] = [];

  for (let w = 1; w <= PLAN_WEEKS; w++) {
    const weekActivities = activities.filter(
      (a) => getWeekNumber(a.activity_date) === w
    );
    const totalKm = weekActivities.reduce((sum, a) => sum + a.distance_km, 0);
    weeklyData.push({
      week: `W${w}`,
      actual: +totalKm.toFixed(1),
      planned: WEEKLY_TARGETS_KM[w - 1] ?? 0,
    });
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">
            Weekly volume (km)
          </CardTitle>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: "#fbbf24" }} />
              Actual
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-2.5 rounded-sm border border-dashed" style={{ borderColor: "#78716c" }} />
              Planned
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={weeklyData} margin={{ left: -20, right: 4 }} barGap={1}>
              <CartesianGrid strokeDasharray="3 3" stroke="#44403c" vertical={false} />
              <XAxis
                dataKey="week"
                tick={{ fill: "#a8a29e", fontSize: 11 }}
                tickLine={false}
                axisLine={{ stroke: "#44403c" }}
              />
              <YAxis
                tick={{ fill: "#a8a29e", fontSize: 11 }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                contentStyle={{
                  background: "#292524",
                  border: "1px solid #44403c",
                  borderRadius: "6px",
                  fontSize: "13px",
                  color: "#e7e5e4",
                }}
                cursor={{ fill: "rgba(251,191,36,0.05)" }}
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
                dataKey="planned"
                fill="rgba(120,113,108,0.25)"
                stroke="#78716c"
                strokeDasharray="4 2"
                radius={[3, 3, 0, 0]}
                name="Planned"
              />
              <Bar
                dataKey="actual"
                fill="#fbbf24"
                radius={[3, 3, 0, 0]}
                name="Actual"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
