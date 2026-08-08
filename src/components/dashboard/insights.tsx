import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Activity } from "@/lib/database.types";
import { Z2_RANGE, LTHR } from "@/lib/config";

interface InsightsProps {
  activities: Activity[];
}

interface Insight {
  title: string;
  description: string;
  type: "positive" | "neutral" | "warning";
}

function pearsonR(xs: number[], ys: number[]): number | null {
  const n = xs.length;
  if (n < 3) return null;
  const mx = xs.reduce((s, v) => s + v, 0) / n;
  const my = ys.reduce((s, v) => s + v, 0) / n;
  let num = 0, dx2 = 0, dy2 = 0;
  for (let i = 0; i < n; i++) {
    const dx = xs[i] - mx;
    const dy = ys[i] - my;
    num += dx * dy;
    dx2 += dx * dx;
    dy2 += dy * dy;
  }
  const denom = Math.sqrt(dx2 * dy2);
  if (denom === 0) return null;
  return num / denom;
}

function strengthLabel(r: number): string {
  const abs = Math.abs(r);
  if (abs >= 0.7) return "strong";
  if (abs >= 0.4) return "moderate";
  return "weak";
}

export function Insights({ activities }: InsightsProps) {
  const insights: Insight[] = [];

  const withHrAndPace = activities.filter(
    (a) => a.avg_hr != null && a.avg_pace_min_km != null
  );
  if (withHrAndPace.length >= 3) {
    const r = pearsonR(
      withHrAndPace.map((a) => a.avg_hr!),
      withHrAndPace.map((a) => a.avg_pace_min_km!)
    );
    if (r != null) {
      const strength = strengthLabel(r);
      if (r < -0.2) {
        insights.push({
          title: "HR vs Pace",
          description: `${strength.charAt(0).toUpperCase() + strength.slice(1)} negative correlation (r=${r.toFixed(2)}). Higher heart rate runs tend to be faster — your effort translates to speed.`,
          type: "positive",
        });
      } else if (r > 0.2) {
        insights.push({
          title: "HR vs Pace",
          description: `${strength.charAt(0).toUpperCase() + strength.slice(1)} positive correlation (r=${r.toFixed(2)}). Higher HR runs are slower — could indicate cardiac drift on long runs or heat.`,
          type: "warning",
        });
      } else {
        insights.push({
          title: "HR vs Pace",
          description: `Weak correlation (r=${r.toFixed(2)}). Heart rate and pace move independently — typical early in a training block.`,
          type: "neutral",
        });
      }
    }
  }

  const withCadenceAndPace = activities.filter(
    (a) => a.avg_cadence != null && a.avg_pace_min_km != null
  );
  if (withCadenceAndPace.length >= 3) {
    const r = pearsonR(
      withCadenceAndPace.map((a) => a.avg_cadence! * 2),
      withCadenceAndPace.map((a) => a.avg_pace_min_km!)
    );
    if (r != null) {
      const strength = strengthLabel(r);
      if (r < -0.2) {
        insights.push({
          title: "Cadence vs Pace",
          description: `${strength.charAt(0).toUpperCase() + strength.slice(1)} negative correlation (r=${r.toFixed(2)}). Higher cadence = faster pace. Efficient stride turnover is working for you.`,
          type: "positive",
        });
      } else if (r > 0.2) {
        insights.push({
          title: "Cadence vs Pace",
          description: `${strength.charAt(0).toUpperCase() + strength.slice(1)} positive correlation (r=${r.toFixed(2)}). Higher cadence on slower runs could mean shorter stride on trails or fatigued runs.`,
          type: "neutral",
        });
      }
    }
  }

  const withDistAndHr = activities.filter(
    (a) => a.distance_km > 0 && a.avg_hr != null
  );
  if (withDistAndHr.length >= 3) {
    const r = pearsonR(
      withDistAndHr.map((a) => a.distance_km),
      withDistAndHr.map((a) => a.avg_hr!)
    );
    if (r != null && Math.abs(r) > 0.2) {
      const strength = strengthLabel(r);
      if (r > 0) {
        insights.push({
          title: "Distance vs HR",
          description: `${strength.charAt(0).toUpperCase() + strength.slice(1)} positive correlation (r=${r.toFixed(2)}). Longer runs push heart rate up — watch for cardiac drift on your long runs.`,
          type: "warning",
        });
      } else {
        insights.push({
          title: "Distance vs HR",
          description: `${strength.charAt(0).toUpperCase() + strength.slice(1)} negative correlation (r=${r.toFixed(2)}). You keep HR lower on longer runs — great aerobic discipline.`,
          type: "positive",
        });
      }
    }
  }

  const z2Runs = activities.filter(
    (a) =>
      a.avg_hr != null &&
      a.avg_hr >= Z2_RANGE.low &&
      a.avg_hr <= Z2_RANGE.high &&
      a.avg_pace_min_km != null
  );
  const totalRuns = activities.filter((a) => a.avg_hr != null).length;
  if (totalRuns >= 3) {
    const z2Pct = Math.round((z2Runs.length / totalRuns) * 100);
    if (z2Pct >= 70) {
      insights.push({
        title: "Z2 Distribution",
        description: `${z2Pct}% of runs are in Zone 2 (${Z2_RANGE.low}–${Z2_RANGE.high} bpm). Excellent aerobic base building — the 80/20 rule is working.`,
        type: "positive",
      });
    } else if (z2Pct >= 50) {
      insights.push({
        title: "Z2 Distribution",
        description: `${z2Pct}% of runs are in Zone 2. Aim for 70-80% easy runs to build aerobic capacity for 100K.`,
        type: "neutral",
      });
    } else {
      insights.push({
        title: "Z2 Distribution",
        description: `Only ${z2Pct}% of runs are in Zone 2. Too much intensity too early can limit your aerobic ceiling. Slow down most runs.`,
        type: "warning",
      });
    }
  }

  const withElevAndPace = activities.filter(
    (a) => a.elevation_gain_m != null && a.elevation_gain_m > 0 && a.avg_pace_min_km != null
  );
  if (withElevAndPace.length >= 3) {
    const r = pearsonR(
      withElevAndPace.map((a) => a.elevation_gain_m!),
      withElevAndPace.map((a) => a.avg_pace_min_km!)
    );
    if (r != null && r > 0.3) {
      insights.push({
        title: "Elevation vs Pace",
        description: `Positive correlation (r=${r.toFixed(2)}). Hillier runs are slower, as expected — your GAP (grade-adjusted pace) is what matters on the Ghats.`,
        type: "neutral",
      });
    }
  }

  if (insights.length === 0) {
    insights.push({
      title: "Building Data",
      description: "More runs will unlock correlation insights. Keep logging — patterns emerge after 5+ activities.",
      type: "neutral",
    });
  }

  const typeColors = {
    positive: { border: "#22c55e", bg: "rgba(34,197,94,0.08)", dot: "#22c55e" },
    neutral: { border: "#fbbf24", bg: "rgba(251,191,36,0.08)", dot: "#fbbf24" },
    warning: { border: "#ef4444", bg: "rgba(239,68,68,0.08)", dot: "#ef4444" },
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium font-heading">
          Correlation Insights
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          How your metrics relate to each other, based on {activities.length} activities
        </p>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 sm:grid-cols-2">
          {insights.map((insight, i) => {
            const colors = typeColors[insight.type];
            return (
              <div
                key={i}
                className="rounded-lg p-3"
                style={{
                  background: colors.bg,
                  borderLeft: `3px solid ${colors.border}`,
                }}
              >
                <div className="mb-1 flex items-center gap-2">
                  <span
                    className="inline-block h-2 w-2 rounded-full"
                    style={{ background: colors.dot }}
                  />
                  <span className="text-xs font-semibold font-heading" style={{ color: colors.border }}>
                    {insight.title}
                  </span>
                </div>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  {insight.description}
                </p>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
