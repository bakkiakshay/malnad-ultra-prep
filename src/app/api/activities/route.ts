import { fetchActivities } from "@/lib/intervals";
import { PLAN_START } from "@/lib/config";
import type { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const oldest = searchParams.get("oldest") ?? PLAN_START;
  const newest =
    searchParams.get("newest") ?? new Date().toISOString().slice(0, 10);

  try {
    const activities = await fetchActivities(oldest, newest);

    const mapped = activities.map((a) => ({
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
      hrr: a.icu_hrr ?? null,
      calories: a.calories ?? null,
      training_load: a.icu_training_load ?? null,
      hr_zone_times: a.icu_hr_zone_times ?? null,
      compliance: a.compliance ?? null,
    }));

    return Response.json(mapped);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return Response.json({ error: message }, { status: 502 });
  }
}
