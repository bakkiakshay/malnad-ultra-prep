import { fetchActivities } from "@/lib/intervals";
import { PLAN_START } from "@/lib/config";
import { ActivityLogTable } from "./activity-log-table";
import type { Activity } from "@/lib/database.types";

export const revalidate = 3600;

export default async function LogPage() {
  const today = new Date().toISOString().slice(0, 10);
  let activities: Activity[] = [];
  let error: string | null = null;

  try {
    const raw = await fetchActivities(PLAN_START, today);
    activities = raw.map((a) => ({
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
    }));
  } catch (e) {
    error = e instanceof Error ? e.message : "Failed to fetch data";
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <h1 className="mb-4 text-xl font-bold tracking-tight">Activity Log</h1>
      {error && (
        <div className="mb-4 rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}
      <ActivityLogTable activities={activities} />
    </div>
  );
}
