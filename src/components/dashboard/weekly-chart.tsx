"use client";

import {
  Bar,
  BarChart,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Activity } from "@/lib/database.types";
import { PLAN_START, PLAN_WEEKS } from "@/lib/config";

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
  const weeklyData: { week: string; distance: number }[] = [];

  for (let w = 1; w <= PLAN_WEEKS; w++) {
    const weekActivities = activities.filter(
      (a) => getWeekNumber(a.activity_date) === w
    );
    const totalKm = weekActivities.reduce((sum, a) => sum + a.distance_km, 0);
    weeklyData.push({
      week: `W${w}`,
      distance: +totalKm.toFixed(1),
    });
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">
          Weekly Volume (km)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={weeklyData} margin={{ left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis
                dataKey="week"
                className="text-xs"
                tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }}
              />
              <YAxis
                className="text-xs"
                tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }}
              />
              <Tooltip
                contentStyle={{
                  background: "var(--color-card)",
                  border: "1px solid var(--color-border)",
                  borderRadius: "6px",
                  fontSize: "13px",
                }}
              />
              <Bar
                dataKey="distance"
                fill="var(--color-primary)"
                radius={[3, 3, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
