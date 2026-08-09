import { fetchActivities, fetchWellness } from "@/lib/intervals";
import {
  PLAN_START,
  PLAN_WEEKS,
  getCurrentWeek,
  getCurrentPhase,
  RACE,
  WEEKLY_TARGETS_KM,
} from "@/lib/config";
import { StatCard } from "@/components/dashboard/stat-card";
import { WeeklyChart } from "@/components/dashboard/weekly-chart";
import { TrendCharts } from "@/components/dashboard/trend-charts";
import { RecentActivities } from "@/components/dashboard/recent-activities";
import { RacePredictor } from "@/components/dashboard/race-predictor";
import { RouteMap } from "@/components/dashboard/route-map";
import { formatDuration } from "@/lib/format";
import type { Activity } from "@/lib/database.types";

function mapToActivity(
  a: Awaited<ReturnType<typeof fetchActivities>>[number]
): Activity {
  return {
    id: String(a.id),
    activity_date: a.start_date_local?.slice(0, 10) ?? "",
    name: a.name ?? "",
    distance_km: a.distance ? +(a.distance / 1000).toFixed(2) : 0,
    duration_sec: a.moving_time ?? a.elapsed_time ?? 0,
    avg_pace_min_km:
      a.average_speed && a.average_speed > 0
        ? +(1000 / a.average_speed / 60).toFixed(2)
        : null,
    avg_hr: a.average_heartrate ?? null,
    max_hr: a.max_heartrate ?? null,
    avg_cadence: a.average_cadence ?? null,
    avg_stride_m: a.average_stride ?? null,
    avg_gct_ms: a.average_stance_time ?? null,
    avg_vert_osc_cm: a.average_vertical_oscillation ?? null,
    elevation_gain_m: a.total_elevation_gain ?? null,
    avg_temp_c: a.average_temp ?? null,
    gap_min_km:
      a.gap && a.gap > 0 ? +(1000 / a.gap / 60).toFixed(2) : null,
    polarization: a.polarization_index ?? null,
    hrr:
      a.icu_hrr != null
        ? typeof a.icu_hrr === "object"
          ? (a.icu_hrr as unknown as { hrr?: number }).hrr ?? null
          : a.icu_hrr
        : null,
    calories: a.calories ?? null,
    training_load: a.icu_training_load ?? null,
    hr_zone_times: a.icu_hr_zone_times ?? null,
    compliance: a.compliance ?? null,
    synced_at: new Date().toISOString(),
    raw_json: null,
  };
}

export const revalidate = 3600;

