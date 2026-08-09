"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  CartesianGrid,
} from "recharts";
import { TRAINING_PHASES } from "@/lib/config";

interface ArcDataPoint {
  week: number;
  planned: number;
  actual: number | null;
  phase: string;
}

interface TrainingArcProps {
  weeklyData: {
    week: number;
    distance: number;
    target: number;
  }[];
  currentWeek: number;
}

function getPhaseForWeek(week: number): string {
  const phase = TRAINING_PHASES.find(
    (p) => week >= p.weeks[0] && week <= p.weeks[1]
  );
  return phase?.name ?? "";
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { value: number; dataKey: string; color: string }[];
  label?: number;
}) {
  if (!active || !payload || !label) return null;
  const phase = getPhaseForWeek(label);
  return (
    <div
      style={{
        background: "#1c1917",
        border: "1px solid #fbbf24",
        borderRadius: "8px",
        fontSize: "12px",
        color: "#e7e5e4",
        padding: "8px 12px",
      }}
    >
      <p className="font-heading font-semibold" style={{ color: "#fbbf24" }}>
        Week {label}
      </p>
      <p className="text-[10px]" style={{ color: "#a8a29e" }}>
        {phase}
      </p>
      {payload.map((entry) => (
        <p key={entry.dataKey} className="tabular-nums">
          <span
            style={{
              display: "inline-block",
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: entry.color,
              marginRight: 6,
            }}
          />
          {entry.dataKey === "planned" ? "Plan" : "Actual"}:{" "}
          {entry.value != null ? `${entry.value} km` : "—"}
        </p>
      ))}
    </div>
  );
}

export function TrainingArc({ weeklyData, currentWeek }: TrainingArcProps) {
  const chartData: ArcDataPoint[] = weeklyData.map((w) => ({
    week: w.week,
    planned: w.target,
    actual: w.week <= currentWeek ? w.distance : null,
    phase: getPhaseForWeek(w.week),
  }));

  // Build phase background bands
  const phaseBands = TRAINING_PHASES.map((p) => ({
    name: p.name,
    x1: p.weeks[0] - 0.5,
    x2: p.weeks[1] + 0.5,
  }));

  return (
    <div
      className="rounded-lg p-4"
      style={{ background: "#292524", border: "1px solid #44403c" }}
    >
      <h2
        className="mb-1 text-sm font-semibold uppercase tracking-wider font-heading"
        style={{ color: "#fbbf24" }}
      >
        Training Arc
      </h2>
      <p className="mb-3 text-[11px] text-muted-foreground">
        Planned volume curve with actual progress overlay
      </p>
      <ResponsiveContainer width="100%" height={220}>
        <AreaChart
          data={chartData}
          margin={{ top: 8, right: 8, left: -16, bottom: 28 }}
        >
          <defs>
            <linearGradient id="gradPlanned" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#fbbf24" stopOpacity={0.25} />
              <stop offset="100%" stopColor="#fbbf24" stopOpacity={0.02} />
            </linearGradient>
            <linearGradient id="gradActual" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#22c55e" stopOpacity={0.35} />
              <stop offset="100%" stopColor="#22c55e" stopOpacity={0.05} />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="#44403c"
            strokeOpacity={0.4}
            vertical={false}
          />
          {/* Phase background bands as reference areas */}
          {phaseBands.map((band, i) => (
            <ReferenceLine
              key={`phase-label-${band.name}`}
              x={(band.x1 + band.x2) / 2}
              stroke="none"
              label={{
                value: band.name,
                position: "bottom",
                fill: "#a8a29e",
                fontSize: 9,
                dy: 16 + (i % 2) * 10,
              }}
            />
          ))}
          <XAxis
            dataKey="week"
            tick={{ fill: "#a8a29e", fontSize: 10 }}
            tickLine={false}
            axisLine={{ stroke: "#44403c" }}
            label={{
              value: "Week",
              position: "insideBottomRight",
              offset: -4,
              fill: "#a8a29e",
              fontSize: 10,
            }}
          />
          <YAxis
            tick={{ fill: "#a8a29e", fontSize: 10 }}
            tickLine={false}
            axisLine={false}
            unit=" km"
          />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="planned"
            stroke="#fbbf24"
            strokeWidth={2}
            fill="url(#gradPlanned)"
            dot={false}
            activeDot={{ r: 4, fill: "#fbbf24" }}
          />
          <Area
            type="monotone"
            dataKey="actual"
            stroke="#22c55e"
            strokeWidth={2}
            fill="url(#gradActual)"
            dot={false}
            activeDot={{ r: 4, fill: "#22c55e" }}
            connectNulls={false}
          />
          <ReferenceLine
            x={currentWeek}
            stroke="#fbbf24"
            strokeDasharray="4 4"
            strokeWidth={1.5}
            label={{
              value: `W${currentWeek}`,
              position: "top",
              fill: "#fbbf24",
              fontSize: 10,
              fontWeight: 600,
            }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
