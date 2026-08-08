import { fetchActivities, fetchWellness } from "@/lib/intervals";
import {
  PLAN_START,
  getCurrentWeek,
  getCurrentPhase,
  getDaysToRace,
  RACE,
  WEEKLY_TARGETS_KM,
} from "@/lib/config";
import { StatCard } from "@/components/dashboard/stat-card";
import { WeeklyChart } from "@/components/dashboard/weekly-chart";
import { TrendCharts } from "@/components/dashboard/trend-charts";
import { RecentActivities } from "@/components/dashboard/recent-activities";
import { RacePredictor } from "@/components/dashboard/race-predictor";
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
  const daysToRace = getDaysToRace();
  const totalKm = activities.reduce((sum, a) => sum + a.distance_km, 0);
  const totalTime = activities.reduce((sum, a) => sum + a.duration_sec, 0);
  const totalElevation = activities.reduce(
    (sum, a) => sum + (a.elevation_gain_m ?? 0),
    0
  );
  const longestRun = activities.reduce(
    (max, a) => Math.max(max, a.distance_km),
    0
  );
  const totalPlanned = WEEKLY_TARGETS_KM.slice(0, week).reduce((s, v) => s + v, 0);
  const compliance = totalPlanned > 0 ? Math.round((totalKm / totalPlanned) * 100) : 0;

  const runsThisWeek = activities.filter((a) => {
    const planStart = new Date(PLAN_START);
    const weekStart = new Date(planStart);
    weekStart.setDate(planStart.getDate() + (week - 1) * 7);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    return a.activity_date >= weekStart.toISOString().slice(0, 10) &&
           a.activity_date <= weekEnd.toISOString().slice(0, 10);
  });
  const weekKm = runsThisWeek.reduce((s, a) => s + a.distance_km, 0);
  const weekTarget = WEEKLY_TARGETS_KM[week - 1] ?? 0;

  const avgPace = activities.length > 0
    ? activities.filter(a => a.avg_pace_min_km != null).reduce((s, a) => s + a.avg_pace_min_km!, 0) /
      activities.filter(a => a.avg_pace_min_km != null).length
    : null;

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight" style={{ color: "#fbbf24" }}>
          Akshay&apos;s Malnad Ultra Prep
        </h1>
        <p className="text-sm text-muted-foreground">
          {RACE.name} &middot; {RACE.date} &middot; {RACE.terrain} &middot; {RACE.elevation_m}m D+
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Top stats row */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard
          label="Days to Race"
          value={daysToRace}
          sub={`Week ${week} · ${phase?.name ?? ""}`}
          highlight
        />
        <StatCard
          label="Total Distance"
          value={totalKm.toFixed(1)}
          unit="km"
          sub={`${activities.length} runs`}
        />
        <StatCard
          label="Total Time"
          value={formatDuration(totalTime)}
        />
        <StatCard
          label="Elevation"
          value={Math.round(totalElevation).toLocaleString()}
          unit="m"
        />
        <StatCard
          label="Longest Run"
          value={longestRun.toFixed(1)}
          unit="km"
        />
        <StatCard
          label="Fitness / Fatigue"
          value={latestCtl != null ? latestCtl.toFixed(0) : "—"}
          unit={latestAtl != null ? `/ ${latestAtl.toFixed(0)}` : ""}
          sub={latestRhr != null ? `RHR ${latestRhr} bpm` : undefined}
        />
      </div>

      {/* This week + compliance row */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          label="This Week"
          value={weekKm.toFixed(1)}
          unit={`/ ${weekTarget} km`}
          sub={`${runsThisWeek.length} runs`}
        />
        <StatCard
          label="Plan Compliance"
          value={`${compliance}%`}
          sub={`${totalKm.toFixed(0)} / ${totalPlanned} km planned`}
        />
        <StatCard
          label="Avg Pace"
          value={avgPace != null ? `${Math.floor(avgPace)}:${Math.round((avgPace % 1) * 60).toString().padStart(2, "0")}` : "—"}
          unit="/km"
        />
        <StatCard
          label="Avg Cadence"
          value={
            activities.filter(a => a.avg_cadence != null).length > 0
              ? Math.round(
                  activities.filter(a => a.avg_cadence != null)
                    .reduce((s, a) => s + a.avg_cadence! * 2, 0) /
                  activities.filter(a => a.avg_cadence != null).length
                )
              : "—"
          }
          unit="spm"
        />
      </div>

      {/* Weekly volume + race predictor */}
      <div className="mb-6 grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <WeeklyChart activities={activities} />
        </div>
        <RacePredictor activities={activities} />
      </div>

      {/* Trend charts */}
      <div className="mb-6">
        <TrendCharts activities={activities} />
      </div>

      {/* Recent activities */}
      <RecentActivities activities={activities} />
    </div>
  );
}