export default async function DashboardPage() {
  const today = new Date().toISOString().slice(0, 10);
  let activities: Activity[] = [];
  let latestCtl: number | null = null;
  let latestAtl: number | null = null;
  let latestRhr: number | null = null;
  let error: string | null = null;

  try {
    const [rawActivities, rawWellness] = await Promise.all([
      fetchActivities(PLAN_START, today),
      fetchWellness(PLAN_START, today),
    ]);

    activities = rawActivities.map(mapToActivity);

    const sortedWellness = rawWellness
      .filter((w) => w.ctl != null || w.atl != null)
      .sort((a, b) => b.id.localeCompare(a.id));

    if (sortedWellness.length > 0) {
      latestCtl = sortedWellness[0].ctl;
      latestAtl = sortedWellness[0].atl;
    }

    const rhrEntries = rawWellness
      .filter((w) => w.restingHR != null)
      .sort((a, b) => b.id.localeCompare(a.id));
    if (rhrEntries.length > 0) {
      latestRhr = rhrEntries[0].restingHR;
    }
  } catch (e) {
    error = e instanceof Error ? e.message : "Failed to fetch data";
  }

  const week = getCurrentWeek();
  const phase = getCurrentPhase();

  const totalKm = activities.reduce((sum, a) => sum + a.distance_km, 0);
  const totalTime = activities.reduce((sum, a) => sum + a.duration_sec, 0);
  const longestRun = activities.reduce(
    (max, a) => Math.max(max, a.distance_km),
    0
  );
  const totalPlanned = WEEKLY_TARGETS_KM.slice(0, week).reduce((s, v) => s + v, 0);
  const compliance = totalPlanned > 0 ? Math.round((totalKm / totalPlanned) * 100) : 0;

  const tsb = latestCtl != null && latestAtl != null ? Math.round(latestCtl - latestAtl) : null;

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <div className="mb-2">
        <h1 className="text-2xl font-bold tracking-tight font-heading" style={{ color: "#fbbf24" }}>
          Akshay&apos;s Malnad Ultra Prep
        </h1>
        <p className="text-sm text-muted-foreground">
          {RACE.name} &middot; {RACE.date} &middot; {RACE.terrain} &middot; {RACE.elevation_m}m D+
        </p>
      </div>

      {/* Progress bar */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs font-semibold text-muted-foreground font-heading uppercase tracking-widest">
            Week {week} of {PLAN_WEEKS} &middot; {phase?.name}
          </span>
          <span className="text-xs tabular-nums text-muted-foreground">
            {totalKm.toFixed(0)} / {WEEKLY_TARGETS_KM.reduce((s, v) => s + v, 0)} km planned
          </span>
        </div>
        <div className="relative h-3 rounded-full overflow-hidden" style={{ background: "#44403c" }}>
          {/* Week progress (background track) */}
          <div
            className="absolute inset-y-0 left-0 rounded-full opacity-20"
            style={{
              width: `${Math.min((week / PLAN_WEEKS) * 100, 100)}%`,
              background: "#fbbf24",
            }}
          />
          {/* Mileage progress (foreground) */}
          <div
            className="absolute inset-y-0 left-0 rounded-full transition-all"
            style={{
              width: `${Math.min((totalKm / WEEKLY_TARGETS_KM.reduce((s, v) => s + v, 0)) * 100, 100)}%`,
              background: "linear-gradient(to right, #fbbf24, #f59e0b)",
            }}
          />
          {/* Week marker */}
          <div
            className="absolute top-0 bottom-0 w-0.5"
            style={{
              left: `${(week / PLAN_WEEKS) * 100}%`,
              background: "#e7e5e4",
            }}
          />
        </div>
        <div className="flex items-center justify-between mt-1">
          <span className="text-[10px] text-muted-foreground">{phase?.focus}</span>
          <span className="text-[10px] tabular-nums" style={{ color: compliance >= 90 ? "#22c55e" : compliance >= 70 ? "#fbbf24" : "#ef4444" }}>
            {compliance}% on track
          </span>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Stats row */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          label="Total Distance"
          value={totalKm.toFixed(1)}
          unit="km"
          sub={`${activities.length} runs`}
          hint="Sum of all run distances since training started. Track this against your plan total."
        />
        <StatCard
          label="Total Time"
          value={formatDuration(totalTime)}
          hint="Time on feet matters more than pace for ultra training. Build this gradually."
        />
        <StatCard
          label="Longest Run"
          value={longestRun.toFixed(1)}
          unit="km"
          hint="Your furthest single run. For 100K, aim to hit 40-50km in peak weeks."
        />
        <StatCard
          label="Fitness / Fatigue"
          value={latestCtl != null ? latestCtl.toFixed(0) : "—"}
          unit={latestAtl != null ? `/ ${latestAtl.toFixed(0)}` : ""}
          sub={tsb != null ? `Form: ${tsb > 0 ? "+" : ""}${tsb} · RHR ${latestRhr ?? "—"}` : latestRhr != null ? `RHR ${latestRhr} bpm` : undefined}
          hint="CTL (fitness) = 42-day training load average. ATL (fatigue) = 7-day average. Form = CTL − ATL. Positive form = rested, negative = fatigued. Race at +5 to +15."
        />
      </div>

      {/* Weekly volume + race predictor */}
      <div className="mb-6 grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <WeeklyChart activities={activities} />
        </div>
        <div className="space-y-4">
          <RacePredictor activities={activities} />
          <RouteMap />
        </div>
      </div>

      {/* Trend charts */}
      <div className="mb-6">
        <TrendCharts activities={activities} />
      </div>

      {/* Recent activities */}
      <div className="mb-6">
        <RecentActivities activities={activities} />
      </div>

    </div>
  );
}
