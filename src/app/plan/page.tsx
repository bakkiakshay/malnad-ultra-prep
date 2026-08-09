import { fetchActivities } from "@/lib/intervals";
import {
  PLAN_START,
  PLAN_WEEKS,
  TRAINING_PHASES,
  WEEKLY_TARGETS_KM,
  getCurrentWeek,
  RACE,
} from "@/lib/config";
import { PlanWeeks } from "@/components/plan/plan-weeks";
import { TrainingArc } from "@/components/plan/training-arc";

export const revalidate = 3600;

function getWeekDates(weekNum: number): { start: string; end: string } {
  const planStart = new Date(PLAN_START);
  const weekStart = new Date(planStart);
  weekStart.setDate(planStart.getDate() + (weekNum - 1) * 7);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  return {
    start: weekStart.toISOString().slice(0, 10),
    end: weekEnd.toISOString().slice(0, 10),
  };
}

interface WeekRun {
  id: string;
  date: string;
  name: string;
  distance_km: number;
  duration_sec: number;
  avg_pace: number | null;
  avg_hr: number | null;
}

interface WeekData {
  week: number;
  distance: number;
  runs: WeekRun[];
  start: string;
  end: string;
  target: number;
}

export default async function PlanPage() {
  const today = new Date().toISOString().slice(0, 10);
  const currentWeek = getCurrentWeek();

  let weeklyData: WeekData[] = [];

  try {
    const raw = await fetchActivities(PLAN_START, today);
    const activities = raw.map((a) => ({
      id: a.id,
      date: a.start_date_local?.slice(0, 10) ?? "",
      name: a.name ?? "Run",
      distance_km: a.distance ? a.distance / 1000 : 0,
      duration_sec: a.moving_time ?? a.elapsed_time ?? 0,
      avg_pace: a.average_speed && a.average_speed > 0
        ? +(1000 / a.average_speed / 60).toFixed(2)
        : null,
      avg_hr: a.average_heartrate ?? null,
    }));

    for (let w = 1; w <= PLAN_WEEKS; w++) {
      const { start, end } = getWeekDates(w);
      const weekRuns = activities
        .filter((a) => a.date >= start && a.date <= end)
        .sort((a, b) => a.date.localeCompare(b.date));
      weeklyData.push({
        week: w,
        distance: +weekRuns.reduce((sum, a) => sum + a.distance_km, 0).toFixed(1),
        runs: weekRuns,
        start,
        end,
        target: WEEKLY_TARGETS_KM[w - 1] ?? 0,
      });
    }
  } catch {
    for (let w = 1; w <= PLAN_WEEKS; w++) {
      const { start, end } = getWeekDates(w);
      weeklyData.push({
        week: w,
        distance: 0,
        runs: [],
        start,
        end,
        target: WEEKLY_TARGETS_KM[w - 1] ?? 0,
      });
    }
  }

  const totalPlanned = WEEKLY_TARGETS_KM.reduce((s, v) => s + v, 0);
  const totalActual = weeklyData.reduce((s, w) => s + w.distance, 0);
  const remaining = Math.max(0, totalPlanned - totalActual);
  const compliancePct = totalPlanned > 0 ? Math.min((totalActual / totalPlanned) * 100, 100) : 0;

  // Calculate planned-so-far (only weeks up to current)
  const plannedSoFar = weeklyData
    .filter((w) => w.week <= currentWeek)
    .reduce((s, w) => s + w.target, 0);
  const actualPct = plannedSoFar > 0 ? Math.min((totalActual / plannedSoFar) * 100, 100) : 0;

  // Streak: consecutive weeks (backwards from current) where actual >= 90% target
  let streak = 0;
  for (let i = currentWeek - 1; i >= 0; i--) {
    const w = weeklyData[i];
    if (!w || w.target === 0) break;
    if (w.distance / w.target >= 0.9) {
      streak++;
    } else {
      break;
    }
  }

  // SVG progress ring params
  const ringSize = 80;
  const ringStroke = 6;
  const ringRadius = (ringSize - ringStroke) / 2;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const ringOffset = ringCircumference - (actualPct / 100) * ringCircumference;

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <div className="mb-6">
        <h1 className="text-xl font-bold tracking-tight font-heading" style={{ color: "#fbbf24" }}>
          Training Plan
        </h1>
        <p className="text-sm text-muted-foreground">
          17 weeks &middot; {PLAN_START} to {RACE.date} &middot; {totalPlanned} km total planned
        </p>
      </div>

      {/* Training Arc Chart */}
      <div className="mb-6">
        <TrainingArc weeklyData={weeklyData} currentWeek={currentWeek} />
      </div>

      {/* Richer Summary Bar */}
      <div
        className="mb-6 flex flex-col sm:flex-row items-center gap-4 rounded-lg p-4"
        style={{ background: "#292524", border: "1px solid #44403c" }}
      >
        {/* Progress Ring */}
        <div className="flex-shrink-0 flex flex-col items-center">
          <svg width={ringSize} height={ringSize} className="-rotate-90">
            <circle
              cx={ringSize / 2}
              cy={ringSize / 2}
              r={ringRadius}
              fill="none"
              stroke="#44403c"
              strokeWidth={ringStroke}
            />
            <circle
              cx={ringSize / 2}
              cy={ringSize / 2}
              r={ringRadius}
              fill="none"
              stroke={actualPct >= 90 ? "#22c55e" : actualPct >= 70 ? "#fbbf24" : "#ef4444"}
              strokeWidth={ringStroke}
              strokeDasharray={ringCircumference}
              strokeDashoffset={ringOffset}
              strokeLinecap="round"
            />
          </svg>
          <span className="mt-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground font-heading">
            Compliance
          </span>
        </div>

        {/* Stats */}
        <div className="flex flex-1 justify-around gap-4 text-center">
          <div>
            <p className="text-2xl font-bold tabular-nums">
              {totalActual.toFixed(0)}
            </p>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground font-heading">
              km done
            </p>
          </div>
          <div
            className="hidden sm:block"
            style={{ width: 1, background: "#44403c" }}
          />
          <div>
            <p className="text-2xl font-bold tabular-nums">
              {remaining.toFixed(0)}
            </p>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground font-heading">
              km left
            </p>
          </div>
          <div
            className="hidden sm:block"
            style={{ width: 1, background: "#44403c" }}
          />
          <div>
            <p className="text-2xl font-bold tabular-nums" style={{ color: streak > 0 ? "#22c55e" : "#a8a29e" }}>
              {streak}
            </p>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground font-heading">
              week streak
            </p>
          </div>
          <div
            className="hidden sm:block"
            style={{ width: 1, background: "#44403c" }}
          />
          <div>
            <p className="text-2xl font-bold tabular-nums" style={{ color: "#fbbf24" }}>
              {Math.round(actualPct)}%
            </p>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground font-heading">
              on track
            </p>
          </div>
        </div>
      </div>

      <PlanWeeks weeklyData={weeklyData} currentWeek={currentWeek} />
    </div>
  );
}
