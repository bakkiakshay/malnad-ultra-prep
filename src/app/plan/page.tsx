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

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <div className="mb-6">
        <h1 className="text-xl font-bold tracking-tight font-heading" style={{ color: "#fbbf24" }}>
          Training Plan
        </h1>
        <p className="text-sm text-muted-foreground">
          17 weeks &middot; {PLAN_START} to {RACE.date} &middot; {totalPlanned} km total planned
        </p>
      </div>

      {/* Summary bar */}
      <div className="mb-6 grid grid-cols-3 gap-3">
        <div className="rounded-lg p-3 text-center" style={{ background: "#292524", border: "1px solid #44403c" }}>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground font-heading">Completed</p>
          <p className="text-xl font-bold tabular-nums">{totalActual.toFixed(0)} <span className="text-xs font-normal text-muted-foreground">km</span></p>
        </div>
        <div className="rounded-lg p-3 text-center" style={{ background: "#292524", border: "1px solid #44403c" }}>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground font-heading">Planned</p>
          <p className="text-xl font-bold tabular-nums">{totalPlanned} <span className="text-xs font-normal text-muted-foreground">km</span></p>
        </div>
        <div className="rounded-lg p-3 text-center" style={{ background: "#292524", border: "1px solid #44403c" }}>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground font-heading">Remaining</p>
          <p className="text-xl font-bold tabular-nums">{Math.max(0, totalPlanned - totalActual).toFixed(0)} <span className="text-xs font-normal text-muted-foreground">km</span></p>
        </div>
      </div>

      <PlanWeeks weeklyData={weeklyData} currentWeek={currentWeek} />
    </div>
  );
}
